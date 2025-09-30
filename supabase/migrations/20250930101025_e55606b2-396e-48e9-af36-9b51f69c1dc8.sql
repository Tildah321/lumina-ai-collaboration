-- Créer la table pour gérer les webhooks configurés par l'utilisateur
CREATE TABLE public.webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  endpoint_key TEXT NOT NULL UNIQUE, -- clé unique pour identifier le webhook
  secret_token TEXT, -- token secret optionnel pour sécuriser le webhook
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer la table pour stocker les notifications reçues
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  webhook_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB, -- données additionnelles du webhook
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur les deux tables
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour webhooks
CREATE POLICY "Users can manage their own webhooks" 
ON public.webhooks 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger pour updated_at sur webhooks
CREATE TRIGGER update_webhooks_updated_at
BEFORE UPDATE ON public.webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX idx_webhooks_user_id ON public.webhooks(user_id);
CREATE INDEX idx_webhooks_endpoint_key ON public.webhooks(endpoint_key);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_webhook_id ON public.notifications(webhook_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);