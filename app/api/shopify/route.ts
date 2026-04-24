import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STORES = [
  { code: "NL", flag: "🇳🇱", name: "Netherlands", store: process.env.SHOPIFY_NL_STORE, token: process.env.SHOPIFY_NL_TOKEN },
  { code: "UK", flag: "🇬🇧", name: "United Kingdom", store: process.env.SHOPIFY_UK_STORE, token: process.env.SHOPIFY_UK_TOKEN },
  { code: "US", flag: "🇺🇸", name: "United States", store: process.env.SHOPIFY_US_STORE, token: process.env.SHOPIFY_US_TOKEN, status: "scaling" },
  { code: "EU", flag: "🇩🇪", name: "Germany / EU", store: process.env.SHOPIFY_EU_STORE, token: process.env.SHOPIFY_EU_TOKEN },
];

const ORDERS_QUERY = (since: string) => `{
  orders(first: 250, query: "created_at:>=${since} financial_status:paid") {
    edges {
      node {
        id
        totalPriceSet { shopMoney { amount currencyCode } }
        totalDiscountsSet { shopMoney { amount currencyCode } }
        totalRefundedSet { shopMoney { amount currencyCode } }
        subtotalPriceSet { shopMoney { amount currencyCode } }
        lineItems(first: 5) { edges { node { quantity } } }
        createdAt
        customer { id }
      }
    }
  }
}`;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since") ?? getStartOfMonth();

  const results = await Promise.all(
    STORES.map(async ({ code, flag, name, store, token, status }: any) => {
      if (!store || !token || token.startsWith("shpat_xxx")) {
        return { code, flag, name, status: status ?? null, error: "Not configured" };
      }
      try {
        const res = await fetch(`https://${store}/admin/api/2025-01/graphql.json`, {
          method: "POST",
          headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
          body: JSON.stringify({ query: ORDERS_QUERY(since) }),
        });
        const json = await res.json();
        if (json.errors) return { code, flag, name, status: status ?? null, error: json.errors[0]?.message };

        const orders = json.data?.orders?.edges?.map((e: any) => e.node) ?? [];
        const revenue = orders.reduce((s: number, o: any) => s + parseFloat(o.totalPriceSet.shopMoney.amount), 0);
        const refunds = orders.reduce((s: number, o: any) => s + parseFloat(o.totalRefundedSet.shopMoney.amount), 0);
        const discounts = orders.reduce((s: number, o: any) => s + parseFloat(o.totalDiscountsSet.shopMoney.amount), 0);
        const orderCount = orders.length;
        const aov = orderCount > 0 ? revenue / orderCount : 0;
        const currency = orders[0]?.totalPriceSet?.shopMoney?.currencyCode ?? "EUR";

        return { code, flag, name, revenue, refunds, discounts, orders: orderCount, aov, currency, status: status ?? null };
      } catch (err: any) {
        return { code, flag, name, status: status ?? null, error: err.message };
      }
    })
  );

  return NextResponse.json({ markets: results, since, fetchedAt: new Date().toISOString(), source: "shopify_live" });
}

function getStartOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01T00:00:00Z`;
}
