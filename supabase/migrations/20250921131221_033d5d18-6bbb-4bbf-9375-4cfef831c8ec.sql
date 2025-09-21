-- Create a secure view for collaborators that excludes sensitive fields
CREATE OR REPLACE VIEW public.collaborators_secure AS
SELECT 
  id,
  email,
  name,
  role,
  status,
  invited_by,
  created_at,
  updated_at
FROM public.collaborators;

-- Grant access to the view
GRANT SELECT ON public.collaborators_secure TO authenticated;
GRANT SELECT ON public.collaborators_secure TO anon;

-- Enable RLS on the view
ALTER VIEW public.collaborators_secure SET (security_barrier = true);

-- Create RLS policies for the secure view
CREATE POLICY "Users can view collaborators they invited (secure)"
ON public.collaborators_secure
FOR SELECT
TO authenticated
USING (invited_by = auth.uid());

CREATE POLICY "Collaborators can view their own record (secure)"
ON public.collaborators_secure  
FOR SELECT
TO authenticated
USING (email = auth.email() AND status = 'accepted');

-- Drop the problematic policy that exposes sensitive data
DROP POLICY IF EXISTS "Collaborators can view their own record only" ON public.collaborators;

-- Update the existing policy to be more restrictive - only allow invited_by to see full records
CREATE POLICY "Only inviters can view full collaborator records"
ON public.collaborators
FOR SELECT
TO authenticated
USING (invited_by = auth.uid());

-- Create a security definer function for collaborator authentication that doesn't expose sensitive data
CREATE OR REPLACE FUNCTION public.get_collaborator_info(p_invitation_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collaborator_record public.collaborators;
BEGIN
  -- Input validation
  IF p_invitation_token IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Token manquant');
  END IF;
  
  -- Find the collaborator by token (only return non-sensitive info)
  SELECT * INTO collaborator_record
  FROM public.collaborators
  WHERE invitation_token = p_invitation_token;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token invalide');
  END IF;
  
  -- Return only safe information
  RETURN json_build_object(
    'success', true,
    'collaborator', json_build_object(
      'id', collaborator_record.id,
      'name', collaborator_record.name,
      'role', collaborator_record.role,
      'status', collaborator_record.status,
      'hasPassword', (collaborator_record.password_hash IS NOT NULL)
    )
  );
END;
$$;