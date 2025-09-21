-- Créer une table pour gérer les collaborateurs
CREATE TABLE public.collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'collaborateur', -- admin, collaborateur
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  invitation_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer une table pour les permissions d'accès aux espaces
CREATE TABLE public.space_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id TEXT NOT NULL,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['read'], -- read, write, admin
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(space_id, collaborator_id)
);

-- Enable Row Level Security
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_collaborators ENABLE ROW LEVEL SECURITY;

-- Policies pour collaborators
CREATE POLICY "Users can view collaborators they invited or are themselves" 
ON public.collaborators 
FOR SELECT 
USING (auth.uid() = invited_by OR auth.uid()::text = email);

CREATE POLICY "Users can invite collaborators" 
ON public.collaborators 
FOR INSERT 
WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Users can update collaborators they invited" 
ON public.collaborators 
FOR UPDATE 
USING (auth.uid() = invited_by);

CREATE POLICY "Users can delete collaborators they invited" 
ON public.collaborators 
FOR DELETE 
USING (auth.uid() = invited_by);

-- Policies pour space_collaborators
CREATE POLICY "Users can view space permissions they granted or have access to" 
ON public.space_collaborators 
FOR SELECT 
USING (
  auth.uid() = granted_by OR 
  EXISTS (
    SELECT 1 FROM public.collaborators c 
    WHERE c.id = collaborator_id 
    AND c.email = auth.email()
    AND c.status = 'accepted'
  )
);

CREATE POLICY "Users can grant space access" 
ON public.space_collaborators 
FOR INSERT 
WITH CHECK (auth.uid() = granted_by);

CREATE POLICY "Users can update permissions they granted" 
ON public.space_collaborators 
FOR UPDATE 
USING (auth.uid() = granted_by);

CREATE POLICY "Users can revoke permissions they granted" 
ON public.space_collaborators 
FOR DELETE 
USING (auth.uid() = granted_by);

-- Créer des triggers pour les timestamps
CREATE TRIGGER update_collaborators_updated_at
BEFORE UPDATE ON public.collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_space_collaborators_updated_at
BEFORE UPDATE ON public.space_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();