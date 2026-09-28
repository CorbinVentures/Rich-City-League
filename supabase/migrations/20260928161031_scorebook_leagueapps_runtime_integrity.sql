-- Production migration-history compatibility marker.
--
-- This version was applied during a parallel scorebook/LeagueApps integrity audit.
-- Its final schema effects are consolidated and superseded by the checked-in
-- 20260928162000_scorebook_bridge_integrity.sql and
-- 20260928162300_leagueapps_service_reconciliation.sql migrations.
-- Keeping this version in source preserves local/remote migration history parity
-- without replaying an older implementation ahead of the consolidated version.
select 1;
