# config.py
import os
from dotenv import load_dotenv
load_dotenv()

def req(k):
    v=os.getenv(k)
    if not v: raise RuntimeError(f"Missing env var: {k}")
    return v

SUPABASE_URL=req("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY=os.getenv("SUPABASE_SERVICE_ROLE_KEY") or req("SUPABASE_KEY")
GEMINI_API_KEY=req("GEMINI_API_KEY")

EMBEDDING_DIM=768
TIMEOUT_SECONDS=int(os.getenv("TIMEOUT_SECONDS","15"))
