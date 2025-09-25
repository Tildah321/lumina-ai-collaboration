-- Allow unauthenticated clients to call the RPC
GRANT EXECUTE ON FUNCTION public.get_spaces_for_collaborator_by_token(p_invitation_token text)
TO anon, authenticated;