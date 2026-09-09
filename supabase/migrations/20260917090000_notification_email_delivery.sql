-- Email delivery for notifications (follow-up to Phase 6, which left
-- notifications.md as schema-only: rows appear in the table but nothing
-- ever emailed them). Additive columns only — every existing row is
-- unaffected; nullable means "not attempted" (no email config set) vs.
-- a timestamp (sent) vs. an error string (attempted and failed).

alter table notifications
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text;
