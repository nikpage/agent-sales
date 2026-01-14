from http.server import BaseHTTPRequestHandler
import json, os, uuid

class handler(BaseHTTPRequestHandler):
    def send(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

    def do_POST(self):
        size = int(self.headers.get("Content-Length", 0))
        if size == 0:
            return self.send(400, {"error": "empty body"})

        try:
            data = json.loads(self.rfile.read(size))
        except:
            return self.send(400, {"error": "invalid json"})

        for k in ["user_id", "topic", "event", "payload"]:
            if k not in data:
                return self.send(400, {"error": f"missing {k}"})

        try:
            uuid.UUID(data["user_id"])
        except:
            return self.send(400, {"error": "invalid user_id"})

        # LIVE MODE: accept + acknowledge, no external writes
        self.send(200, {
            "status": "accepted",
            "mode": "live-no-db"
        })
