-- Phase 5, step 1 of 2: add the new deliverable_status enum values.
--
-- This MUST run as its own separate statement/execution, committed on its
-- own, before 20260912100001_execution_evidence_metrics.sql runs — that
-- file uses 'assigned' as a column default, and Postgres refuses to
-- reference a brand-new enum value inside the same transaction that added
-- it (error 55P04: "unsafe use of new value"). A hosted SQL editor (like
-- Supabase's) runs a pasted script as one transaction, so splitting this
-- into its own file/its own "Run" is what actually guarantees the value
-- is committed first — an inline `commit;` partway through a single pasted
-- script is not reliably honored by every SQL-editor client.
--
-- The existing pipeline (not_started -> draft -> submitted -> needs_revision
-- -> approved -> scheduled -> published, with late/cancelled exits) already
-- covers most of the brief's section-17 workflow. Adding the stages it
-- doesn't yet have rather than renaming the ones it does (a deliverable's
-- very first stage becomes 'assigned', matching the brief's naming, and
-- 'in_review'/'metrics_collected' fill the two real gaps).
alter type deliverable_status add value if not exists 'assigned';
alter type deliverable_status add value if not exists 'brief';
alter type deliverable_status add value if not exists 'in_review';
alter type deliverable_status add value if not exists 'metrics_collected';
