import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeCache } from "@/lib/cache";
import {
  fetchShopifyMarkets,
  fetchShopifyMonthly,
  fetchShopifyToday,
  fetchTripleWhale,
  fetchJortt,
  fetchJuoRaw,
  fetchLoopRaw,
} from "@/lib/fetchers";

export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") ?? "all";

  const results: Record<string, string> = {};

  async function run(name: string, fn: () => Promise<any>, provider: string, key: string) {
    if (source !== "all" && source !== name) return;
    try {
      const data = await fn();
      await writeCache(provider, key, data);
      results[name] = "ok";
    } catch (err: any) {
      console.error(`Sync ${name}:`, err.message);
      results[name] = `error: ${err.message}`;
    }
  }

  // All 7 sources run fully concurrently — each handles its own rate limiting internally.
  // Juo and Loop have separate API keys from Shopify/TW/Jortt, so no shared rate limits.
  await Promise.all([
    run("shopify_markets", fetchShopifyMarkets, "shopify",     "markets"),
    run("shopify_monthly", fetchShopifyMonthly, "shopify",     "monthly"),
    run("shopify_today",   fetchShopifyToday,   "shopify",     "today"),
    run("triplewhale",     fetchTripleWhale,    "triplewhale", "summary"),
    run("jortt",           fetchJortt,          "jortt",       "invoices"),
    run("juo",             fetchJuoRaw,         "juo",         "subscriptions"),
    run("loop",            fetchLoopRaw,        "loop",        "subscriptions"),
  ]);

  return NextResponse.json({ ok: true, syncedAt: new Date().toISOString(), results });
}
