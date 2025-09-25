-- Créer une fonction pour la connexion réutilisable des collaborateurs
CREATE OR REPLACE FUNCTION public.verify_collaborator_login(p_invitation_token text, p_name text, p_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  collaborator_record public.collaborators;
  is_valid BOOLEAN := false;
BEGIN
  -- Input validation
  IF p_invitation_token IS NULL OR p_name IS NULL OR p_password IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Paramètres manquants');
  END IF;
  
  IF length(p_name) < 2 OR length(p_password) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Nom ou mot de passe trop court');
  END IF;
  
  -- Find the collaborator by token and name (accept both pending and accepted status for login)
  SELECT * INTO collaborator_record
  FROM public.collaborators
  WHERE invitation_token = p_invitation_token 
    AND name = p_name 
    AND status IN ('pending', 'accepted');
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Identifiants incorrects ou accès non autorisé');
  END IF;
  
  -- Verify password using proper hashing
  IF collaborator_record.password_hash IS NOT NULL AND public.verify_password(p_password, collaborator_record.password_hash) THEN
    is_valid := true;
    
    -- Auto-accept if status is still pending (first login)
    IF collaborator_record.status = 'pending' THEN
      UPDATE public.collaborators
      SET status = 'accepted', updated_at = now()
      WHERE id = collaborator_record.id;
      
      -- Update the record for return
      collaborator_record.status := 'accepted';
    END IF;
  END IF;
  
  IF is_valid THEN
    RETURN json_build_object(
      'success', true, 
      'collaborator', json_build_object(
        'id', collaborator_record.id,
        'name', collaborator_record.name,
        'role', collaborator_record.role,
        'status', collaborator_record.status,
        'invitation_token', collaborator_record.invitation_token
      )
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Mot de passe incorrect');
  END IF;
END;
$function$;