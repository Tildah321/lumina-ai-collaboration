-- Créer la table pour les paramètres de branding utilisateur
CREATE TABLE public.user_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT,
  brand_color TEXT DEFAULT '#895af6',
  payment_link TEXT,
  message_link TEXT,
  meeting_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_branding ENABLE ROW LEVEL SECURITY;

-- Create policies for user branding
CREATE POLICY "Users can view their own branding" 
ON public.user_branding 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own branding" 
ON public.user_branding 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own branding" 
ON public.user_branding 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own branding" 
ON public.user_branding 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_branding_updated_at
BEFORE UPDATE ON public.user_branding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint to ensure one branding per user
ALTER TABLE public.user_branding ADD CONSTRAINT unique_user_branding UNIQUE (user_id);