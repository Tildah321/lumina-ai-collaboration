-- Drop and recreate the function to refresh the schema cache
DROP FUNCTION IF EXISTS public.get_spaces_for_collaborator_by_token(text);

-- Recreate the function with proper schema refresh
CREATE OR REPLACE FUNCTION public.get_spaces_for_collaborator_by_token(p_invitation_token text)
RETURNS TABLE(
  id uuid,
  space_id text,
  permissions text[],
  granted_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  coll_id uuid;
BEGIN
  -- Find collaborator by invitation token (accepted or pending)
  SELECT c.id INTO coll_id
  FROM public.collaborators c
  WHERE c.invitation_token = p_invitation_token
    AND c.status IN ('accepted', 'pending');

  IF coll_id IS NULL THEN
    RETURN; -- returns empty set
  END IF;

  -- Return only the spaces assigned to this collaborator
  RETURN QUERY
  SELECT sc.id, sc.space_id, sc.permissions, sc.granted_by, sc.created_at, sc.updated_at
  FROM public.space_collaborators sc
  WHERE sc.collaborator_id = coll_id;
END;
$$;

-- Grant permissions again
GRANT EXECUTE ON FUNCTION public.get_spaces_for_collaborator_by_token(text) TO anon, authenticated;