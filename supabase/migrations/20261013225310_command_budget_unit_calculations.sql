-- Quantified, reusable budget template lines; never store a guessed quantity or rate.
alter table public.rcl_command_budgets
 add column if not exists units numeric(12,2) check (units is null or units >= 0),
 add column if not exists unit_price numeric(12,2) check (unit_price is null or unit_price >= 0);
alter table public.rcl_command_budgets
 add constraint rcl_command_budget_quantity_matches_total
 check (
  (units is null and unit_price is null) or
  (units is not null and unit_price is not null and
   planned_amount = round(units * unit_price,2))
 );
comment on column public.rcl_command_budgets.units is
 'Optional quantity: uniforms, games, booked gym hours, or service units. When entered, unit_price is also required.';
comment on column public.rcl_command_budgets.unit_price is
 'Optional approved dollar cost per unit. Total budget must equal quantity times this rate.';
