-- Comyvo production database baseline.
-- Safe to apply to a new project or the earlier prototype schema.

create extension if not exists pgcrypto;

do $$ begin create type public.user_role as enum ('student', 'premium', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.user_status as enum ('active', 'suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.pool_status as enum ('active', 'full', 'cancelled', 'completed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.contact_visibility as enum ('always', 'premium_only', 'after_join'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_status as enum ('open', 'reviewed', 'resolved', 'dismissed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.review_status as enum ('pending', 'approved', 'rejected'); exception when duplicate_object then null; end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  roll_number text unique,
  phone text,
  is_phone_verified boolean not null default false,
  department text,
  campus text default 'Coimbatore',
  gender text,
  year_of_joining integer,
  role public.user_role not null default 'student',
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.users add column if not exists status public.user_status not null default 'active';
update public.users set is_phone_verified = false where is_phone_verified is null;
update public.users set role = 'student' where role is null;
alter table public.users alter column is_phone_verified set default false;
alter table public.users alter column is_phone_verified set not null;
alter table public.users alter column role set default 'student';
alter table public.users alter column role set not null;

create table if not exists public.pools (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null constraint pools_host_id_fkey references public.users(id) on delete cascade,
  from_location text not null,
  to_location text not null,
  departure_at timestamptz not null,
  total_seats integer not null,
  available_seats integer not null,
  cost_per_person numeric(8,2) not null,
  notes text,
  via_route text,
  luggage_capacity text not null default 'any',
  car_type text not null default 'sedan',
  campus text not null default 'Coimbatore',
  women_only boolean not null default false,
  contact_visibility public.contact_visibility not null default 'after_join',
  status public.pool_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pool_members (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null constraint pool_members_pool_id_fkey references public.pools(id) on delete cascade,
  user_id uuid not null constraint pool_members_user_id_fkey references public.users(id) on delete cascade,
  seat_no integer not null,
  joined_at timestamptz not null default now(),
  unique(pool_id, user_id),
  unique(pool_id, seat_no)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null constraint reports_reporter_id_fkey references public.users(id) on delete cascade,
  reported_user_id uuid constraint reports_reported_user_id_fkey references public.users(id) on delete set null,
  pool_id uuid constraint reports_pool_id_fkey references public.pools(id) on delete set null,
  reason text not null,
  status public.report_status not null default 'open',
  admin_note text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reports add column if not exists reviewed_by uuid references public.users(id) on delete set null;
alter table public.reports add column if not exists reviewed_at timestamptz;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null constraint comments_pool_id_fkey references public.pools(id) on delete cascade,
  user_id uuid not null constraint comments_user_id_fkey references public.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.premium_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null constraint premium_requests_user_id_fkey references public.users(id) on delete cascade,
  status public.review_status not null default 'pending',
  note text,
  admin_note text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists one_pending_premium_request_per_user on public.premium_requests(user_id) where status = 'pending';

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.api_rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null,
  updated_at timestamptz not null default now()
);

update public.pools set total_seats = 2 where total_seats < 2;
update public.pools set women_only = false where women_only is null;
update public.pools set contact_visibility = 'after_join' where contact_visibility is null;
update public.pools set status = 'active' where status is null;
alter table public.pools alter column women_only set default false;
alter table public.pools alter column women_only set not null;
alter table public.pools alter column contact_visibility set default 'after_join';
alter table public.pools alter column contact_visibility set not null;
alter table public.pools alter column status set default 'active';
alter table public.pools alter column status set not null;

update public.reports set status = 'open' where status is null;
alter table public.reports alter column status set default 'open';
alter table public.reports alter column status set not null;

do $$ begin
  alter table public.users add constraint users_full_name_length check (full_name is null or char_length(full_name) between 2 and 80);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.users add constraint users_amrita_email check (lower(split_part(email, '@', 2)) ~ '(^|[.])amrita[.]edu$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.users add constraint users_roll_format check (roll_number is null or (char_length(roll_number) between 6 and 32 and roll_number ~ '^[A-Z0-9.-]+$'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.users add constraint users_phone_format check (phone is null or phone ~ '^[6-9][0-9]{9}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.users add constraint users_gender_values check (gender is null or gender in ('female', 'male', 'other'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.users add constraint users_year_range check (year_of_joining is null or year_of_joining between 1990 and 2100);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.pools add constraint pools_seat_range check (total_seats between 2 and 8 and available_seats between 0 and total_seats - 1) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.pools add constraint pools_cost_range check (cost_per_person between 0 and 10000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.pools add constraint pools_location_length check (char_length(from_location) between 2 and 120 and char_length(to_location) between 2 and 120);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.pools add constraint pools_vehicle_values check (car_type in ('auto', 'sedan', 'suv'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.pools add constraint pools_luggage_values check (luggage_capacity in ('any', 'backpacks', 'trolleys'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.pools add constraint pools_campus_values check (campus in ('Coimbatore','Chennai','Bengaluru','Kochi','Mysuru','Amritapuri'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.reports add constraint reports_reason_length check (char_length(reason) between 8 and 1000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.comments add constraint comments_message_length check (char_length(message) between 1 and 1000);
exception when duplicate_object then null; end $$;

create index if not exists pools_status_departure_idx on public.pools(status, departure_at);
create index if not exists pools_host_idx on public.pools(host_id);
create index if not exists pools_campus_idx on public.pools(campus);
create index if not exists pool_members_user_idx on public.pool_members(user_id);
create index if not exists reports_status_created_idx on public.reports(status, created_at desc);
create index if not exists comments_pool_created_idx on public.comments(pool_id, created_at);
create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists api_rate_limits_updated_idx on public.api_rate_limits(updated_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists pools_updated_at on public.pools;
create trigger pools_updated_at before update on public.pools for each row execute function public.set_updated_at();
drop trigger if exists reports_updated_at on public.reports;
create trigger reports_updated_at before update on public.reports for each row execute function public.set_updated_at();
drop trigger if exists premium_requests_updated_at on public.premium_requests;
create trigger premium_requests_updated_at before update on public.premium_requests for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or lower(split_part(new.email, '@', 2)) !~ '(^|[.])amrita[.]edu$' then
    return new;
  end if;
  insert into public.users (id, email) values (new.id, lower(new.email))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.is_active_user(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = p_user_id and status = 'active');
$$;
create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.users where id = p_user_id and role = 'admin' and status = 'active');
$$;

drop trigger if exists on_member_join on public.pool_members;
drop trigger if exists on_member_leave on public.pool_members;
drop function if exists public.decrement_seats();
drop function if exists public.increment_seats();

create or replace function public.reserve_pool_seat()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pool public.pools%rowtype; v_gender text;
begin
  select * into v_pool from public.pools where id = new.pool_id for update;
  if not found then raise exception 'Pool not found'; end if;
  if v_pool.host_id = new.user_id then raise exception 'Host cannot join own pool'; end if;
  if v_pool.status <> 'active' or v_pool.departure_at <= now() then raise exception 'Pool is not active'; end if;
  if v_pool.available_seats <= 0 then raise exception 'No seats available'; end if;
  if new.seat_no < 2 or new.seat_no > v_pool.total_seats then raise exception 'Invalid seat selection'; end if;
  select gender into v_gender from public.users where id = new.user_id and status = 'active' and full_name is not null and roll_number is not null;
  if not found then raise exception 'Complete profile required'; end if;
  if v_pool.women_only and v_gender is distinct from 'female' then raise exception 'Women-only pool'; end if;
  update public.pools set available_seats = available_seats - 1,
    status = case when available_seats - 1 = 0 then 'full'::public.pool_status else status end
    where id = new.pool_id;
  return new;
end;
$$;
create trigger on_member_join before insert on public.pool_members for each row execute function public.reserve_pool_seat();

create or replace function public.release_pool_seat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.pools set available_seats = least(total_seats - 1, available_seats + 1),
    status = case when status = 'full' and departure_at > now() then 'active'::public.pool_status else status end
    where id = old.pool_id;
  return old;
end;
$$;
create trigger on_member_leave after delete on public.pool_members for each row execute function public.release_pool_seat();

create or replace function public.join_pool(p_pool_id uuid, p_seat_no integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.pool_members(pool_id, user_id, seat_no) values (p_pool_id, auth.uid(), p_seat_no);
end;
$$;
create or replace function public.leave_pool(p_pool_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.pool_members where pool_id = p_pool_id and user_id = auth.uid();
  if not found then raise exception 'Membership not found'; end if;
end;
$$;

create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count integer; v_start timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 then raise exception 'Invalid rate limit'; end if;
  insert into public.api_rate_limits(key, window_started_at, request_count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_started_at = case when public.api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now() else public.api_rate_limits.window_started_at end,
    request_count = case when public.api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1 else public.api_rate_limits.request_count + 1 end,
    updated_at = now()
  returning request_count, window_started_at into v_count, v_start;
  return v_count <= p_limit;
end;
$$;

-- Reconcile prototype seat counters with the host occupying seat 1.
update public.pools p set available_seats = greatest(0, p.total_seats - 1 - (select count(*) from public.pool_members pm where pm.pool_id = p.id));
update public.pools set status = 'full' where status = 'active' and available_seats = 0;
alter table public.pools validate constraint pools_seat_range;

alter table public.users enable row level security;
alter table public.pools enable row level security;
alter table public.pool_members enable row level security;
alter table public.reports enable row level security;
alter table public.comments enable row level security;
alter table public.premium_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.api_rate_limits enable row level security;

do $$ declare item record; begin
  for item in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('users','pools','pool_members','reports','comments','premium_requests','audit_logs','api_rate_limits') loop
    execute format('drop policy if exists %I on %I.%I', item.policyname, item.schemaname, item.tablename);
  end loop;
end $$;

create policy users_read_self_or_admin on public.users for select to authenticated using (id = auth.uid() or public.is_admin());
create policy pools_read_allowed on public.pools for select to authenticated using (
  public.is_active_user() and (
    host_id = auth.uid() or public.is_admin() or
    (status in ('active','full') and (not women_only or exists(select 1 from public.users where id = auth.uid() and gender = 'female')))
  )
);
create policy memberships_read_participants on public.pool_members for select to authenticated using (
  user_id = auth.uid() or public.is_admin() or exists(select 1 from public.pools where id = pool_id and host_id = auth.uid())
);
create policy reports_read_self_or_admin on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy comments_read_participants on public.comments for select to authenticated using (
  public.is_admin() or exists(select 1 from public.pools where id = pool_id and host_id = auth.uid()) or exists(select 1 from public.pool_members where pool_id = comments.pool_id and user_id = auth.uid())
);
create policy premium_requests_read_self_or_admin on public.premium_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy audit_logs_read_admin on public.audit_logs for select to authenticated using (public.is_admin());

revoke all on public.users, public.pools, public.pool_members, public.reports, public.comments, public.premium_requests, public.audit_logs, public.api_rate_limits from anon, authenticated;
grant select on public.users, public.pools, public.pool_members, public.reports, public.comments, public.premium_requests, public.audit_logs to authenticated;
revoke all on function public.join_pool(uuid, integer), public.leave_pool(uuid), public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.join_pool(uuid, integer), public.leave_pool(uuid) to authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

drop view if exists public.pools_public;
create view public.pools_public with (security_barrier = true) as
select p.id, p.host_id, p.from_location, p.to_location, p.departure_at, p.total_seats, p.available_seats,
  p.cost_per_person, p.notes, p.via_route, p.luggage_capacity, p.car_type, p.campus, p.women_only,
  p.contact_visibility, p.status, p.created_at, u.full_name host_name, u.roll_number host_roll,
  u.is_phone_verified host_phone_verified,
  case when u.phone is null then 'Not provided' else '********' || right(u.phone, 2) end host_phone_masked
from public.pools p join public.users u on u.id = p.host_id
where auth.uid() is not null and public.is_active_user() and (
  p.host_id = auth.uid() or public.is_admin() or
  (p.status in ('active','full') and p.departure_at >= now() - interval '2 hours' and
    (not p.women_only or exists(select 1 from public.users me where me.id = auth.uid() and me.gender = 'female')))
);
revoke all on public.pools_public from public, anon;
grant select on public.pools_public to authenticated;

comment on table public.api_rate_limits is 'Server-only durable API abuse protection. Keys are one-way hashes.';
comment on function public.join_pool(uuid, integer) is 'Atomically validates and reserves one passenger seat for the authenticated user.';
