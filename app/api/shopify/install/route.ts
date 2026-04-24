import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!));

  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (!shop || !shop.endsWith(".myshopify.com")) {
    return NextResponse.redirect(`${appUrl}/?view=sync&error=shopify_invalid_shop`);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const scopes = "read_orders,read_customers,read_products,read_inventory,read_analytics";

  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_APP_CLIENT_ID!,
    scope: scopes,
    redirect_uri: `${appUrl}/api/shopify/callback`,
    state,
  });

  // Store state in cookie for CSRF check
  const response = NextResponse.redirect(
    `https://${shop}/admin/oauth/authorize?${params.toString()}`
  );
  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: true,
    maxAge: 300,
    path: "/",
  });

  return response;
}
