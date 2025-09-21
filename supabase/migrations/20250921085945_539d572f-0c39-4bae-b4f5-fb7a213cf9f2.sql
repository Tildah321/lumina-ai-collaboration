-- Fix the remaining function that still needs search_path
CREATE OR REPLACE FUNCTION public.accept_invitation(token TEXT, user_email TEXT, user_name TEXT DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collaborator_record public.collaborators;
  result json;
BEGIN
  -- Find the invitation
  SELECT * INTO collaborator_record
  FROM public.collaborators
  WHERE invitation_token = token AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation token');
  END IF;
  
  -- Update the collaborator record
  UPDATE public.collaborators
  SET 
    email = user_email,
    name = COALESCE(user_name, name),
    status = 'accepted',
    updated_at = now()
  WHERE id = collaborator_record.id;
  
  RETURN json_build_object('success', true, 'collaborator_id', collaborator_record.id);
END;
$$;