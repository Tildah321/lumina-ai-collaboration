-- Ensure pgcrypto is available in the extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Fix password hashing to use functions from the extensions schema
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  salt text;
BEGIN
  -- Generate a random salt using pgcrypto in the extensions schema
  salt := encode(extensions.gen_random_bytes(16), 'hex');
  -- Return salt + hash using digest from the extensions schema
  RETURN salt || ':' || encode(extensions.digest(salt || password, 'sha256'), 'hex');
END;
$$;

-- Fix password verification to use functions from the extensions schema
CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  salt text;
  stored_hash text;
  computed_hash text;
BEGIN
  -- Extract salt and hash
  salt := split_part(hash, ':', 1);
  stored_hash := split_part(hash, ':', 2);
  
  -- Compute hash with extracted salt using digest from extensions schema
  computed_hash := encode(extensions.digest(salt || password, 'sha256'), 'hex');
  
  -- Compare hashes
  RETURN computed_hash = stored_hash;
END;
$$;