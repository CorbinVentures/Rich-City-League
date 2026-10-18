# Connected Runs rewards

Runs World now connects verified game receipts, exploration/community objectives, earned milestone banners, and the existing REP Exchange.

- World and My Player: replay the last ten verified games with exact base World XP (120/game, 60/win, 25/first court), credited match REP, match-linked badges, crown history and resolved crew territory winners. No estimated spendable awards. Separately reviewed box-score REP remains in the Exchange ledger.
- Missions: two verified courts, three distinct teammates, and one participated-in resolved crew battle per Virginia week, plus per-court game/win progress and links to existing ladders.
- Vault: equip six existing milestone banners and choose an available Exchange reward as a persistent savings goal. Banners render inside Runs World and My Player, not global profiles. Reward redemption continues through the existing Exchange.
- Guest users do not receive private expansion data. Server validates milestone ownership, catalog availability and auth identity before cosmetic preference changes. No direct client writes to loadouts.
- Existing double REP remains unchanged; this release does not introduce double World XP, partner-funded prizes, new rank rules, new territory awards, or live player tracking.

## Validation
Run type-check, lint, build and Vitest. Apply the migration in a test database, then run `scripts/validation/runs_world_expansion_checks.sql` (transaction rolls back). The validation checks private empty results, no unearned crown cosmetic, guest RPC denial, and direct write denial. Production schema dry-run and these assertions passed together in a rollback transaction.
