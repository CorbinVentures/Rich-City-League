
BEGIN;
CREATE TABLE IF NOT EXISTS public.rch_field_sites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9-]{5,80}$'),
 territory text NOT NULL CHECK (territory IN ('richmond','henrico','chesterfield','short-pump','glen-allen')),
 name text NOT NULL CHECK (length(name) BETWEEN 3 AND 150),
 category text NOT NULL DEFAULT 'Court',
 allocation integer NOT NULL DEFAULT 0 CHECK (allocation BETWEEN 0 AND 100000),
 permission text NOT NULL DEFAULT 'not-requested' CHECK (permission IN ('not-requested','requested','approved','denied')),
 status text NOT NULL DEFAULT 'scout' CHECK (status IN ('scout','active','paused','completed')),
 owner text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '',
 priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rch_field_drops (
 id uuid PRIMARY KEY,
 site_id uuid NOT NULL REFERENCES public.rch_field_sites(id),
 at timestamptz NOT NULL,
 agent text NOT NULL CHECK (length(agent) BETWEEN 1 AND 80),
 flyers integer NOT NULL CHECK (flyers BETWEEN 0 AND 10000),
 conversations integer NOT NULL CHECK (conversations BETWEEN 0 AND 10000),
 assisted_signups integer NOT NULL CHECK (assisted_signups BETWEEN 0 AND 10000),
 note text NOT NULL DEFAULT '',
 created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rch_field_drops_site_at_idx ON public.rch_field_drops(site_id,at DESC);
CREATE TABLE IF NOT EXISTS public.rch_field_qr_daily (
 site_id uuid NOT NULL REFERENCES public.rch_field_sites(id),
 metric_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
 hits bigint NOT NULL DEFAULT 0 CHECK (hits >= 0),
 PRIMARY KEY(site_id,metric_date)
);
CREATE OR REPLACE FUNCTION public.rch_field_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND is_active IS DISTINCT FROM false) $$;
REVOKE ALL ON FUNCTION public.rch_field_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rch_field_admin() TO authenticated;
ALTER TABLE public.rch_field_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rch_field_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rch_field_qr_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "field_admin_sites" ON public.rch_field_sites;
CREATE POLICY "field_admin_sites" ON public.rch_field_sites FOR ALL TO authenticated USING (public.rch_field_admin()) WITH CHECK (public.rch_field_admin());
DROP POLICY IF EXISTS "field_admin_drops" ON public.rch_field_drops;
CREATE POLICY "field_admin_drops" ON public.rch_field_drops FOR ALL TO authenticated USING (public.rch_field_admin()) WITH CHECK (public.rch_field_admin() AND created_by=auth.uid());
DROP POLICY IF EXISTS "field_admin_qr" ON public.rch_field_qr_daily;
CREATE POLICY "field_admin_qr" ON public.rch_field_qr_daily FOR SELECT TO authenticated USING (public.rch_field_admin());
REVOKE ALL ON public.rch_field_sites, public.rch_field_drops, public.rch_field_qr_daily FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rch_field_sites, public.rch_field_drops TO authenticated;
GRANT SELECT ON public.rch_field_qr_daily TO authenticated;
CREATE OR REPLACE FUNCTION public.rch_track_field_qr(p_code text)
RETURNS TABLE(territory text, code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_territory text; v_code text;
BEGIN
 SELECT s.id,s.territory,s.code INTO v_id,v_territory,v_code
 FROM public.rch_field_sites s WHERE s.code=p_code;
 IF v_id IS NULL THEN RETURN; END IF;
 INSERT INTO public.rch_field_qr_daily(site_id,metric_date,hits)
 VALUES(v_id,(now() AT TIME ZONE 'UTC')::date,1)
 ON CONFLICT(site_id,metric_date) DO UPDATE SET hits=public.rch_field_qr_daily.hits+1;
 territory:=v_territory; code:=v_code; RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.rch_track_field_qr(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rch_track_field_qr(text) TO anon,authenticated;
INSERT INTO public.rch_field_sites (code,territory,name,category,allocation,priority) VALUES
('rch-richmond-01','richmond','Pine Camp','Public courts',100,'high'),
('rch-richmond-02','richmond','Randolph Park','Public courts',100,'high'),
('rch-richmond-03','richmond','Battery Park','Public courts',75,'medium'),
('rch-richmond-04','richmond','Lucks Field Park','Public courts',75,'medium'),
('rch-henrico-01','henrico','Eastern Henrico Recreation Center','Recreation center',100,'high'),
('rch-henrico-02','henrico','RockIt Sports','Private gym',75,'high'),
('rch-henrico-03','henrico','Henrico trainer partner','Trainer outreach',25,'medium'),
('rch-chesterfield-01','chesterfield','Rockwood Park','Public courts',75,'high'),
('rch-chesterfield-02','chesterfield','Cogbill Park','Public courts',50,'medium'),
('rch-chesterfield-03','chesterfield','Chesterfield court target 3','Scout first',50,'medium'),
('rch-chesterfield-04','chesterfield','Chesterfield facility partner','Partner approval',25,'medium'),
('rch-shortpump-01','short-pump','Deep Run Park','Recreation courts',75,'high'),
('rch-shortpump-02','short-pump','West End gym partner','Partner approval',25,'medium'),
('rch-glenallen-01','glen-allen','Henrico Sports & Events Center','Tournament venue',100,'high'),
('rch-glenallen-02','glen-allen','Glen Allen court/gym partners','Scout first',50,'medium')
ON CONFLICT(code) DO NOTHING;
COMMIT;