#!/bin/bash
dotenv -e .env.local -- npx tsx cli/agent.ts "$@"
