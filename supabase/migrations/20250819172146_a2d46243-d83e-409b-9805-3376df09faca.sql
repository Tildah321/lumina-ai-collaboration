-- Create mapping table to scope NocoDB spaces per Supabase user
create table if not exists public.noco_space_owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  space_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, space_id)
);

alter table public.noco_space_owners enable row level security;

-- Policies: users can manage only their own mappings
create policy "Users can select own mappings"
  on public.noco_space_owners
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own mappings"
  on public.noco_space_owners
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own mappings"
  on public.noco_space_owners
  for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_noco_space_owners_user on public.noco_space_owners(user_id);
create index if not exists idx_noco_space_owners_space on public.noco_space_owners(space_id);