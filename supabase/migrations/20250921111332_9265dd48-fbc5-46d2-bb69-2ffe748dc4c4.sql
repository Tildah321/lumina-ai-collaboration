-- Fix critical security vulnerabilities

-- 1. Fix collaborator RLS policy to prevent data exposure
DROP POLICY IF EXISTS "Users can view collaborators they invited or accepted via token" ON public.collaborators;

-- Create more secure policies
CREATE POLICY "Users can view collaborators they invited" 
ON public.collaborators 
FOR SELECT 
USING (auth.uid() = invited_by);

CREATE POLICY "Collaborators can view their own record only" 
ON public.collaborators 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND email = auth.email() AND status = 'accepted');

-- 2. Create proper password hashing functions (replacing insecure base64)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Secure password hashing function
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT crypt(password, gen_salt('bf', 12));
$$;

-- Secure password verification function
CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT crypt(password, hash) = hash;
$$;

-- 3. Update collaborator verification function with proper security
CREATE OR REPLACE FUNCTION public.verify_collaborator_credentials(p_invitation_token text, p_name text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collaborator_record public.collaborators;
  is_valid BOOLEAN := false;
BEGIN
  -- Input validation
  IF p_invitation_token IS NULL OR p_name IS NULL OR p_password IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Paramètres manquants');
  END IF;
  
  IF length(p_name) < 2 OR length(p_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Nom ou mot de passe trop court');
  END IF;
  
  -- Find the collaborator by token and name
  SELECT * INTO collaborator_record
  FROM public.collaborators
  WHERE invitation_token = p_invitation_token 
    AND name = p_name 
    AND status = 'accepted';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Collaborateur non trouvé ou invitation non acceptée');
  END IF;
  
  -- Verify password using proper hashing
  IF collaborator_record.password_hash IS NOT NULL AND public.verify_password(p_password, collaborator_record.password_hash) THEN
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

-- 4. Update accept invitation function with proper security
CREATE OR REPLACE FUNCTION public.accept_invitation(token text, user_name text, user_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collaborator_record public.collaborators;
BEGIN
  -- Input validation
  IF token IS NULL OR user_name IS NULL OR user_password IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Paramètres manquants');
  END IF;
  
  IF length(user_name) < 2 OR length(user_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Nom minimum 2 caractères, mot de passe minimum 6 caractères');
  END IF;
  
  -- Find the invitation
  SELECT * INTO collaborator_record
  FROM public.collaborators
  WHERE invitation_token = token AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Token d''invitation invalide ou expiré');
  END IF;
  
  -- Update the collaborator record with secure password hash
  UPDATE public.collaborators
  SET 
    name = user_name,
    password_hash = public.hash_password(user_password),
    status = 'accepted',
    updated_at = now()
  WHERE id = collaborator_record.id;
  
  RETURN json_build_object('success', true, 'collaborator_id', collaborator_record.id);
END;
$$;

-- 5. Update password change function with proper security
CREATE OR REPLACE FUNCTION public.update_collaborator_password(collaborator_id uuid, new_password text, requester_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collaborator_record public.collaborators;
BEGIN
  -- Input validation
  IF collaborator_id IS NULL OR new_password IS NULL OR requester_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Paramètres manquants');
  END IF;
  
  IF length(new_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Le mot de passe doit contenir au moins 6 caractères');
  END IF;
  
  -- Check if the requester is the one who invited this collaborator
  SELECT * INTO collaborator_record
  FROM public.collaborators
  WHERE id = collaborator_id AND invited_by = requester_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Non autorisé à modifier ce collaborateur');
  END IF;
  
  -- Update password with proper hashing
  UPDATE public.collaborators
  SET 
    password_hash = public.hash_password(new_password),
    updated_at = now()
  WHERE id = collaborator_id;
  
  RETURN json_build_object('success', true);
END;
$$;

-- 6. Add rate limiting table for security
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  attempts integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action ON public.rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limits are managed by functions, no direct user access needed
CREATE POLICY "No direct access to rate_limits" ON public.rate_limits FOR ALL USING (false);

-- Clean up old rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '24 hours';
$$;