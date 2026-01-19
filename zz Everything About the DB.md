[
  {
    "type": "TABLE_STRUCTURE",
    "item": "action_proposals.action_type",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "action_proposals.conversation_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "action_proposals.created_at",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "action_proposals.id",
    "detail": "uuid",
    "extra": "PRIMARY KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "action_proposals.impact_score",
    "detail": "numeric",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "action_proposals.payload",
    "detail": "jsonb",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "action_proposals.personal_score",
    "detail": "numeric",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "action_proposals.priority_score",
    "detail": "numeric",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "action_proposals.rationale",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "action_proposals.urgency_score",
    "detail": "numeric",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "agent_errors.agent_type",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "agent_errors.created_at",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "agent_errors.error_id",
    "detail": "text",
    "extra": "UNIQUE",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "agent_errors.id",
    "detail": "uuid",
    "extra": "PRIMARY KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "agent_errors.message_internal",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "agent_errors.message_user",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "agent_errors.user_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "channels.created_at",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "channels.id",
    "detail": "uuid",
    "extra": "PRIMARY KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "channels.identifier",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "channels.type",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "channels.user_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.created_at",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.deal_type",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.embedding",
    "detail": "USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.id",
    "detail": "uuid",
    "extra": "PRIMARY KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.last_updated",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.message_count",
    "detail": "integer",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.messages_since_rebuild",
    "detail": "integer",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.priority_score",
    "detail": "integer",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.state",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.summary_json",
    "detail": "jsonb",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.summary_text",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.topic",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "conversation_threads.user_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "cp_states.cp_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY, PRIMARY KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "cp_states.last_updated",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "cp_states.state",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "cp_states.summary_text",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "cps.created_at",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "cps.id",
    "detail": "uuid",
    "extra": "PRIMARY KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "cps.is_blacklisted",
    "detail": "boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "cps.locations",
    "detail": "jsonb",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "cps.name",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "cps.other_identifiers",
    "detail": "jsonb",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "cps.primary_identifier",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "cps.user_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.cp_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.created_at",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.description",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.end_time",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.event_type",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.id",
    "detail": "uuid",
    "extra": "PRIMARY KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.location",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.parent_event_id",
    "detail": "uuid",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.pre_block_group_id",
    "detail": "uuid",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.start_time",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.status",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.title",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "events.user_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "message_embeddings.embedding",
    "detail": "USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "message_embeddings.message_id",
    "detail": "uuid",
    "extra": "PRIMARY KEY, FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.channel_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.cleaned_text",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.conversation_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.cp_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.direction",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.external_id",
    "detail": "text",
    "extra": "UNIQUE",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.external_thread_id",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.id",
    "detail": "uuid",
    "extra": "PRIMARY KEY, PRIMARY KEY, PRIMARY KEY, PRIMARY KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.occurred_at",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.raw_text",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.tag_primary",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.tag_secondary",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.thread_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.timestamp",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.universal_message_id",
    "detail": "text",
    "extra": "UNIQUE",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "messages.user_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "thread_participants.added_at",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "thread_participants.cp_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY, PRIMARY KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "thread_participants.thread_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY, PRIMARY KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "todos.cp_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "todos.created_at",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "todos.description",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "todos.due_date",
    "detail": "date",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "todos.id",
    "detail": "uuid",
    "extra": "PRIMARY KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "todos.scheduled_time",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "todos.status",
    "detail": "text",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "todos.thread_id",
    "detail": "uuid",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "todos.user_id",
    "detail": "uuid",
    "extra": "FOREIGN KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "users.created_at",
    "detail": "timestamp with time zone",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "users.email",
    "detail": "text",
    "extra": "UNIQUE",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "users.google_oauth_tokens",
    "detail": "jsonb",
    "extra": null,
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "users.id",
    "detail": "uuid",
    "extra": "PRIMARY KEY, PRIMARY KEY, PRIMARY KEY, PRIMARY KEY",
    "link": ""
  },
  {
    "type": "TABLE_STRUCTURE",
    "item": "users.settings",
    "detail": "jsonb",
    "extra": null,
    "link": ""
  },
  {
    "type": "RELATIONSHIP",
    "item": "channels",
    "detail": "user_id",
    "extra": "REFERENCES",
    "link": "users(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "cps",
    "detail": "user_id",
    "extra": "REFERENCES",
    "link": "users(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "messages",
    "detail": "user_id",
    "extra": "REFERENCES",
    "link": "users(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "messages",
    "detail": "cp_id",
    "extra": "REFERENCES",
    "link": "cps(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "messages",
    "detail": "channel_id",
    "extra": "REFERENCES",
    "link": "channels(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "message_embeddings",
    "detail": "message_id",
    "extra": "REFERENCES",
    "link": "messages(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "cp_states",
    "detail": "cp_id",
    "extra": "REFERENCES",
    "link": "cps(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "events",
    "detail": "user_id",
    "extra": "REFERENCES",
    "link": "users(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "events",
    "detail": "cp_id",
    "extra": "REFERENCES",
    "link": "cps(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "todos",
    "detail": "user_id",
    "extra": "REFERENCES",
    "link": "users(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "todos",
    "detail": "cp_id",
    "extra": "REFERENCES",
    "link": "cps(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "conversation_threads",
    "detail": "user_id",
    "extra": "REFERENCES",
    "link": "users(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "thread_participants",
    "detail": "thread_id",
    "extra": "REFERENCES",
    "link": "conversation_threads(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "thread_participants",
    "detail": "cp_id",
    "extra": "REFERENCES",
    "link": "cps(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "messages",
    "detail": "thread_id",
    "extra": "REFERENCES",
    "link": "conversation_threads(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "agent_errors",
    "detail": "user_id",
    "extra": "REFERENCES",
    "link": "users(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "messages",
    "detail": "conversation_id",
    "extra": "REFERENCES",
    "link": "conversation_threads(id)"
  },
  {
    "type": "RELATIONSHIP",
    "item": "action_proposals",
    "detail": "conversation_id",
    "extra": "REFERENCES",
    "link": "conversation_threads(id)"
  },
  {
    "type": "RPC_FUNCTION",
    "item": "match_conversations",
    "detail": "Returns: record",
    "extra": "Args: \nBEGIN\n  RETURN QUERY\n  SELECT\n    conversation_threads.id,\n    conversation_threads.topic,\n    conversation_threads.state,\n    1 - (conversation_threads.embedding <=> query_embedding) as similarity\n  FROM conversation_threads\n  WHERE \n    conversation_threads.user_id = target_user_id\n    AND conversation_threads.embedding IS NOT NULL\n    AND 1 - (conversation_threads.embedding <=> query_embedding) > match_threshold\n  ORDER BY conversation_threads.embedding <=> query_embedding\n  LIMIT match_count;\nEND;\n",
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "match_messages",
    "detail": "Returns: record",
    "extra": "Args: \nbegin\n  return;\nend;\n",
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "update_priority_score",
    "detail": "Returns: void",
    "extra": "Args: \nDECLARE\n    thread_record RECORD;\n    base_score INTEGER := 0;\n    urgency_score INTEGER := 0;\n    days_until INTEGER;\nBEGIN\n    -- 1. Get thread data\n    SELECT deal_type, state INTO thread_record\n    FROM conversation_threads WHERE id = target_thread_id;\n\n    -- 2. Base score from deal_type\n    IF thread_record.deal_type = 'seller' THEN base_score := base_score + 3;\n    ELSE base_score := base_score + 2;\n    END IF;\n\n    -- 3. Base score from state\n    IF thread_record.state = 'closing' THEN base_score := base_score + 3;\n    ELSIF thread_record.state = 'negotiating' THEN base_score := base_score + 2;\n    ELSE base_score := base_score + 1;\n    END IF;\n\n    -- 4. Urgency from todos\n    SELECT MIN(due_date) - CURRENT_DATE INTO days_until\n    FROM todos WHERE thread_id = target_thread_id AND status = 'pending';\n\n    IF days_until IS NOT NULL THEN\n        IF days_until < 0 THEN urgency_score := 4;\n        ELSIF days_until = 0 THEN urgency_score := 3;\n        ELSIF days_until = 1 THEN urgency_score := 2;\n        ELSE urgency_score := 1;\n        END IF;\n    END IF;\n\n    -- 5. Update\n    UPDATE conversation_threads\n    SET priority_score = base_score + urgency_score, last_updated = NOW()\n    WHERE id = target_thread_id;\nEND;\n",
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "match_messages",
    "detail": "Returns: record",
    "extra": "Args: \nBEGIN\n  RETURN QUERY\n  SELECT\n    m.id AS message_id,\n    1 - (me.embedding <=> query_embedding) AS similarity\n  FROM message_embeddings me\n  JOIN messages m ON me.message_id = m.id\n  WHERE m.user_id = filter_user_id\n    AND 1 - (me.embedding <=> query_embedding) > match_threshold\n  ORDER BY me.embedding <=> query_embedding\n  LIMIT match_count;\nEND;\n",
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "trigger_update_priority_on_todo",
    "detail": "Returns: trigger",
    "extra": "Args: \nBEGIN\n    IF NEW.thread_id IS NOT NULL THEN\n        PERFORM update_priority_score(NEW.thread_id);\n    END IF;\n    RETURN NEW;\nEND;\n",
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "trigger_update_priority_on_thread",
    "detail": "Returns: trigger",
    "extra": "Args: \nBEGIN\n    PERFORM update_priority_score(NEW.id);\n    RETURN NEW;\nEND;\n",
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "hnswhandler",
    "detail": "Returns: index_am_handler",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "ivfflat_halfvec_support",
    "detail": "Returns: internal",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "ivfflat_bit_support",
    "detail": "Returns: internal",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "hnsw_halfvec_support",
    "detail": "Returns: internal",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "cosine_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "l1_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_dims",
    "detail": "Returns: integer",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_norm",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "l2_normalize",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "binary_quantize",
    "detail": "Returns: bit",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "subvector",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_add",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_sub",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_mul",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_concat",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_lt",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_le",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_negative_inner_product",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_spherical_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_eq",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_ne",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_ge",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_gt",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_cmp",
    "detail": "Returns: integer",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_l2_squared_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_accum",
    "detail": "Returns: ARRAY",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_avg",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_combine",
    "detail": "Returns: ARRAY",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "avg",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sum",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "array_to_vector",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "array_to_vector",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "array_to_vector",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "array_to_vector",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_to_float4",
    "detail": "Returns: ARRAY",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "ivfflathandler",
    "detail": "Returns: index_am_handler",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_in",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_typmod_in",
    "detail": "Returns: integer",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_out",
    "detail": "Returns: cstring",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_recv",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_send",
    "detail": "Returns: bytea",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "l2_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "inner_product",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "hnsw_bit_support",
    "detail": "Returns: internal",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "hnsw_sparsevec_support",
    "detail": "Returns: internal",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_in",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_out",
    "detail": "Returns: cstring",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_typmod_in",
    "detail": "Returns: integer",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_recv",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_send",
    "detail": "Returns: bytea",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "l2_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "inner_product",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "cosine_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "l1_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_dims",
    "detail": "Returns: integer",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "l2_norm",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "l2_normalize",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "binary_quantize",
    "detail": "Returns: bit",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "subvector",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_add",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_sub",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_mul",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_concat",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_lt",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_le",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_eq",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_ne",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_ge",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_gt",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_cmp",
    "detail": "Returns: integer",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_l2_squared_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_negative_inner_product",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_spherical_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_accum",
    "detail": "Returns: ARRAY",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_avg",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_combine",
    "detail": "Returns: ARRAY",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "avg",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sum",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_to_vector",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_to_halfvec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "array_to_halfvec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "array_to_halfvec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "array_to_halfvec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "array_to_halfvec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_to_float4",
    "detail": "Returns: ARRAY",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "hamming_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "jaccard_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_in",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_out",
    "detail": "Returns: cstring",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_typmod_in",
    "detail": "Returns: integer",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_recv",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_send",
    "detail": "Returns: bytea",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "l2_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "inner_product",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "cosine_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "l1_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "l2_norm",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "l2_normalize",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_lt",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_le",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_eq",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_ne",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_ge",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_gt",
    "detail": "Returns: boolean",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_cmp",
    "detail": "Returns: integer",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_l2_squared_distance",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_negative_inner_product",
    "detail": "Returns: double precision",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "vector_to_sparsevec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_to_vector",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "halfvec_to_sparsevec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "sparsevec_to_halfvec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "array_to_sparsevec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "array_to_sparsevec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "array_to_sparsevec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RPC_FUNCTION",
    "item": "array_to_sparsevec",
    "detail": "Returns: USER-DEFINED",
    "extra": null,
    "link": ""
  },
  {
    "type": "RLS_POLICY",
    "item": "action_proposals",
    "detail": "action_proposals_select_own",
    "extra": null,
    "link": "(EXISTS ( SELECT 1\n   FROM conversation_threads ct\n  WHERE ((ct.id = action_proposals.conversation_id) AND (ct.user_id = auth.uid()))))"
  },
  {
    "type": "RLS_POLICY",
    "item": "users",
    "detail": "Users can update own data",
    "extra": null,
    "link": "(auth.uid() = id)"
  },
  {
    "type": "RLS_POLICY",
    "item": "users",
    "detail": "Users can view own data",
    "extra": null,
    "link": "(auth.uid() = id)"
  },
  {
    "type": "RLS_POLICY",
    "item": "users",
    "detail": "Users own data",
    "extra": null,
    "link": "(auth.uid() = id)"
  },
  {
    "type": "RLS_POLICY",
    "item": "users",
    "detail": "users_isolation",
    "extra": null,
    "link": "(id = auth.uid())"
  },
  {
    "type": "RLS_POLICY",
    "item": "cps",
    "detail": "Users can view own cps",
    "extra": null,
    "link": "(auth.uid() = user_id)"
  },
  {
    "type": "RLS_POLICY",
    "item": "cps",
    "detail": "Users own data",
    "extra": null,
    "link": "(auth.uid() = user_id)"
  },
  {
    "type": "RLS_POLICY",
    "item": "cps",
    "detail": "cps_isolation",
    "extra": null,
    "link": "(user_id = auth.uid())"
  },
  {
    "type": "RLS_POLICY",
    "item": "channels",
    "detail": "Users can view own channels",
    "extra": null,
    "link": "(auth.uid() = user_id)"
  },
  {
    "type": "RLS_POLICY",
    "item": "channels",
    "detail": "channels_isolation",
    "extra": null,
    "link": "(user_id = auth.uid())"
  },
  {
    "type": "RLS_POLICY",
    "item": "messages",
    "detail": "Users can view own messages",
    "extra": null,
    "link": "(auth.uid() = user_id)"
  },
  {
    "type": "RLS_POLICY",
    "item": "messages",
    "detail": "Users own data",
    "extra": null,
    "link": "(auth.uid() = user_id)"
  },
  {
    "type": "RLS_POLICY",
    "item": "messages",
    "detail": "messages_isolation",
    "extra": null,
    "link": "(user_id = auth.uid())"
  },
  {
    "type": "RLS_POLICY",
    "item": "message_embeddings",
    "detail": "Users can view own embeddings",
    "extra": null,
    "link": "(EXISTS ( SELECT 1\n   FROM messages\n  WHERE ((messages.id = message_embeddings.message_id) AND (messages.user_id = auth.uid()))))"
  },
  {
    "type": "RLS_POLICY",
    "item": "message_embeddings",
    "detail": "message_embeddings_isolation",
    "extra": null,
    "link": "(message_id IN ( SELECT messages.id\n   FROM messages\n  WHERE (messages.user_id = auth.uid())))"
  },
  {
    "type": "RLS_POLICY",
    "item": "cp_states",
    "detail": "Users can view own cp_states",
    "extra": null,
    "link": "(EXISTS ( SELECT 1\n   FROM cps\n  WHERE ((cps.id = cp_states.cp_id) AND (cps.user_id = auth.uid()))))"
  },
  {
    "type": "RLS_POLICY",
    "item": "cp_states",
    "detail": "cp_states_isolation",
    "extra": null,
    "link": "(cp_id IN ( SELECT cps.id\n   FROM cps\n  WHERE (cps.user_id = auth.uid())))"
  },
  {
    "type": "RLS_POLICY",
    "item": "todos",
    "detail": "Users can view own todos",
    "extra": null,
    "link": "(auth.uid() = user_id)"
  },
  {
    "type": "RLS_POLICY",
    "item": "todos",
    "detail": "Users own data",
    "extra": null,
    "link": "(auth.uid() = user_id)"
  },
  {
    "type": "RLS_POLICY",
    "item": "todos",
    "detail": "todos_isolation",
    "extra": null,
    "link": "(user_id = auth.uid())"
  },
  {
    "type": "RLS_POLICY",
    "item": "events",
    "detail": "Users can view own events",
    "extra": null,
    "link": "(auth.uid() = user_id)"
  },
  {
    "type": "RLS_POLICY",
    "item": "events",
    "detail": "Users own data",
    "extra": null,
    "link": "(auth.uid() = user_id)"
  },
  {
    "type": "RLS_POLICY",
    "item": "events",
    "detail": "events_isolation",
    "extra": null,
    "link": "(user_id = auth.uid())"
  },
  {
    "type": "RLS_POLICY",
    "item": "conversation_threads",
    "detail": "Users own data",
    "extra": null,
    "link": "(auth.uid() = user_id)"
  }
]
