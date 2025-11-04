-- Add webhook_type column to webhooks table
ALTER TABLE public.webhooks 
ADD COLUMN webhook_type text NOT NULL DEFAULT 'notification';

-- Add a comment to describe the column
COMMENT ON COLUMN public.webhooks.webhook_type IS 'Type of webhook: notification or create_client';