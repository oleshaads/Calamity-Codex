#!/usr/bin/env python3
"""Optimized local static server for Calamity Codex.

Large text assets are served with deterministic gzip compression. Compressed
payloads are cached in memory by file mtime/size, ETag revalidation returns
304, and versioned release assets use an immutable browser cache.

Usage:
    python3 scripts/serve.py [port] [site-dir]
Defaults: port 8097, dir calamity-codex (relative to the repository root).
"""
import email.utils
import gzip
import http.server
import io
import os
import socketserver
import sys
import threading

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8097
DIR = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(REPO_ROOT, "calamity-codex")


class CodexHandler(http.server.SimpleHTTPRequestHandler):
    COMPRESSIBLE = {".html", ".css", ".js", ".json", ".webmanifest", ".svg", ".txt", ".xml"}
    _gzip_cache = {}
    _gzip_lock = threading.Lock()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    @classmethod
    def compressed_payload(cls, path, stat):
        key = (path, stat.st_mtime_ns, stat.st_size)
        with cls._gzip_lock:
            cached = cls._gzip_cache.get(key)
            if cached is not None:
                return cached
        with open(path, "rb") as source:
            payload = gzip.compress(source.read(), compresslevel=6, mtime=0)
        with cls._gzip_lock:
            # Drop stale versions of the same file while retaining hot assets.
            for old_key in [item for item in cls._gzip_cache if item[0] == path and item != key]:
                cls._gzip_cache.pop(old_key, None)
            cls._gzip_cache[key] = payload
        return payload

    def send_head(self):
        # Catalog and recipe indexes are large text files. Compress them once,
        # then use ETag so a reload receives a tiny 304 response.
        path = self.translate_path(self.path)
        ext = os.path.splitext(path)[1].lower()
        accepts_gzip = "gzip" in self.headers.get("Accept-Encoding", "").lower()
        if accepts_gzip and ext in self.COMPRESSIBLE and os.path.isfile(path):
            try:
                stat = os.stat(path)
                etag = f'"{stat.st_mtime_ns:x}-{stat.st_size:x}-gzip"'
                if self.headers.get("If-None-Match") == etag:
                    self.send_response(304)
                    self.send_header("ETag", etag)
                    self.send_header("Vary", "Accept-Encoding")
                    self.end_headers()
                    return None
                payload = self.compressed_payload(path, stat)
                self.send_response(200)
                self.send_header("Content-type", self.guess_type(path))
                self.send_header("Content-Encoding", "gzip")
                self.send_header("Vary", "Accept-Encoding")
                self.send_header("ETag", etag)
                self.send_header("Last-Modified", email.utils.formatdate(stat.st_mtime, usegmt=True))
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                return io.BytesIO(payload)
            except OSError:
                pass
        return super().send_head()

    def end_headers(self):
        # Versioned runtime URLs change together with the core release and are
        # therefore safe to keep for a year. HTML and unversioned images still
        # revalidate, so a new deployment cannot leave an old shell cached.
        versioned = "?v=20260817-core" in self.path or "&v=20260817-core" in self.path
        cache_control = "public, max-age=31536000, immutable" if versioned else "public, max-age=0, must-revalidate"
        self.send_header("Cache-Control", cache_control)
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    if not os.path.isdir(DIR):
        sys.exit(f"Site directory not found: {DIR}")
    with Server(("0.0.0.0", PORT), CodexHandler) as httpd:
        sys.stderr.write(f"Calamity Codex served from {DIR}\n")
        sys.stderr.write(f"Listening on http://0.0.0.0:{PORT} (gzip + ETag + immutable version cache)\n")
        httpd.serve_forever()
