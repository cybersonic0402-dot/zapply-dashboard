import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const shop  = searchParams.get("shop");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // CSRF check
  const storedState = request.cookies.get("shopify_oauth_state")?.value;
  if (!code || !shop || !state || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/?view=sync&error=shopify_invalid_state`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  // Exchange code for permanent access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_APP_CLIENT_ID!,
      client_secret: process.env.SHOPIFY_APP_CLIENT_SECRET!,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/?view=sync&error=shopify_token`);
  }

  const { access_token } = await tokenRes.json();

  // Fetch shop info for metadata
  const shopRes = await fetch(`https://${shop}/admin/api/2025-01/shop.json`, {
    headers: { "X-Shopify-Access-Token": access_token },
  });
  const shopData = shopRes.ok ? await shopRes.json() : {};

  // Store token — one row per shop domain
  await supabase.from("integrations").upsert(
    {
      provider: `shopify_${shop.replace(".myshopify.com", "")}`,
      access_token,
      refresh_token: null,
      expires_at: null, // Shopify tokens don't expire
      metadata: {
        shop_domain: shop,
        shop_name: shopData.shop?.name ?? shop,
        shop_currency: shopData.shop?.currency ?? "EUR",
        shop_country: shopData.shop?.country_code ?? null,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" }
  );

  const response = NextResponse.redirect(`${appUrl}/?view=sync&connected=shopify`);
  response.cookies.delete("shopify_oauth_state");
  return response;
}
