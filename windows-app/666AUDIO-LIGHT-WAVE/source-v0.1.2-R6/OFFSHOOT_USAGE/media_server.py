"""Lokaler Medienkatalog für die beiden bestehenden Browser-Ansichten."""
import argparse
from collections import Counter
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path, PurePosixPath
import random
from threading import Lock
from urllib.parse import parse_qs, unquote, urlsplit

PAGES = {"index_vertical.html", "index_horizontal.html", "index_single_centered.html"}
MEDIA_TYPES = {".mp4", ".webm", ".ogg", ".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_RESULTS = 200


class MediaCatalog:
    def __init__(self, root, folders):
        self.root = Path(root).resolve()
        self.folders = folders
        self.lock = Lock()
        self.files = ()
        self.indices = ()
        self.position = 0
        self.refresh()

    def refresh(self):
        files = []
        for folder in self.folders:
            library = self.root / folder
            if library.is_dir():
                files.extend(
                    f"{folder}/{path.name}" for path in sorted(library.iterdir())
                    if path.suffix.lower() in MEDIA_TYPES and path.is_file()
                    and path.resolve().is_relative_to(self.root)
                )
        counts = Counter()
        source = self.root / "neural_indices_json"
        if source.is_dir() and source.resolve().is_relative_to(self.root):
            for path in sorted(source.glob("*.json")):
                if not path.is_file() or not path.resolve().is_relative_to(self.root):
                    continue
                try:
                    with path.open(encoding="utf-8") as stream:
                        data = json.load(stream)
                except (OSError, ValueError):
                    continue
                if isinstance(data, list):
                    counts.update(i for i in data if type(i) is int and 0 <= i < len(files))
        indices = [i for i, _ in counts.most_common()]
        if not indices:
            indices = list(range(len(files)))
            random.shuffle(indices)
        with self.lock:
            self.files = tuple(files)
            self.indices = tuple(indices)
            self.position = 0
        return len(files)

    def take(self, limit):
        with self.lock:
            if not self.indices:
                return []
            size = len(self.indices)
            selected = [self.files[self.indices[(self.position + i) % size]] for i in range(limit)]
            self.position = (self.position + limit) % size
            return selected

    def resource(self, request_path):
        path = unquote(request_path).lstrip("/")
        pages_root = Path(__file__).resolve().parent
        if not path:
            return pages_root / "index_vertical.html"
        if path in PAGES:
            return pages_root / path
        parts = PurePosixPath(path).parts
        if len(parts) != 2 or parts[0] not in self.folders or "\\" in path:
            return None
        with self.lock:
            in_catalog = path in self.files
        candidate = (self.root / path).resolve()
        if in_catalog and candidate.is_relative_to(self.root) and candidate.is_file():
            return candidate
        return None


class MediaHandler(SimpleHTTPRequestHandler):
    def allowed_host(self):
        port = self.server.server_port
        return self.headers.get("Host") in {f"localhost:{port}", f"127.0.0.1:{port}"}

    def json_reply(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self.allowed_host():
            self.send_error(403)
            return
        parsed = urlsplit(self.path)
        if parsed.path == "/api/media":
            count = parse_qs(parsed.query, keep_blank_values=True).get("limit", ["50"])
            if len(count) != 1 or not count[0].isascii() or not count[0].isdigit() or len(count[0]) > 3:
                self.json_reply(400, {"error": "Ungültiges Limit"})
                return
            limit = int(count[0])
            if not 0 <= limit <= MAX_RESULTS:
                self.json_reply(400, {"error": f"Limit muss zwischen 0 und {MAX_RESULTS} liegen"})
                return
            self.json_reply(200, self.server.catalog.take(limit))
        elif parsed.path == "/api/refresh":
            self.json_reply(405, {"error": "POST erforderlich"})
        else:
            super().do_GET()

    def do_POST(self):
        if not self.allowed_host():
            self.send_error(403)
            return
        if self.path != "/api/refresh":
            self.send_error(404)
            return
        origin = self.headers.get("Origin")
        if origin != f"http://{self.headers['Host']}" or self.headers.get("X-LWT-Refresh") != "1":
            self.send_error(403)
            return
        total = self.server.catalog.refresh()
        self.json_reply(200, {"status": "Ordner aktualisiert", "total_files": total})

    def send_head(self):
        if not self.allowed_host():
            self.send_error(403)
            return None
        resource = self.server.catalog.resource(urlsplit(self.path).path)
        if resource is None:
            self.send_error(404)
            return None
        try:
            stream = resource.open("rb")
        except OSError:
            self.send_error(404)
            return None
        try:
            size = resource.stat().st_size
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(str(resource)))
            self.send_header("Content-Length", str(size))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
        except BaseException:
            stream.close()
            raise
        return stream


def main(default_port, folders):
    parser = argparse.ArgumentParser(description="Lokaler Light-Wave-Medienserver")
    parser.add_argument("--port", type=int, default=default_port)
    parser.add_argument("--media-root", type=Path, default=Path.cwd())
    options = parser.parse_args()
    with ThreadingHTTPServer(("127.0.0.1", options.port), MediaHandler) as server:
        server.catalog = MediaCatalog(options.media_root, folders)
        print(f"http://127.0.0.1:{server.server_port}/")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
