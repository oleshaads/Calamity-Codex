#!/usr/bin/env python3
"""Optimized local static server for Calamity Codex.

Versioned production bundles use prebuilt Brotli sidecars when supported by the
browser. Other large text assets receive deterministic gzip compression.
Encoded payloads are cached in memory, ETag revalidation returns 304, and
versioned release assets use an immutable browser cache.

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
import re
import urllib.parse

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8097
DIR = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(REPO_ROOT, "calamity-codex")


def accepts_encoding(header, wanted):
    """Return whether an Accept-Encoding value permits a specific coding."""
    fallback = None
    for part in str(header or "").lower().split(","):
        token, *params = part.strip().split(";")
        quality = 1.0
        for param in params:
            key, _, value = param.strip().partition("=")
            if key == "q":
                try:
                    quality = float(value)
                except ValueError:
                    quality = 0.0
        if token == wanted:
            return quality > 0
        if token == "*":
            fallback = quality > 0
    return bool(fallback)


class CodexHandler(http.server.SimpleHTTPRequestHandler):
    # HTTP/1.1 keep-alive: сотни спрайтов бестиария и дерева крафта идут по
    # уже открытым соединениям вместо нового TCP-рукопожатия на каждый файл.
    protocol_version = "HTTP/1.1"
    COMPRESSIBLE = {".html", ".css", ".js", ".json", ".webmanifest", ".svg", ".txt", ".xml"}
    _gzip_cache = {}
    _brotli_cache = {}
    _encoding_lock = threading.Lock()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    @classmethod
    def gzip_payload(cls, path, stat):
        key = (path, stat.st_mtime_ns, stat.st_size)
        with cls._encoding_lock:
            cached = cls._gzip_cache.get(key)
            if cached is not None:
                return cached
        with open(path, "rb") as source:
            payload = gzip.compress(source.read(), compresslevel=9, mtime=0)
        with cls._encoding_lock:
            # Drop stale versions of the same file while retaining hot assets.
            for old_key in [item for item in cls._gzip_cache if item[0] == path and item != key]:
                cls._gzip_cache.pop(old_key, None)
            cls._gzip_cache[key] = payload
        return payload

    @classmethod
    def brotli_payload(cls, sidecar, stat):
        key = (sidecar, stat.st_mtime_ns, stat.st_size)
        with cls._encoding_lock:
            cached = cls._brotli_cache.get(key)
            if cached is not None:
                return cached
        with open(sidecar, "rb") as source:
            payload = source.read()
        with cls._encoding_lock:
            for old_key in [item for item in cls._brotli_cache if item[0] == sidecar and item != key]:
                cls._brotli_cache.pop(old_key, None)
            cls._brotli_cache[key] = payload
        return payload

    def send_head(self):
        # Text indexes are large. Prefer deterministic prebuilt Brotli for the
        # release bundles, otherwise compress once with gzip and reuse it.
        path = self.translate_path(self.path)
        ext = os.path.splitext(path)[1].lower()
        accept_encoding = self.headers.get("Accept-Encoding", "")
        if ext in self.COMPRESSIBLE and os.path.isfile(path):
            try:
                source_stat = os.stat(path)
                encoding = None
                payload = None
                payload_stat = source_stat
                sidecar = f"{path}.br"
                if accepts_encoding(accept_encoding, "br") and os.path.isfile(sidecar):
                    sidecar_stat = os.stat(sidecar)
                    # Equal mtimes are common after extracting an archive and
                    # are valid because release audit verifies source digests.
                    if sidecar_stat.st_mtime_ns >= source_stat.st_mtime_ns:
                        encoding = "br"
                        payload_stat = sidecar_stat
                        payload = self.brotli_payload(sidecar, sidecar_stat)
                if payload is None and accepts_encoding(accept_encoding, "gzip"):
                    encoding = "gzip"
                    payload = self.gzip_payload(path, source_stat)
                if payload is not None:
                    etag = f'"{source_stat.st_mtime_ns:x}-{source_stat.st_size:x}-{payload_stat.st_size:x}-{encoding}"'
                    if self.headers.get("If-None-Match") == etag:
                        self.send_response(304)
                        self.send_header("ETag", etag)
                        self.send_header("Vary", "Accept-Encoding")
                        self.end_headers()
                        return None
                    self.send_response(200)
                    self.send_header("Content-type", self.guess_type(path))
                    self.send_header("Content-Encoding", encoding)
                    self.send_header("Vary", "Accept-Encoding")
                    self.send_header("ETag", etag)
                    self.send_header("Last-Modified", email.utils.formatdate(source_stat.st_mtime, usegmt=True))
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
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        release = query.get("v", [""])[0]
        # Валидные метки релиза: старые ручные даты (20260824-core115) и
        # автоматические contenthash-версии сборки (h-0123456789).
        versioned = bool(re.fullmatch(r"\d{8}-core\d+", release) or re.fullmatch(r"h-[0-9a-f]{10}", release))
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
        sys.stderr.write(f"Listening on http://0.0.0.0:{PORT} (Brotli/gzip + ETag + immutable version cache)\n")
        httpd.serve_forever()
