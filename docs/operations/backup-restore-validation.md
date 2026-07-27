# Backup, Restore, and Signed-Storage Validation

This is a validation runbook. Never execute it against active production and never
place credentials, signed URLs, or personal data in evidence.

## Preconditions

- Name the drill owner, approver, source project, recovery point, and evidence
  location.
- Confirm the destination is a new isolated restore project with a different ID.
- Disable delivery, webhooks, workflows, AI calls, and public access there.
- Use synthetic identities/files and redact all retained output.

## Database backup verification

1. Capture provider plan, backup type, schedule, retention, region, encryption,
   and PITR window without secret values.
2. Confirm the newest successful recovery point meets the approved RPO.
3. Record failed or delayed backups and UTC clock differences.
4. Confirm coverage includes `crm`, extensions, functions, grants, RLS policies,
   and migration history.
5. Use NOT VERIFIED unless provider evidence is attached.

## Isolated restore procedure

1. Create the recovery project and record its non-secret ID.
2. Restore the selected point without overwriting the source.
3. Record the restored migration head before applying anything new.
4. Compare expected table, function, policy, trigger, index, and migration counts.
5. Verify every CRM table retains enabled and forced RLS. Test anonymous, student,
   advisor, and administrator authorization truth tables.
6. Verify CRM UUID foreign keys and `crm.profiles` as canonical identity. Check
   for orphans.
7. Confirm audit/timeline immutability, event order, correlation identifiers, and
   idempotent consumer replay.
8. Run the matching application build with recovery-only credentials. Verify
   `/api/health`, `/api/ready`, authentication, reads, and a rolled-back synthetic
   mutation.
9. Record restore duration, recovery point, actual RTO/RPO, counts/checksums,
   failures, and approval.
10. Destroy the isolated restore project after retaining evidence.

## Private Storage backup and restore

For every private bucket, export an encrypted manifest with bucket name, hashed
path, byte size, content type, modified time, version where supported, and a
SHA-256 checksum. Never include a signed URL.

1. Reconcile object count and bytes with provider inventory.
2. Copy encrypted objects to a separately controlled, versioned location.
3. Restore a synthetic sample from every bucket to the isolated project.
4. Verify restored size and checksum exactly match.
5. Confirm privacy, MIME/size restrictions, and absence of public listing.
6. Record missing objects, checksum mismatches, time, and test-object deletion.

Required buckets are `message-attachments`, `student-documents`, and
`student-files`. Discovery fails closed if an unexpected public bucket exists.

## Signed-link verification

Capture only pass/fail, response status, times, and correlation IDs. Redact the URL
and token.

1. Confirm an authorized student can create a document link and an authorized
   conversation participant can create an attachment link.
2. Confirm anonymous and different-student callers are denied before a URL is
   returned (cross-user test).
3. Confirm HTTPS and a private bucket.
4. Confirm the document link works before five-minute expiry and fails afterward;
   confirm the attachment link works before ten-minute expiry and fails afterward.
5. Confirm logout, history, logs, analytics, and error reports retain no URL.
6. Confirm deleted objects cannot receive a new working link and filenames cannot
   inject response headers.

A drill passes only if approved RTO/RPO are met, integrity and authorization pass,
storage checksums match, cross-user and expiry tests pass, no outbound effects
occur, and security and operations approve. A skipped check is NOT VERIFIED.
