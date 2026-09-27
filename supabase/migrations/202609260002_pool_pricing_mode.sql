-- Existing rides retain their fixed price. An equal split has no known per-person price.
alter table public.pools add column pricing_mode text not null default 'fixed';
alter table public.pools alter column cost_per_person drop not null;
alter table public.pools add constraint pools_pricing_consistent check (
  (pricing_mode = 'fixed' and cost_per_person is not null) or
  (pricing_mode = 'split_equally' and cost_per_person is null)
);
comment on column public.pools.pricing_mode is 'fixed: quoted amount per person; split_equally: final fare divided by actual travellers, including host.';

create or replace view public.pools_public with (security_barrier = true) as
select p.id, p.host_id, p.from_location, p.to_location, p.departure_at, p.total_seats, p.available_seats,
  p.cost_per_person, p.notes, p.via_route, p.luggage_capacity, p.car_type, p.campus, p.women_only,
  p.contact_visibility, p.status, p.created_at, u.full_name host_name, u.roll_number host_roll,
  u.is_phone_verified host_phone_verified,
  case when u.phone is null then 'Not provided' else '********' || right(u.phone, 2) end host_phone_masked,
  p.pricing_mode
from public.pools p join public.users u on u.id = p.host_id
where auth.uid() is not null and public.is_active_user() and (
  p.host_id = auth.uid() or public.is_admin() or
  (p.status in ('active','full') and p.departure_at >= now() - interval '2 hours' and
    (not p.women_only or exists(select 1 from public.users me where me.id = auth.uid() and me.gender = 'female')))
);
revoke all on public.pools_public from public, anon;
grant select on public.pools_public to authenticated;
