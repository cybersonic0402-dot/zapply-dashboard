/**
 * Server-side data fetchers — called directly from page.tsx (no internal HTTP round-trips).
 * Each fetcher returns null when the source is not configured or errors.
 */
import { createClient as createSupabaseJS } from "@supabase/supabase-js";

// ─── helpers ─────────────────────────────────────────────────────────────────

function startOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// Service-role Supabase client — no cookies, works anywhere server-side
function serviceClient() {
  return createSupabaseJS(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── Shopify ─────────────────────────────────────────────────────────────────
//
// Uses Shopify OAuth2 client_credentials grant (no user redirect needed).
// Requires: SHOPIFY_APP_CLIENT_ID + SHOPIFY_APP_CLIENT_SECRET in .env.local
//           App must be installed in each store (done in Shopify Partner Dashboard).
// Tokens (~24h TTL) are cached in Supabase integrations table and auto-refreshed.
//
// Confirmed working on all 4 stores: zapply-nl, zapplyde, zapply-usa, zapplygermany

const SHOPIFY_STORES = [
  { code: "NL", flag: "🇳🇱", name: "Netherlands",   storeKey: "SHOPIFY_NL_STORE" },
  { code: "UK", flag: "🇬🇧", name: "United Kingdom", storeKey: "SHOPIFY_UK_STORE" },
  { code: "US", flag: "🇺🇸", name: "United States",  storeKey: "SHOPIFY_US_STORE", status: "scaling" },
  { code: "EU", flag: "🇩🇪", name: "Germany / EU",   storeKey: "SHOPIFY_EU_STORE" },
] as const;

async function getShopifyToken(store: string): Promise<string | null> {
  const clientId     = process.env.SHOPIFY_APP_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret || !store) return null;

  const provider = `shopify_${store.replace(".myshopify.com", "")}`;

  // 1. Use cached token from Supabase if still valid (with 10-min buffer)
  try {
    const supabase = serviceClient();
    const { data } = await supabase
      .from("integrations")
      .select("access_token, expires_at")
      .eq("provider", provider)
      .single();

    if (data?.access_token) {
      const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : Infinity;
      if (expiresAt > Date.now() + 10 * 60 * 1000) {
        return data.access_token;
      }
    }
  } catch {
    // Supabase unavailable — fall through to fresh grant
  }

  // 2. Client credentials grant — no redirect needed, app must be installed in store
  try {
    const res = await fetch(`https://${store}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id:     clientId,
        client_secret: clientSecret,
        grant_type:    "client_credentials",
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Shopify client_credentials ${store} ${res.status}:`, body.slice(0, 200));
      return null;
    }

    const { access_token, expires_in } = await res.json();
    if (!access_token) return null;

    // 3. Cache the fresh token in Supabase
    const expiresAt = new Date(Date.now() + ((expires_in ?? 86400) - 600) * 1000).toISOString();
    await serviceClient()
      .from("integrations")
      .upsert(
        { provider, access_token, expires_at: expiresAt, updated_at: new Date().toISOString(), metadata: { shop_domain: store, source: "client_credentials" } },
        { onConflict: "provider" }
      );

    return access_token;
  } catch (err: any) {
    console.error(`Shopify token refresh ${store}:`, err.message);
    return null;
  }
}

// Paginated GQL — one page, with optional cursor for subsequent pages
const SHOPIFY_GQL_PAGE = (since: string, cursor: string | null) => `{
  orders(first:250, ${cursor ? `after:"${cursor}",` : ""}query:"created_at:>=${since} financial_status:paid") {
    pageInfo { hasNextPage endCursor }
    edges { node {
      totalPriceSet    { shopMoney { amount currencyCode } }
      totalDiscountsSet{ shopMoney { amount } }
      totalRefundedSet { shopMoney { amount } }
      createdAt
      customer { id }
    }}
  }
}`;

// Aggregate all orders for a store using cursor pagination (max 40 pages = 10,000 orders)
async function fetchShopifyAllOrders(store: string, token: string, since: string, maxPages = 40) {
  let revenue = 0, refunds = 0, discounts = 0, orderCount = 0, currency = "EUR";
  const customerIds = new Set<string>();
  const monthlySums: Record<string, { revenue: number; orders: number; refunds: number }> = {};
  let cursor: string | null = null;
  let hasNextPage = true;
  let page = 0;

  while (hasNextPage && page < maxPages) {
    const res: Response = await fetch(`https://${store}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ query: SHOPIFY_GQL_PAGE(since, cursor) }),
    });
    if (!res.ok) break;
    const json = await res.json();
    if (json.errors) { console.error("Shopify GQL:", json.errors[0]?.message); break; }

    const page_data = json.data?.orders ?? {};
    const edges: any[] = page_data.edges ?? [];
    hasNextPage = page_data.pageInfo?.hasNextPage ?? false;
    cursor      = page_data.pageInfo?.endCursor ?? null;
    page++;

    for (const { node: o } of edges) {
      const r  = parseFloat(o.totalPriceSet.shopMoney.amount);
      const rf = parseFloat(o.totalRefundedSet.shopMoney.amount);
      const dc = parseFloat(o.totalDiscountsSet.shopMoney.amount);
      revenue   += r; refunds += rf; discounts += dc; orderCount++;
      currency = o.totalPriceSet.shopMoney.currencyCode;
      if (o.customer?.id) customerIds.add(o.customer.id);
      const mk = new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
      if (!monthlySums[mk]) monthlySums[mk] = { revenue: 0, orders: 0, refunds: 0 };
      monthlySums[mk].revenue += r;
      monthlySums[mk].refunds += rf;
      monthlySums[mk].orders  += 1;
    }
  }

  return { revenue, refunds, discounts, orderCount, currency, uniqueCustomers: customerIds.size, monthlySums, truncated: hasNextPage };
}

export async function fetchShopifyMarkets() {
  const clientId = process.env.SHOPIFY_APP_CLIENT_ID;
  if (!clientId) return null;

  const since = `${startOfMonth()}T00:00:00Z`;

  const results = await Promise.all(
    SHOPIFY_STORES.map(async ({ code, flag, name, storeKey, status }: any) => {
      const store = process.env[storeKey];
      if (!store) return { code, flag, name, status: status ?? null, live: false };

      const token = await getShopifyToken(store);
      if (!token) return { code, flag, name, status: status ?? null, live: false };

      try {
        const agg = await fetchShopifyAllOrders(store, token, since);
        const { revenue, refunds, discounts, orderCount, currency, uniqueCustomers, truncated } = agg;
        const aov = orderCount > 0 ? revenue / orderCount : 0;
        if (truncated) console.warn(`Shopify ${code}: revenue capped at 40 pages (10,000 orders)`);
        return { code, flag, name, revenue, refunds, discounts, orders: orderCount, aov, currency, newCustomers: uniqueCustomers, truncated, status: status ?? null, live: true };
      } catch (err: any) {
        console.error(`Shopify ${code} fetch failed:`, err.message);
        return { code, flag, name, status: status ?? null, live: false, error: err.message };
      }
    })
  );

  const hasAnyLive = results.some((r: any) => r.live);
  return hasAnyLive ? results : null;
}

// Last 6 months of order aggregates — NL store, fully paginated
export async function fetchShopifyMonthly() {
  const store = process.env.SHOPIFY_NL_STORE;
  if (!store) return null;

  const token = await getShopifyToken(store);
  if (!token) return null;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const since = `${sixMonthsAgo.toISOString().split("T")[0]}T00:00:00Z`;

  try {
    const { monthlySums } = await fetchShopifyAllOrders(store, token, since, 80);
    return Object.entries(monthlySums)
      .sort(([a], [b]) => new Date("1 " + a.replace("'", "20")).getTime() - new Date("1 " + b.replace("'", "20")).getTime())
      .map(([month, data]) => ({ month, ...data }));
  } catch {
    return null;
  }
}

// ─── Triple Whale ─────────────────────────────────────────────────────────────
//
// CONFIRMED WORKING — POST https://api.triplewhale.com/api/v2/summary-page/get-data
// Returns 698 metrics; all IDs below verified from live API response April 2026.

const TW_SHOPS = [
  { market: "NL", flag: "🇳🇱", envKeys: ["SHOPIFY_NL_STORE"] },
  { market: "UK", flag: "🇬🇧", envKeys: ["SHOPIFY_UK_STORE"] },
  { market: "US", flag: "🇺🇸", envKeys: ["SHOPIFY_US_STORE", "TRIPLE_WHALE_SHOP_US"] },
  { market: "EU", flag: "🇩🇪", envKeys: ["SHOPIFY_EU_STORE"] },
] as const;

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function twMetric(metrics: any[], id: string): number | null {
  const m = metrics.find((x: any) => x.id === id);
  return toNumber(m?.values?.current);
}

export async function fetchTripleWhale() {
  const apiKey = process.env.TRIPLE_WHALE_API_KEY;
  if (!apiKey) return null;

  const start = startOfMonth();
  const end   = today();

  const results = await Promise.all(
    TW_SHOPS.map(async ({ market, flag, envKeys }: any) => {
      const shop = (envKeys as string[]).map((k) => process.env[k]).find(Boolean);
      if (!shop) return { market, flag, live: false };

      try {
        const res = await fetch("https://api.triplewhale.com/api/v2/summary-page/get-data", {
          method: "POST",
          headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ shopDomain: shop, period: { start, end } }),
          next: { revalidate: 600 },
        });

        if (!res.ok) {
          const body = await res.text();
          console.error(`Triple Whale ${market} ${res.status}:`, body.slice(0, 200));
          return { market, flag, live: false };
        }

        const data = await res.json();
        const m = data.metrics ?? [];

        // All IDs confirmed from live API (698 metrics) — April 2026
        const row = {
          market, flag,
          revenue:         twMetric(m, "sales"),               // Gross Order Revenue
          netRevenue:      twMetric(m, "netSales"),             // Net Sales (after discounts)
          newCustomerRev:  twMetric(m, "newCustomerSales"),     // New Customer Revenue
          adSpend:         twMetric(m, "blendedAds"),           // Total blended ad spend
          facebookSpend:   twMetric(m, "facebookAds"),          // Facebook / Meta
          googleSpend:     twMetric(m, "googleAds"),            // Google Ads
          roas:            twMetric(m, "roas"),                  // Blended ROAS
          ncRoas:          twMetric(m, "newCustomersRoas"),     // New Customer ROAS
          fbRoas:          twMetric(m, "facebookRoas"),         // Facebook ROAS
          googleRoas:      twMetric(m, "googleRoas"),           // Google ROAS
          mer:             twMetric(m, "mer"),                   // Marketing Efficiency Ratio
          ncpa:            twMetric(m, "newCustomersCpa"),      // New Customer CPA
          ltvCpa:          twMetric(m, "ltvCpa"),                // LTV:CPA ratio
          aov:             twMetric(m, "shopifyAov"),            // True AOV
          orders:          twMetric(m, "shopifyOrders"),         // Total orders
          grossProfit:     twMetric(m, "grossProfit"),           // Gross Profit
          netProfit:       twMetric(m, "totalNetProfit"),        // Net Profit (after all costs)
          cogs:            twMetric(m, "cogs"),                  // Cost of Goods Sold
          newCustomersPct: twMetric(m, "newCustomersPercent"),  // % new customers
          uniqueCustomers: twMetric(m, "uniqueCustomers"),      // Unique customers
        };

        const hasData = Object.values(row).some((v) => typeof v === "number" && (v as number) !== 0);
        if (!hasData) return { market, flag, live: false };

        return { ...row, live: true };
      } catch (err: any) {
        console.error(`Triple Whale ${market}:`, err.message);
        return { market, flag, live: false };
      }
    })
  );

  const hasAnyLive = results.some((r) => r.live);
  return hasAnyLive ? results : null;
}

// ─── Loop Subscriptions ───────────────────────────────────────────────────────
//
// CONFIRMED WORKING — GET https://api.loopsubscriptions.com/admin/2023-10/subscription
// Auth: X-Loop-Token header (NOT Bearer token)
// Returns { success, message, data: [...subscriptions] }
// Each subscription: { id, status, totalLineItemPrice, currencyCode, createdAt, cancelledAt, ... }

export async function fetchLoop() {
  const key = process.env.LOOP_UK_API_KEY;
  if (!key) return null;

  const BASE       = "https://api.loopsubscriptions.com";
  const headers    = { "X-Loop-Token": key, Accept: "application/json" };
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const allSubs: any[] = [];
  const MAX_PAGES = 60; // 60 × 50 = 3,000 subs max per cold fetch

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      // Retry once on 429 rate-limit before giving up
      let res = await fetch(`${BASE}/admin/2023-10/subscription?limit=50&page=${page}`, {
        headers,
        next: { revalidate: 900 },
      });

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1000));
        res = await fetch(`${BASE}/admin/2023-10/subscription?limit=50&page=${page}`, { headers });
      }

      if (!res.ok) {
        console.error(`Loop API page ${page} → ${res.status}`);
        break;
      }

      const json = await res.json();
      const batch: any[] = json.data ?? [];
      allSubs.push(...batch);

      if (!json.pageInfo?.hasNextPage || batch.length === 0) break;
    }

    if (!allSubs.length) return null;

    const activeSubs       = allSubs.filter((s: any) => s.status === "ACTIVE");
    const mrr              = activeSubs.reduce((sum: number, s: any) => sum + parseFloat(s.totalLineItemPrice ?? "0"), 0);
    const newThisMonth     = allSubs.filter((s: any) => s.createdAt >= monthStart).length;
    const churnedThisMonth = allSubs.filter((s: any) => s.status === "CANCELLED" && s.cancelledAt && s.cancelledAt >= monthStart).length;
    const arpu             = activeSubs.length > 0 ? mrr / activeSubs.length : null;
    const churnRate        = (activeSubs.length + churnedThisMonth) > 0
      ? +((churnedThisMonth / (activeSubs.length + churnedThisMonth)) * 100).toFixed(1)
      : null;

    return [{
      market:          "ALL",
      flag:            "🌍",
      live:            true,
      mrr:             Math.round(mrr),
      activeSubs:      activeSubs.length,
      totalFetched:    allSubs.length,
      newThisMonth,
      churnedThisMonth,
      arpu:            arpu != null ? +arpu.toFixed(2) : null,
      churnRate,
    }];
  } catch (err: any) {
    console.error("Loop fetch error:", err.message);
    return null;
  }
}

// ─── Jortt ───────────────────────────────────────────────────────────────────
//
// CONFIRMED WORKING — client_credentials via form params (NOT Basic auth header)
// Endpoint: POST https://app.jortt.nl/oauth-provider/oauth/token
// Body params: grant_type, client_id, client_secret, scope

const JORTT_CATEGORY_MAP: Record<string, string> = {
  personeel: "team", salaris: "team", loon: "team", freelance: "team",
  "management fee": "team", managementfee: "team", klantenservice: "team", nodots: "team",
  agency: "agencies", bureaukosten: "agencies", argento: "agencies",
  eightx: "agencies", fractional: "agencies",
  content: "content", creator: "content", influencer: "content", samenwerking: "content",
  "thor magis": "content", haec: "content", zadero: "content", remy: "content",
  software: "software", saas: "software", klaviyo: "software",
  "triple whale": "software", monday: "software", notion: "software",
};

function categorise(name: string): string {
  const lower = name.toLowerCase();
  for (const [kw, cat] of Object.entries(JORTT_CATEGORY_MAP)) {
    if (lower.includes(kw)) return cat;
  }
  return "other";
}

async function getJorttToken(): Promise<string | null> {
  const clientId     = process.env.JORTT_CLIENT_ID;
  const clientSecret = process.env.JORTT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    // IMPORTANT: Jortt requires credentials as form BODY params, not Basic auth header
    const res = await fetch("https://app.jortt.nl/oauth-provider/oauth/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         "invoices:read",
      }).toString(),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Jortt token error:", res.status, err.slice(0, 200));
      return null;
    }
    const { access_token } = await res.json();
    return access_token ?? null;
  } catch (err: any) {
    console.error("Jortt token fetch failed:", err.message);
    return null;
  }
}

export async function fetchJortt() {
  const token = await getJorttToken();
  if (!token) return null;

  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const BASE    = "https://api.jortt.nl";

  try {
    // Fetch 3 pages × 100 invoices = up to 300 recent invoices (~6 months)
    const pages = await Promise.all([1, 2, 3].map((page) =>
      fetch(`${BASE}/invoices?per_page=100&page=${page}&invoice_status=sent`, {
        headers,
        next: { revalidate: 3600 },
      })
        .then((r) => r.ok ? r.json() : { data: [] })
        .then((d) => d.data ?? [])
    ));
    const invoices: any[] = pages.flat();

    const revenueByMonth: Record<string, number> = {};

    for (const inv of invoices) {
      const dateStr = inv.invoice_date ?? "";
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;

      // invoice_total = excl. VAT (correct for B2B revenue reporting)
      const total = parseFloat(inv.invoice_total?.value ?? "0");
      if (total <= 0) continue;  // skip credit notes

      const mk = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
      revenueByMonth[mk] = (revenueByMonth[mk] ?? 0) + total;
    }

    return {
      opexByMonth:  [],    // purchase invoices need broader scope — out of scope for now
      opexDetail:   {},
      revenueByMonth,
      invoiceCount: invoices.filter((i: any) => parseFloat(i.invoice_total?.value ?? "0") > 0).length,
      live: Object.keys(revenueByMonth).length > 0,
    };
  } catch (err: any) {
    console.error("Jortt fetch error:", err.message);
    return null;
  }
}
