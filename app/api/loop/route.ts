import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Fetches MRR, active subscribers, churn, repeat rates from Loop subscriptions.
// NL and UK stores use separate Loop API keys.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = [
    { market: "NL", flag: "🇳🇱", apiKey: process.env.LOOP_NL_API_KEY },
    { market: "UK", flag: "🇬🇧", apiKey: process.env.LOOP_UK_API_KEY },
  ];

  const results = await Promise.all(
    accounts.map(async ({ market, flag, apiKey }) => {
      if (!apiKey) return { market, flag, error: "Not configured" };
      try {
        const [subsRes, analyticsRes] = await Promise.all([
          fetch("https://api.loopwork.co/v1/subscriptions/summary", {
            headers: { Authorization: `Bearer ${apiKey}` },
          }),
          fetch("https://api.loopwork.co/v1/analytics/repeat-purchase", {
            headers: { Authorization: `Bearer ${apiKey}` },
          }),
        ]);

        const subs = await subsRes.json();
        const analytics = await analyticsRes.json();

        return {
          market,
          flag,
          mrr: subs.mrr_cents ? subs.mrr_cents / 100 : null,
          activeSubs: subs.active_count ?? null,
          newSubs: subs.new_this_month ?? null,
          churnedSubs: subs.churned_this_month ?? null,
          churnRate: subs.churn_rate_percent ?? null,
          repeat2nd: analytics.second_order_rate ?? null,
          repeat3rd: analytics.third_order_rate ?? null,
          repeat4th: analytics.fourth_order_rate ?? null,
        };
      } catch {
        return { market, flag, error: "Fetch failed" };
      }
    })
  );

  return NextResponse.json({ subscriptions: results, fetchedAt: new Date().toISOString() });
}
