-- Add CRM access field to collaborators table
ALTER TABLE public.collaborators 
ADD COLUMN has_crm_access BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.collaborators.has_crm_access IS 'Permet au collaborateur d''accéder au CRM (prospects, clients, dashboard)';