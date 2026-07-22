import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !/^[^@\s]+@(?:[^@\s]+\.)?amrita\.edu$/i.test(email)) {
  console.error("Usage: npm run bootstrap:admin -- your.name@amrita.edu");
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY before running this command.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let authUser;
for (let page = 1; !authUser; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  authUser = data.users.find((user) => user.email?.toLowerCase() === email);
  if (data.users.length < 1000) break;
}

if (!authUser) {
  console.error("That user must sign in to Comyvo once before being promoted.");
  process.exit(1);
}

const { error } = await supabase.from("users").update({ role: "admin" }).eq("id", authUser.id);
if (error) throw error;
console.log(`Promoted ${email} to Comyvo admin.`);
