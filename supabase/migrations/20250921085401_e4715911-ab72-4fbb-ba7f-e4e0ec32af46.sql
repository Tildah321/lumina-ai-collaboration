-- Modify collaborators table to support link-based invitations instead of email
ALTER TABLE public.collaborators 
DROP CONSTRAINT IF EXISTS collaborators_email_key;

-- Make email nullable since we're using link-based invitations
ALTER TABLE public.collaborators 
ALTER COLUMN email DROP NOT NULL;

-- Update RLS policies to work with token-based access
DROP POLICY IF EXISTS "Users can view collaborators they invited or are themselves" ON public.collaborators;

CREATE POLICY "Users can view collaborators they invited or accepted via token" 
ON public.collaborators 
FOR SELECT 
USING (
  (auth.uid() = invited_by) OR 
  (status = 'accepted' AND email = auth.email())
);

-- Create a function to accept invitation via token
CREATE OR REPLACE FUNCTION public.accept_invitation(token TEXT, user_email TEXT, user_name TEXT DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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