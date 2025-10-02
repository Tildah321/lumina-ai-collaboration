-- Ajouter la politique RLS pour permettre aux utilisateurs de supprimer leurs propres notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);