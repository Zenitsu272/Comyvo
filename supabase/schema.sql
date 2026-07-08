-- ============================================================
-- Commuto Database Schema
-- Run this in your Supabase SQL editor after project creation
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('student', 'premium', 'admin');
create type pool_status as enum ('active', 'full', 'cancelled', 'completed');
create type contact_visibility as enum ('always', 'premium_only', 'after_join');
create type report_status as enum ('open', 'reviewed', 'resolved', 'dismissed');

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text,
  roll_number   text unique,
  phone         text,
  is_phone_verified boolean default false,
  department    text,
  campus        text default 'Coimbatore',
  gender        text, -- 'male' | 'female' | 'other' | null
  year_of_joining int,
  role          user_role default 'student',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Trigger: update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute function update_updated_at();

-- ============================================================
-- POOLS
-- ============================================================
create table public.pools (
  id                  uuid primary key default uuid_generate_v4(),
  host_id             uuid not null references public.users(id) on delete cascade,
  from_location       text not null,
  to_location         text not null,
  departure_at        timestamptz not null,
  total_seats         int not null check (total_seats between 1 and 8),
  available_seats     int not null,
  cost_per_person     numeric(8,2) not null,
  notes               text,
  via_route           text, -- e.g. "Gandhipuram, Singanallur"
  luggage_capacity    text not null default 'any', -- 'any' | 'backpacks' | 'trolleys'
  car_type            text not null default 'sedan', -- 'auto' | 'sedan' | 'suv'
  campus              text not null default 'Coimbatore',
  women_only          boolean default false,
  contact_visibility  contact_visibility default 'after_join',
  status              pool_status default 'active',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),

  constraint seats_valid check (available_seats between 0 and total_seats)
);

create trigger pools_updated_at
  before update on public.pools
  for each row execute function update_updated_at();

create index pools_departure_idx on public.pools(departure_at);
create index pools_status_idx on public.pools(status);
create index pools_campus_idx on public.pools(campus);

-- ============================================================
-- POOL MEMBERS
-- ============================================================
create table public.pool_members (
  id        uuid primary key default uuid_generate_v4(),
  pool_id   uuid not null references public.pools(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  seat_no   int not null, -- 1-indexed seat position
  joined_at timestamptz default now(),
  unique(pool_id, user_id),
  unique(pool_id, seat_no) -- ensure no two riders book the same seat
);

-- Trigger: decrement available_seats on join
create or replace function decrement_seats()
returns trigger as $$
begin
  update public.pools
  set available_seats = available_seats - 1
  where id = new.pool_id;

  -- Mark full if 0 seats remain
  update public.pools
  set status = 'full'
  where id = new.pool_id and available_seats = 0;

  return new;
end;
$$ language plpgsql;

create trigger on_member_join
  after insert on public.pool_members
  for each row execute function decrement_seats();

-- Trigger: increment available_seats on leave
create or replace function increment_seats()
returns trigger as $$
begin
  update public.pools
  set
    available_seats = available_seats + 1,
    status = case when status = 'full' then 'active' else status end
  where id = old.pool_id;
  return old;
end;
$$ language plpgsql;

create trigger on_member_leave
  after delete on public.pool_members
  for each row execute function increment_seats();

-- ============================================================
-- REPORTS
-- ============================================================
create table public.reports (
  id              uuid primary key default uuid_generate_v4(),
  reporter_id     uuid not null references public.users(id),
  reported_user_id uuid references public.users(id),
  pool_id         uuid references public.pools(id),
  reason          text not null,
  status          report_status default 'open',
  admin_note      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger reports_updated_at
  before update on public.reports
  for each row execute function update_updated_at();

-- ============================================================
-- DISCUSSION BOARD (COMMENTS)
-- ============================================================
create table public.comments (
  id          uuid primary key default uuid_generate_v4(),
  pool_id     uuid not null references public.pools(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  message     text not null,
  created_at  timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.pools enable row level security;
alter table public.pool_members enable row level security;
alter table public.reports enable row level security;

-- USERS policies
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Admins can read all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- POOLS policies
create policy "Anyone authenticated can read active pools"
  on public.pools for select
  using (auth.uid() is not null and status in ('active', 'full'));

create policy "Host can manage own pools"
  on public.pools for all
  using (auth.uid() = host_id);

create policy "Authenticated users can create pools"
  on public.pools for insert
  with check (auth.uid() = host_id);

-- POOL_MEMBERS policies
create policy "Members can see pool memberships"
  on public.pool_members for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.pools p
      where p.id = pool_id and p.host_id = auth.uid()
    )
  );

create policy "Users can join pools"
  on public.pool_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave pools"
  on public.pool_members for delete
  using (auth.uid() = user_id);

-- REPORTS policies
create policy "Users can submit reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "Users can see own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

create policy "Admins can manage all reports"
  on public.reports for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- COMMENTS policies
alter table public.comments enable row level security;

create policy "Members and hosts can view discussion"
  on public.comments for select
  using (
    exists (
      select 1 from public.pools p
      where p.id = pool_id and p.host_id = auth.uid()
    ) or exists (
      select 1 from public.pool_members pm
      where pm.pool_id = pool_id and pm.user_id = auth.uid()
    )
  );

create policy "Members and hosts can post comments"
  on public.comments for insert
  with check (
    auth.uid() = user_id and (
      exists (
        select 1 from public.pools p
        where p.id = pool_id and p.host_id = auth.uid()
      ) or exists (
        select 1 from public.pool_members pm
        where pm.pool_id = pool_id and pm.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- Pool with host info and member count (phone masked by default)
create or replace view public.pools_public as
select
  p.id,
  p.from_location,
  p.to_location,
  p.departure_at,
  p.total_seats,
  p.available_seats,
  p.cost_per_person,
  p.notes,
  p.via_route,
  p.luggage_capacity,
  p.car_type,
  p.campus,
  p.women_only,
  p.contact_visibility,
  p.status,
  p.created_at,
  u.full_name as host_name,
  u.roll_number as host_roll,
  u.is_phone_verified as host_phone_verified,
  -- Phone masking: only show last 2 digits by default
  concat('********', right(u.phone, 2)) as host_phone_masked,
  p.host_id
from public.pools p
join public.users u on u.id = p.host_id
where p.departure_at >= now() - interval '2 hours';
