-- Mise à jour pour utiliser la fonction hash_password lors de l'insertion
-- Cette fonction sera appelée depuis le code JavaScript via RPC

CREATE OR REPLACE FUNCTION public.create_collaborator_invitation(
  p_name text,
  p_role text,
  p_invitation_token text,
  p_password text,
  p_invited_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  collaborator_record public.collaborators;
BEGIN
  -- Input validation
  IF p_name IS NULL OR p_role IS NULL OR p_invitation_token IS NULL OR p_password IS NULL OR p_invited_by IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Paramètres manquants');
  END IF;
  
  IF length(p_name) < 2 OR length(p_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Nom minimum 2 caractères, mot de passe minimum 6 caractères');
  END IF;
  
  -- Insert collaborator with hashed password
  INSERT INTO public.collaborators (
    name,
    role,
    invitation_token,
    status,
    invited_by,
    password_hash
  ) VALUES (
    p_name,
    p_role,
    p_invitation_token,
    'pending',
    p_invited_by,
    public.hash_password(p_password)
  )
  RETURNING * INTO collaborator_record;
  
  RETURN json_build_object(
    'success', true,
    'collaborator', json_build_object(
      'id', collaborator_record.id,
      'name', collaborator_record.name,
      'role', collaborator_record.role,
      'status', collaborator_record.status,
      'invitation_token', collaborator_record.invitation_token,
      'created_at', collaborator_record.created_at
    )
  );
END;
$function$;