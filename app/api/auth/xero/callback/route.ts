import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJS } from "@supabase/supabase-js";

function serviceClient() {
  return createSupabaseJS(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const redirectUri = `${appUrl}/api/auth/xero/callback`;

  if (error) {
    console.error("Xero OAuth error:", error, searchParams.get("error_description"));
    return NextResponse.redirect(`${appUrl}/?xero_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/?xero_error=no_code`);
  }

  // Exchange code for tokens
  const clientId     = process.env.XERO_CLIENT_ID!;
  const clientSecret = process.env.XERO_CLIENT_SECRET!;
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const tokenRes = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:   "authorization_code",
        code:         code,
        redirect_uri: redirectUri,
      }).toString(),
      cache: "no-store",
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("Xero token exchange failed:", tokenRes.status, body);
      return NextResponse.redirect(`${appUrl}/?xero_error=token_exchange_failed`);
    }

    const { access_token, refresh_token, expires_in } = await tokenRes.json();

    // Fetch connected organizations to find the right tenantId
    const connRes = await fetch("https://api.xero.com/connections", {
      headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json" },
      cache: "no-store",
    });

    const connections = connRes.ok ? await connRes.json() : [];
    // Prefer the org named "Zapply" — fallback to first connection
    const zapplyOrg = connections.find((c: any) =>
      (c.tenantName ?? "").toLowerCase().includes("zapply")
    ) ?? connections[0] ?? null;

    const tenantId   = zapplyOrg?.tenantId   ?? null;
    const tenantName = zapplyOrg?.tenantName ?? "Unknown";

    const expiresAt = new Date(Date.now() + ((expires_in ?? 1800) - 60) * 1000).toISOString();

    // Store tokens in Supabase integrations table
    await serviceClient().from("integrations").upsert(
      {
        provider:     "xero",
        access_token,
        expires_at:   expiresAt,
        updated_at:   new Date().toISOString(),
        metadata: {
          refresh_token,
          tenant_id:   tenantId,
          tenant_name: tenantName,
          source:      "oauth2_authorization_code",
          connections: connections.map((c: any) => ({ id: c.tenantId, name: c.tenantName })),
        },
      },
      { onConflict: "provider" }
    );

    console.log(`Xero connected: ${tenantName} (${tenantId})`);
    return NextResponse.redirect(`${appUrl}/?xero_connected=1`);

  } catch (err: any) {
    console.error("Xero callback error:", err.message);
    return NextResponse.redirect(`${appUrl}/?xero_error=callback_error`);
  }
}
