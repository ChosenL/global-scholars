# Volume 6 architecture review

The CRM AI assistant is an authenticated gateway at `POST /api/ai`. It is
separate from the public marketing chatbot.

## Security and data flow

1. Clerk authenticates the caller and supplies the caller-scoped Supabase JWT.
2. `crm.begin_ai_invocation` resolves the canonical CRM profile, applies
   `crm.can_access_student`, enforces advisor-only capabilities, and emits
   `ai.requested`.
3. The context builder queries through the caller-scoped client, so forced RLS
   remains authoritative. It explicitly excludes passport, phone, birth date,
   document storage, and review fields. Notes and timeline records are loaded
   only for advisors and administrators.
4. Input is moderated, the prompt contains only authorized records, and the LLM
   must return a strict JSON schema.
5. Citations not present in the authorized context are discarded. Output is
   moderated before delivery.
6. `crm.complete_ai_invocation` records only citations, token counts, latency,
   and safe error codes—never raw prompts, context, or answers—and emits a
   completion, refusal, or failure event.

Domain events feed the existing immutable audit log and event-only analytics
architecture. `crm.calculate_ai_analytics` reads only domain events.

## Service contracts

Typed contracts cover student advice, timeline summaries, next-action
recommendations, readiness explanations, advisor reply drafts, and application
summaries. The gateway also accepts authorized natural-language search requests.

## Migration strategy

Apply `20260818_create_crm_ai_assistant.sql` after the Volume 5 migrations.
Configure `OPENAI_API_KEY`, a private `OPENAI_SAFETY_SALT`, and optionally
`OPENAI_CRM_MODEL`. No migration was pushed as part of this implementation.
