# Global Scholars OS — Volume 3 Architecture Review

## Dependency direction

Business mutations pass through shared CRM authorization and secure RPCs. RPCs
emit domain events. Timeline, notifications, activity feed, analytics, audit,
and workflows consume those events independently.

No downstream projection writes back to a transactional table except through an
approved workflow action handler and its existing secure RPC.

## Enterprise module acceptance

### Workflow Engine

- Rules are stored in `crm.workflow_definitions`.
- Event matching creates idempotent `crm.workflow_runs`.
- Actions are JSON configuration, not module-specific UI code.
- Supported handlers assign tasks, recalculate readiness, create in-app
  notifications, and create `crm.scheduled_work`.
- Processing is administrator-only and emits correlated completion events.

### Audit Log

- `crm.audit_log` is projected from domain events.
- Updates and deletes are rejected by an immutability trigger.
- Only administrators can select entries.
- Request IP, user agent, forwarding, and request IDs are captured when the
  database request context provides them.

### Global Search

- The stable RPC contract returns typed cross-module results.
- Full-text GIN indexes cover existing searchable modules.
- Each result branch invokes its shared authorization helper.
- Notes never appear to students.
- Applications can be added as another result branch without changing callers.

### Analytics

- KPI calculation reads only `crm.domain_events`.
- Snapshots contain pipeline, document, workload, readiness, and processing-time
  metrics.
- Missing future Application events naturally produce an empty pipeline.
- Snapshots and analytics RPCs are administrator-only.

## Hardening decisions

- CRM UUIDs are the only relationship identifiers.
- Platform TypeScript contracts live under `lib/crm`.
- `PlatformServiceError`, shared validation, and structured logging form the
  standard service boundary.
- Database names use snake_case; TypeScript functions use camelCase.
- Migrations use sortable `YYYYMMDD_description.sql` names.
- Security-definer functions use an empty search path and qualified references.

## Future compatibility

Applications, Visa, and AI modules should:

1. use `crm.profiles.id`;
2. add resource authorization helpers;
3. mutate through secure RPCs;
4. emit domain events with correlation identifiers;
5. extend Global Search through its stable result contract;
6. contribute analytics via new event types rather than transactional joins;
7. configure automation through workflows rather than duplicating orchestration.
