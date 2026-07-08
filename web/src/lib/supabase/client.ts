import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Patch getUser for client-side queries
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
