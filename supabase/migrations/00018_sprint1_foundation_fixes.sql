-- Sprint 1 fixes: profiles updated_at, grants on auth helpers

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_privileged() TO authenticated;
