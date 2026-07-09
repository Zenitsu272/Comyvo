-- ============================================================
-- Seed Model Pools and Mock Driver
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create secondary mock driver in auth.users
INSERT INTO auth.users (
  id, 
  email, 
  email_confirmed_at, 
  created_at, 
  updated_at, 
  role, 
  aud, 
  raw_app_meta_data, 
  raw_user_meta_data, 
  is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'driver.bob@cb.students.amrita.edu',
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '{"provider":"email","providers":["email"]}',
  '{}',
  false
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create profile in public.users
INSERT INTO public.users (
  id, 
  email, 
  full_name, 
  roll_number, 
  phone, 
  is_phone_verified, 
  department, 
  campus, 
  gender, 
  year_of_joining, 
  role
)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'driver.bob@cb.students.amrita.edu',
  'Driver Bob',
  'CB.EN.U4CSE22055',
  '9876543210',
  true,
  'Computer Science & Engineering',
  'Coimbatore',
  'male',
  2022,
  'student'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create active pools hosted by Driver Bob
INSERT INTO public.pools (
  host_id, 
  from_location, 
  to_location, 
  departure_at, 
  total_seats, 
  available_seats, 
  cost_per_person, 
  notes, 
  via_route, 
  luggage_capacity, 
  car_type, 
  campus, 
  women_only, 
  contact_visibility, 
  status
)
VALUES
(
  '00000000-0000-0000-0000-000000000003',
  'Campus Main Gate',
  'Coimbatore Railway Station',
  now() + interval '3 hours',
  4,
  3,
  150.00,
  'Going to the railway station, looking for 3 co-passengers. Light luggage preferred.',
  'Gandhipuram',
  'backpacks',
  'sedan',
  'Coimbatore',
  false,
  'after_join',
  'active'
),
(
  '00000000-0000-0000-0000-000000000003',
  'Campus Main Gate',
  'Ettimadai Bus Stop',
  now() + interval '1 hour',
  3,
  2,
  30.00,
  'Quick auto-share to bus stop. 2 seats left, splitting fare.',
  NULL,
  'any',
  'auto',
  'Coimbatore',
  false,
  'always',
  'active'
);
