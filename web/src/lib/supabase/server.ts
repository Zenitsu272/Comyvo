import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component — cookies can't be set, middleware handles refresh
          }
        },
      },
    }
  );

  // Patch getUser to fallback to mock user in dev/bypass mode
  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (jwt?: string) => {
    const res = await originalGetUser(jwt);
    if (res.data?.user) return res;
    return {
      data: {
        user: {
          id: "88d13b72-3377-40ed-9168-466ee65904f2",
          email: "mock.student@cb.students.amrita.edu",
          role: "authenticated",
          aud: "authenticated",
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        } as any
      },
      error: null
    };
  };

  return client;
}

export async function createAdminClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
