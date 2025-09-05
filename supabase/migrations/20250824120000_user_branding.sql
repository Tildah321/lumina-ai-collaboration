-- Create user_branding table for storing branding preferences per user
create table if not exists public.user_branding (
  user_id uuid primary key references auth.users(id),
  company_name text,
  primary_color text,
  secondary_color text,
  logo_url text,
  created_at timestamptz not null default now()
);

alter table public.user_branding enable row level security;

-- Policies: users can manage only their own branding data
create policy "Users can view own branding" on public.user_branding
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own branding" on public.user_branding
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own branding" on public.user_branding
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own branding" on public.user_branding
  for delete
  to authenticated
  using (auth.uid() = user_id);
