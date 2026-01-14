# ingestion.py
import uuid
from datetime import datetime, timezone
from database import db
from ai import embed_text
from errors import log_error

def _now(): return datetime.now(timezone.utc).isoformat()

def _get_or_create_thread(user_id, topic="email"):
    rows=db.select("conversation_threads", select="id,message_count", user_id=f"eq.{user_id}", topic=f"eq.{topic}", order="created_at.desc", limit=1)
    if rows: return rows[0]["id"], int(rows[0].get("message_count") or 0)

    thread_id=str(uuid.uuid4())
    db.insert("conversation_threads",{
        "id": thread_id,
        "user_id": user_id,
        "topic": topic,
        "state": "open",
        "message_count": 0,
        "created_at": _now(),
        "last_updated": _now(),
    }, prefer="return=minimal")
    return thread_id, 0

def ingest_email(user_id, text, external_id=None):
    if not text: return
    try:
        thread_id, count=_get_or_create_thread(user_id)

        if external_id and db.select("messages", select="id", external_id=f"eq.{external_id}", limit=1):
            return

        msg=db.insert("messages",{
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "thread_id": thread_id,
            "direction": "inbound",
            "raw_text": text,
            "timestamp": _now(),
            "external_id": external_id,
        })

        vec=embed_text(text)
        db.upsert("message_embeddings",{"message_id": msg["id"], "embedding": vec}, on_conflict="message_id")

        db.patch("conversation_threads", {"id": f"eq.{thread_id}"}, {"message_count": count+1, "last_updated": _now()})

    except Exception as e:
        log_error(user_id, "ingestion", "INGEST_FAIL", "Ingestion failed.", str(e))
        raise
