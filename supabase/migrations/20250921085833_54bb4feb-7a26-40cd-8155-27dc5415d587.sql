-- Fix security warnings by setting proper search_path for functions

-- Fix the handle_new_user_plan function
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_plans (user_id, plan_type)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$function$;

-- Fix the reset_daily_ai_tokens function
CREATE OR REPLACE FUNCTION public.reset_daily_ai_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.user_plans 
  SET 
    ai_tokens_used_today = 0,
    ai_tokens_reset_date = CURRENT_DATE,
    updated_at = now()
  WHERE ai_tokens_reset_date < CURRENT_DATE;
END;
$function$;

-- Fix the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;