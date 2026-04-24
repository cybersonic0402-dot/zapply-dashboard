import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FinanceDashboard from "./components/FinanceDashboard";
import { fetchShopifyMarkets, fetchShopifyMonthly, fetchTripleWhale, fetchLoop, fetchJortt } from "@/lib/fetchers";

async function getConnections(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("integrations")
    .select("provider")
    .order("created_at");
  const connections: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.provider.startsWith("shopify_")) {
      connections["shopify"] = "connected";
      connections[row.provider] = "connected";
    } else {
      connections[row.provider] = "connected";
    }
  }
  // Shopify: mark stores as connected when Partner app credentials are set
  // (client_credentials grant works as long as app is installed in the store)
  if (process.env.SHOPIFY_APP_CLIENT_ID && process.env.SHOPIFY_APP_CLIENT_SECRET) {
    const stores = ["SHOPIFY_NL_STORE", "SHOPIFY_UK_STORE", "SHOPIFY_US_STORE", "SHOPIFY_EU_STORE"];
    for (const key of stores) {
      if (process.env[key]) {
        const providerKey = `shopify_${process.env[key]!.replace(".myshopify.com", "")}`;
        connections["shopify"] = "connected";
        connections[providerKey] = "connected";
      }
    }
  }
  // API-key based integrations
  if (process.env.JORTT_CLIENT_ID && process.env.JORTT_CLIENT_SECRET) {
    connections["jortt"] = "connected";
  }
  if (process.env.LOOP_UK_API_KEY) {
    connections["loop"] = "connected";
  }
  if (process.env.TRIPLE_WHALE_API_KEY) {
    connections["triplewhale"] = "connected";
  }
  return connections;
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all data sources in parallel — each returns null if not configured/connected
  const [shopifyMarkets, shopifyMonthly, tripleWhale, loop, jortt, connections] = await Promise.all([
    fetchShopifyMarkets(),
    fetchShopifyMonthly(),
    fetchTripleWhale(),
    fetchLoop(),
    fetchJortt(),
    getConnections(supabase),
  ]);

  return (
    <FinanceDashboard
      user={{
        email: user.email ?? "",
        name: user.user_metadata?.full_name ?? user.email ?? "",
        avatar:
          user.user_metadata?.avatar_url ??
          user.user_metadata?.picture ??
          user.user_metadata?.avatar ??
          null,
      }}
      liveData={{
        shopifyMarkets,
        shopifyMonthly,
        tripleWhale,
        loop,
        jortt,
      }}
      connections={connections}
    />
  );
}
