-- Add password_hash field to collaborators table
ALTER TABLE public.collaborators 
ADD COLUMN password_hash TEXT;

-- Drop the old function first
DROP FUNCTION IF EXISTS public.accept_invitation(text, text, text);

-- Create function to verify collaborator credentials
CREATE OR REPLACE FUNCTION public.verify_collaborator_credentials(
  p_invitation_token TEXT,
  p_name TEXT,
  p_password TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collaborator_record public.collaborators;
  is_valid BOOLEAN := false;
BEGIN
  -- Find the collaborator by token and name
  SELECT * INTO collaborator_record
  FROM public.collaborators
  WHERE invitation_token = p_invitation_token 
    AND name = p_name 
    AND status = 'accepted';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Collaborateur non trouvé ou invitation non acceptée');
  END IF;
  
  -- Check if password matches (simple base64 comparison for now)
  IF collaborator_record.password_hash = encode(p_password::bytea, 'base64') THEN
    is_valid := true;
  END IF;
  
  IF is_valid THEN
    RETURN json_build_object(
      'success', true, 
      'collaborator', json_build_object(
        'id', collaborator_record.id,
        'name', collaborator_record.name,
        'role', collaborator_record.role,
        'invitation_token', collaborator_record.invitation_token
      )
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Mot de passe incorrect');
  END IF;
END;
$$;

-- Create new accept_invitation function with password
CREATE OR REPLACE FUNCTION public.accept_invitation(
  token TEXT, 
  user_name TEXT, 
  user_password TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collaborator_record public.collaborators;
BEGIN
  -- Find the invitation
  SELECT * INTO collaborator_record
  FROM public.collaborators
  WHERE invitation_token = token AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token d''invitation invalide ou expiré');
  END IF;
  
  -- Update the collaborator record with name, password and status
  UPDATE public.collaborators
  SET 
    name = user_name,
    password_hash = encode(user_password::bytea, 'base64'),
    status = 'accepted',
    updated_at = now()
  WHERE id = collaborator_record.id;
  
  RETURN json_build_object('success', true, 'collaborator_id', collaborator_record.id);
END;
$$;

-- Create function to update collaborator password
CREATE OR REPLACE FUNCTION public.update_collaborator_password(
  collaborator_id UUID,
  new_password TEXT,
  requester_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collaborator_record public.collaborators;
BEGIN
  -- Check if the requester is the one who invited this collaborator
  SELECT * INTO collaborator_record
  FROM public.collaborators
  WHERE id = collaborator_id AND invited_by = requester_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé à modifier ce collaborateur');
  END IF;
  
  -- Update password
  UPDATE public.collaborators
  SET 
    password_hash = encode(new_password::bytea, 'base64'),
    updated_at = now()
  WHERE id = collaborator_id;
  
  RETURN json_build_object('success', true);
END;
$$;