import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Initiates the Xero OAuth 2.0 Authorization Code flow.
// Visit /api/auth/xero while logged in to connect your Xero organization.

const XERO_SCOPES = [
  "offline_access",
  "accounting.reports.read",
  "accounting.transactions",
  "accounting.settings",
].join(" ");

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId   = process.env.XERO_CLIENT_ID;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const redirectUri = `${appUrl}/api/auth/xero/callback`;

  if (!clientId) return NextResponse.json({ error: "XERO_CLIENT_ID not set" }, { status: 500 });

  // Simple random state for CSRF protection
  const state = Math.random().toString(36).slice(2);

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     clientId,
    redirect_uri:  redirectUri,
    scope:         XERO_SCOPES,
    state,
  });

  const authUrl = `https://login.xero.com/identity/connect/authorize?${params}`;

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("xero_state", state, { httpOnly: true, maxAge: 600, path: "/" });
  return res;
}
