# SECURITY DEFINER Verification Report

Audit date: 2026-07-27  
Scope: linked Supabase schemas `crm` and `public`  
Deployment action: none

## Executive result

The linked pre-hardening inventory contains 96 application SECURITY DEFINER
functions. All CRM functions already use `search_path = ''` and deny anonymous
execution. Six legacy public functions allow anonymous execution and use
`search_path = public`.

Migration `20260820_harden_security_definer_privileges.sql` closes those six
anonymous grants, changes their paths to empty, preserves the four authenticated
legacy contracts, and prevents direct execution of the two trigger functions.
It also hardens the two non-definer helpers reported by Supabase's mutable-path
advisor.

## Pre-hardening exceptions

| Function | Anonymous before | Authenticated after | Search path after |
|---|---:|---:|---|
| `public.attach_assigned_advisors_to_conversation()` | Yes | No direct execution | Empty |
| `public.create_student_conversation(text)` | Yes | Yes | Empty |
| `public.current_platform_role()` | Yes | Yes | Empty |
| `public.is_assigned_advisor(text)` | Yes | Yes | Empty |
| `public.is_conversation_participant(uuid)` | Yes | Yes | Empty |
| `public.update_conversation_after_message()` | Yes | No direct execution | Empty |

Additional mutable-path helpers:

- `public.current_clerk_user_id()` → empty path
- `public.set_updated_at()` → empty path

## Functional preservation

No function body, trigger, table, RLS policy, identity field, or business rule is
changed. The legacy bodies already schema-qualify application relations and
helpers. PostgreSQL built-ins resolve from `pg_catalog`, which remains implicitly
available with an empty configured path.

## Enforcement

The migration contains a fail-closed catalog verification block. It aborts if
any SECURITY DEFINER function in `crm` or `public`:

1. remains executable by `anon`; or
2. lacks the approved empty search path.

pgTAP verifies the global invariants and exact authenticated contracts. Static
tests ensure the migration alters only attributes/grants and never replaces
function bodies.

Sprint 8.3 adds one intentional anonymous allowlist entry:
`crm.consume_operational_rate_limit(text,text,integer,integer)`. It accepts only
a server-generated SHA-256 key, an enumerated scope, and bounded counters. It
cannot read or mutate CRM identity/business records. Verification excludes only
this exact signature; every other anonymous SECURITY DEFINER function remains
prohibited.

## Required post-application evidence

After applying to Preview only:

```text
npx supabase db advisors --linked --type security
```

Acceptance criteria:

- no `anon_security_definer_function_executable` finding;
- no `function_search_path_mutable` finding for application functions;
- pgTAP Volume 8 suite passes;
- authenticated messaging creation and participant checks still pass;
- anonymous RPC calls return permission denied.
