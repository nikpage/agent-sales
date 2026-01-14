# database.py
import json, requests
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TIMEOUT_SECONDS

class DB:
    def __init__(self):
        k=SUPABASE_SERVICE_ROLE_KEY
        self.base=f"{SUPABASE_URL}/rest/v1"
        self.h={"apikey":k,"authorization":f"Bearer {k}","content-type":"application/json","accept":"application/json"}

    def select(self, table, **params):
        r=requests.get(f"{self.base}/{table}", headers=self.h, params=params, timeout=TIMEOUT_SECONDS)
        if not r.ok: raise RuntimeError(f"{r.status_code} {r.text}")
        return r.json()

    def insert(self, table, row, prefer="return=representation"):
        h=dict(self.h); h["Prefer"]=prefer
        r=requests.post(f"{self.base}/{table}", headers=h, data=json.dumps(row), timeout=TIMEOUT_SECONDS)
        if not r.ok: raise RuntimeError(f"{r.status_code} {r.text}")
        out=r.json()
        return out[0] if isinstance(out,list) and out else out

    def upsert(self, table, row, on_conflict=None):
        h=dict(self.h); h["Prefer"]="resolution=merge-duplicates,return=representation"
        params={}
        if on_conflict: params["on_conflict"]=on_conflict
        r=requests.post(f"{self.base}/{table}", headers=h, params=params, data=json.dumps(row), timeout=TIMEOUT_SECONDS)
        if not r.ok: raise RuntimeError(f"{r.status_code} {r.text}")
        out=r.json()
        return out[0] if isinstance(out,list) and out else out

    def patch(self, table, match, updates):
        r=requests.patch(f"{self.base}/{table}", headers=self.h, params=match, data=json.dumps(updates), timeout=TIMEOUT_SECONDS)
        if not r.ok: raise RuntimeError(f"{r.status_code} {r.text}")

db=DB()
