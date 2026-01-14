# errors.py
import uuid
from datetime import datetime, timezone
from database import db

def _now(): return datetime.now(timezone.utc).isoformat()

def log_error(user_id, agent_type, error_id, msg_user, msg_internal):
    db.insert("agent_errors",{
        "id": str(uuid.uuid4()),
        "error_id": error_id,
        "user_id": user_id,
        "agent_type": agent_type,
        "message_user": msg_user,
        "message_internal": msg_internal,
        "created_at": _now(),
    }, prefer="return=minimal")
