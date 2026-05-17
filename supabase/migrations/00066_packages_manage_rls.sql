-- จัดการแพ็กเกจบริการ (ข้อมูลใบเสนอราคา) — sales + privileged

CREATE POLICY packages_insert ON public.packages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_privileged()
    OR public.has_role('sales')
  );

CREATE POLICY packages_update ON public.packages
  FOR UPDATE TO authenticated
  USING (
    public.is_privileged()
    OR public.has_role('sales')
  )
  WITH CHECK (
    public.is_privileged()
    OR public.has_role('sales')
  );
