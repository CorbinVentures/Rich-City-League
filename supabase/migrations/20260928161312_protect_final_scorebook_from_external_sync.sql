-- Production migration-history compatibility marker.
--
-- This trigger version was applied during a parallel integrity audit. The
-- canonical implementation is reapplied by
-- 20260928162200_protect_final_scorebook_result.sql, which is the source-owned
-- definition going forward.
select 1;
