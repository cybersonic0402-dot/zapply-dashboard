import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SHOPS = [
  { market: "NL", flag: "🇳🇱", shop: process.env.SHOPIFY_NL_STORE },
  { market: "UK", flag: "🇬🇧", shop: process.env.SHOPIFY_UK_STORE },
  { market: "US", flag: "🇺🇸", shop: process.env.SHOPIFY_US_STORE },
  { market: "EU", flag: "🇩🇪", shop: process.env.SHOPIFY_EU_STORE },
];

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.TRIPLE_WHALE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Triple Whale API key not configured" }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start") ?? getStartOfMonth();
  const endDate   = searchParams.get("end")   ?? toISODate(new Date());

  const results = await Promise.all(
    SHOPS.map(async ({ market, flag, shop }) => {
      if (!shop) return { market, flag, error: "Not configured" };
      try {
        // Triple Whale v2 summary endpoint
        const res = await fetch(
          `https://api.triplewhale.com/api/v2/attribution/get-orders-with-journeys?shop=${shop}&startDate=${startDate}&endDate=${endDate}`,
          { headers: { "x-api-key": apiKey, "Content-Type": "application/json" } }
        );

        // Also fetch blended stats
        const summaryRes = await fetch(
          `https://api.triplewhale.com/api/v2/tw-influencer/get-summary?shop=${shop}&startDate=${startDate}&endDate=${endDate}`,
          { headers: { "x-api-key": apiKey } }
        );

        const summary = summaryRes.ok ? await summaryRes.json() : {};

        return {
          market,
          flag,
          adSpend:  summary.total_spend   ?? null,
          roas:     summary.roas           ?? null,
          ncpa:     summary.ncpa           ?? null,
          ltv90d:   summary.ltv_90d        ?? null,
          ltv365d:  summary.ltv_365d       ?? null,
          cac:      summary.cac            ?? null,
          mer:      summary.mer            ?? null,
        };
      } catch (err: any) {
        return { market, flag, error: err.message };
      }
    })
  );

  return NextResponse.json({ marketing: results, fetchedAt: new Date().toISOString(), source: "triplewhale_live" });
}

function getStartOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}
