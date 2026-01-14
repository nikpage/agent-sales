# ai.py
import json, requests
from config import GEMINI_API_KEY, TIMEOUT_SECONDS

BASE="https://generativelanguage.googleapis.com/v1beta"

def embed_text(text, model="text-embedding-004"):
    url=f"{BASE}/models/{model}:embedContent"
    h={"content-type":"application/json","x-goog-api-key":GEMINI_API_KEY}
    body={"content":{"parts":[{"text":text}]}}
    r=requests.post(url, headers=h, data=json.dumps(body), timeout=TIMEOUT_SECONDS)
    if not r.ok: raise RuntimeError(f"{r.status_code} {r.text}")
    j=r.json()
    return j["embedding"]["values"]
