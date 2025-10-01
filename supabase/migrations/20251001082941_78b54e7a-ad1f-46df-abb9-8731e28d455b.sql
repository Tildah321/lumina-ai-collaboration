-- Ajouter la contrainte de clé étrangère entre notifications et webhooks
ALTER TABLE public.notifications 
ADD CONSTRAINT fk_notifications_webhook_id 
FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id) ON DELETE SET NULL;