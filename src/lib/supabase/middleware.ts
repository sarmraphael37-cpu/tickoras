import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/organizer", roles: ["organizer"] },
  { prefix: "/attendee", roles: ["attendee", "organizer", "admin"] },
  { prefix: "/scanner", roles: ["scanner", "organizer", "admin"] },
];

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() revalidates the token with Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const protection = PROTECTED.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );

  if (!user && protection) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roleSet = new Set((roles ?? []).map((row) => row.role as string));

    if (AUTH_PAGES.includes(pathname)) {
      const target = roleSet.has("admin")
        ? "/admin"
        : roleSet.has("organizer")
          ? "/organizer"
          : "/attendee";
      return NextResponse.redirect(new URL(target, request.url));
    }

    if (protection && !protection.roles.some((role) => roleSet.has(role))) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return response;
}
