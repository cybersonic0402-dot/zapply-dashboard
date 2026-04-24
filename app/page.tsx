import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FinanceDashboard from "./components/FinanceDashboard";
import { readAllCache, ageMinutes } from "@/lib/cache";

async function getConnections() {
  const connections: Record<string, string> = {};
  if (process.env.SHOPIFY_APP_CLIENT_ID && process.env.SHOPIFY_APP_CLIENT_SECRET) {
    const stores = ["SHOPIFY_NL_STORE", "SHOPIFY_UK_STORE", "SHOPIFY_US_STORE", "SHOPIFY_EU_STORE"];
    for (const key of stores) {
      if (process.env[key]) {
        connections["shopify"] = "connected";
        connections[`shopify_${process.env[key]!.replace(".myshopify.com", "")}`] = "connected";
      }
    }
  }
  if (process.env.JORTT_CLIENT_ID)       connections["jortt"]       = "connected";
  if (process.env.JUO_NL_API_KEY)        connections["juo"]         = "connected";
  if (process.env.LOOP_UK_API_KEY || process.env.LOOP_US_API_KEY || process.env.LOOP_EU_API_KEY)
                                          connections["loop"]        = "connected";
  if (process.env.TRIPLE_WHALE_API_KEY)  connections["triplewhale"] = "connected";
  return connections;
}

export default async function Home() {
  const supabase = await createClient();

  // getUser() validates the JWT server-side (required by Supabase security guidelines).
  // Run it concurrently with the cache read so the auth check doesn't add serial latency.
  const [[{ data: { user } }, cache], connections] = await Promise.all([
    Promise.all([supabase.auth.getUser(), readAllCache()]),
    getConnections(),
  ]);
  if (!user) redirect("/login");

  const get = (provider: string, key: string) => cache[`${provider}/${key}`] ?? null;

  const shopifyMarketsCache = get("shopify",     "markets");
  const shopifyMonthlyCache = get("shopify",     "monthly");
  const shopifyTodayCache   = get("shopify",     "today");
  const tripleWhaleCache    = get("triplewhale", "summary");
  const juoCache            = get("juo",         "subscriptions");
  const loopCache           = get("loop",        "subscriptions");
  const jorttCache          = get("jortt",       "invoices");

  // Oldest sync time across the main slow sources
  const syncTimes = [shopifyMarketsCache, tripleWhaleCache, juoCache, loopCache]
    .filter(Boolean)
    .map(c => c!.fetchedAt);
  const oldestSyncedAt = syncTimes.length > 0
    ? syncTimes.reduce((a, b) => (a < b ? a : b))
    : null;

  const dataIsStale = ageMinutes(oldestSyncedAt) > 30;
  const hasAnyData  = !!(shopifyMarketsCache || tripleWhaleCache || loopCache || juoCache);

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
        shopifyMarkets: shopifyMarketsCache?.payload ?? null,
        shopifyMonthly: shopifyMonthlyCache?.payload ?? null,
        shopifyToday:   shopifyTodayCache?.payload   ?? null,
        tripleWhale:    tripleWhaleCache?.payload    ?? null,
        juo:            juoCache?.payload            ?? null,
        loop:           loopCache?.payload           ?? null,
        jortt:          jorttCache?.payload          ?? null,
      }}
      syncedAt={oldestSyncedAt}
      dataIsStale={dataIsStale}
      hasAnyData={hasAnyData}
      connections={connections}
    />
  );
}
