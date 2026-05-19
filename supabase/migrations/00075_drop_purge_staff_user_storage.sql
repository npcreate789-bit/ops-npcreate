-- Supabase blocks direct DELETE on storage.objects; purge via Storage API only.

DROP FUNCTION IF EXISTS public.purge_staff_user_storage(UUID);
