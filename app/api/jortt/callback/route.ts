import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/?view=sync&error=jortt_denied`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  // Exchange code for access + refresh token
  const tokenRes = await fetch("https://app.jortt.nl/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.JORTT_CLIENT_ID!,
      client_secret: process.env.JORTT_CLIENT_SECRET!,
      redirect_uri: `${appUrl}/api/jortt/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/?view=sync&error=jortt_token`);
  }

  const token = await tokenRes.json();
  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null;

  await supabase.from("integrations").upsert(
    {
      provider: "jortt",
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? null,
      expires_at: expiresAt,
      metadata: {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" }
  );

  return NextResponse.redirect(`${appUrl}/?view=sync&connected=jortt`);
}
