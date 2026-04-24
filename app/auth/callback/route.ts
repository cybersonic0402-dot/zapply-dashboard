import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const allowedDomains = ["zapply.nl", "codestrokes.com"];

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const email = data.user.email ?? "";

      // Enforce allowed company email domains
      const isAllowedDomain = allowedDomains.some((domain) =>
        email.toLowerCase().endsWith(`@${domain}`)
      );

      if (!isAllowedDomain) {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/login?error=unauthorized_domain`
        );
      }

      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
