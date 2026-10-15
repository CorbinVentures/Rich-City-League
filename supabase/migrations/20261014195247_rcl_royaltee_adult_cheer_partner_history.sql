-- Production applied the exact 20261014153400 Royaltee partner migration under version 20261014195247.
-- The canonical migration stays at 20261014153400 so its objects exist before
-- 20261014183500 and 20261014224102. This marker reconciles the remote history.
-- Existing production 20261014153400 must be marked applied after schema verification.
select 1;
