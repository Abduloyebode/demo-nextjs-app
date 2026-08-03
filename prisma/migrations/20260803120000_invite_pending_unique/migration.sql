-- A plain "check for a pending invite, then insert" is not race-safe
-- against a *non-existent* row: two concurrent invite requests for the
-- same organisation + email can both see "no pending invite" and both
-- insert. Row-level locking can't help here (there's no row to lock until
-- one of them commits), so enforce the invariant with a partial unique
-- index instead — Postgres itself rejects the second concurrent insert.
CREATE UNIQUE INDEX "invite_org_email_pending_unique"
ON "invite" ("organisationId", "email")
WHERE "status" = 'PENDING';
