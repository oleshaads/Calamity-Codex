#!/usr/bin/env python3
"""Local static server for Calamity Codex.

Serves the site directory and explicitly disables caching on every response,
so updated artwork is never masked by a stale browser cache:

    Cache-Control: no-store, no-cache, must-revalidate, max-age=0
    Pragma: no-cache
    Expires: 0

Usage:
    python3 scripts/serve.py [port] [site-dir]
Defaults: port 8097, dir calamity-codex (relative to the repository root).
"""
import gzip
import http.server
import io
import os
import socketserver
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8097
DIR = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(REPO_ROOT, "calamity-codex")


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    COMPRESSIBLE = {".html", ".css", ".js", ".json", ".svg", ".txt", ".xml"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def send_head(self):
        # The catalog and vanilla recipe index are large text files. Compress
        # them on the wire without changing the on-disk static assets.
        path = self.translate_path(self.path)
        ext = os.path.splitext(path)[1].lower()
        accepts = "gzip" in self.headers.get("Accept-Encoding", "").lower()
        if accepts and ext in self.COMPRESSIBLE and os.path.isfile(path):
            try:
                with open(path, "rb") as source:
                    payload = gzip.compress(source.read(), compresslevel=6, mtime=0)
                self.send_response(200)
                self.send_header("Content-type", self.guess_type(path))
                self.send_header("Content-Encoding", "gzip")
                self.send_header("Vary", "Accept-Encoding")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                return io.BytesIO(payload)
            except OSError:
                pass
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    if not os.path.isdir(DIR):
        sys.exit(f"Site directory not found: {DIR}")
    with Server(("0.0.0.0", PORT), NoCacheHandler) as httpd:
        sys.stderr.write(f"Calamity Codex served from {DIR}\n")
        sys.stderr.write(f"Listening on http://0.0.0.0:{PORT} (no-store caching)\n")
        httpd.serve_forever()
