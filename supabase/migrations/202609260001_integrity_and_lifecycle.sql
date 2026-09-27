-- Production integrity and lifecycle safeguards added after the initial baseline.

create or replace function public.validate_pool_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_host public.users%rowtype;
begin
  select * into v_host from public.users where id = new.host_id;
  if not found or v_host.full_name is null or v_host.roll_number is null then
    raise exception 'Complete host profile required';
  end if;
  if (tg_op = 'INSERT' or new.status in ('active', 'full')) and v_host.status <> 'active' then
    raise exception 'Active host account required';
  end if;
  if new.women_only and v_host.gender is distinct from 'female' then
    raise exception 'Women-only pools require a female host';
  end if;
  if new.women_only and exists (
    select 1 from public.pool_members pm
    join public.users u on u.id = pm.user_id
    where pm.pool_id = new.id and u.gender is distinct from 'female'
  ) then
    raise exception 'Existing membership is incompatible with a women-only pool';
  end if;
  if new.status = 'completed' and new.departure_at > now() then
    raise exception 'A future pool cannot be completed';
  end if;
  if new.status in ('active', 'full') and new.departure_at <= now()
    and (tg_op = 'INSERT' or new.departure_at is distinct from old.departure_at) then
    raise exception 'Active pool departure must be in the future';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_pool_integrity_trigger on public.pools;
create trigger validate_pool_integrity_trigger
before insert or update on public.pools
for each row execute function public.validate_pool_integrity();

create or replace function public.guard_women_only_eligibility()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.gender = 'female' and new.gender is distinct from 'female' and exists (
    select 1 from public.pools p
    where p.women_only and p.status in ('active', 'full') and p.departure_at > now()
      and (p.host_id = new.id or exists (
        select 1 from public.pool_members pm where pm.pool_id = p.id and pm.user_id = new.id
      ))
  ) then
    raise exception 'Leave or cancel future women-only pools before changing gender';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_women_only_eligibility_trigger on public.users;
create trigger guard_women_only_eligibility_trigger
before update of gender on public.users
for each row execute function public.guard_women_only_eligibility();

create or replace function public.remove_suspended_user_from_future_rides()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'suspended' and old.status is distinct from new.status then
    update public.pools
    set status = 'cancelled'
    where host_id = new.id and status in ('active', 'full') and departure_at > now();

    delete from public.pool_members pm
    using public.pools p
    where pm.pool_id = p.id and pm.user_id = new.id
      and p.status in ('active', 'full') and p.departure_at > now();
  end if;
  return new;
end;
$$;

drop trigger if exists remove_suspended_user_from_future_rides_trigger on public.users;
create trigger remove_suspended_user_from_future_rides_trigger
before update of status on public.users
for each row execute function public.remove_suspended_user_from_future_rides();

update public.pools p
set status = 'cancelled'
from public.users u
where p.host_id = u.id and u.status = 'suspended'
  and p.status in ('active', 'full') and p.departure_at > now();

delete from public.pool_members pm
using public.pools p, public.users u
where pm.pool_id = p.id and pm.user_id = u.id and u.status = 'suspended'
  and p.status in ('active', 'full') and p.departure_at > now();

create or replace function public.reconcile_expired_pools()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_updated integer;
begin
  update public.pools
  set status = 'completed'
  where status in ('active', 'full') and departure_at <= now();
  get diagnostics v_updated = row_count;
  delete from public.api_rate_limits where updated_at < now() - interval '2 days';
  return v_updated;
end;
$$;

revoke all on function public.reconcile_expired_pools() from public, anon, authenticated;
grant execute on function public.reconcile_expired_pools() to service_role;

select public.reconcile_expired_pools();

comment on function public.reconcile_expired_pools() is 'Closes departed pools and removes obsolete abuse-protection buckets.';
