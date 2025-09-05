-- Create user plans table to manage subscription tiers
CREATE TABLE public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
  active_spaces_count INTEGER NOT NULL DEFAULT 0,
  ai_tokens_used_today INTEGER NOT NULL DEFAULT 0,
  ai_tokens_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own plan" 
ON public.user_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own plan" 
ON public.user_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plan" 
ON public.user_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to automatically create a free plan for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan_type)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create plan on user signup
CREATE TRIGGER on_auth_user_created_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();

-- Create function to reset AI tokens daily
CREATE OR REPLACE FUNCTION public.reset_daily_ai_tokens()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_plans 
  SET 
    ai_tokens_used_today = 0,
    ai_tokens_reset_date = CURRENT_DATE,
    updated_at = now()
  WHERE ai_tokens_reset_date < CURRENT_DATE;
END;
$$;

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_plans_updated_at
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();