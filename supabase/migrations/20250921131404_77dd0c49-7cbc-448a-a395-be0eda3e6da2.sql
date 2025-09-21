-- Drop the problematic policy that exposes sensitive data
DROP POLICY IF EXISTS "Collaborators can view their own record only" ON public.collaborators;

-- Create a secure function to get collaborator info without sensitive data
CREATE OR REPLACE FUNCTION public.get_collaborator_safe_info(p_collaborator_id uuid DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  status text,
  invited_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.email,
    c.name,
    c.role,
    c.status,
    c.invited_by,
    c.created_at,
    c.updated_at
  FROM public.collaborators c
  WHERE 
    (p_collaborator_id IS NOT NULL AND c.id = p_collaborator_id) OR
    (p_email IS NOT NULL AND c.email = p_email AND c.status = 'accepted');
END;
$$;

-- Create a function for authenticated users to get their own collaborator info
CREATE OR REPLACE FUNCTION public.get_my_collaborator_info()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  status text,
  invited_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get the authenticated user's email
  SELECT auth.email() INTO user_email;
  
  IF user_email IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.email,
    c.name,
    c.role,
    c.status,
    c.invited_by,
    c.created_at,
    c.updated_at
  FROM public.collaborators c
  WHERE c.email = user_email AND c.status = 'accepted';
END;
$$;