BEGIN;
DROP POLICY IF EXISTS "public_field_qr_codes" ON public.rch_field_sites;
CREATE POLICY "public_field_qr_codes" ON public.rch_field_sites FOR SELECT TO anon USING (true);
GRANT SELECT(code,territory) ON public.rch_field_sites TO anon;
COMMIT;