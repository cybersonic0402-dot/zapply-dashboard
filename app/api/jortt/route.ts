import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Maps Jortt ledger account names to our 5 OpEx categories.
// Edit this to match actual account names in the Zapply Jortt chart of accounts.
const CATEGORY_MAP: Record<string, string> = {
  // Team
  "personeel": "team", "salaris": "team", "loon": "team", "freelance": "team",
  "managementfee": "team", "management fee": "team", "klantenservice": "team",
  "customer service": "team", "nodots": "team",
  // Agencies
  "agency": "agencies", "bureaukosten": "agencies", "argento": "agencies",
  "eightx": "agencies", "fractional": "agencies", "roas": "agencies",
  // Content
  "content": "content", "creator": "content", "influencer": "content",
  "samenwerking": "content", "thor magis": "content", "haec": "content",
  "zadero": "content", "remy": "content",
  // Software
  "software": "software", "saas": "software", "klaviyo": "software",
  "triplewhale": "software", "triple whale": "software", "monday": "software",
  "notion": "software", "shopify": "software",
  // Other (fallback)
};

function categorise(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return cat;
  }
  return "other";
}

async function getJorttToken(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("provider", "jortt")
    .single();
  return data;
}

async function refreshJorttToken(supabase: Awaited<ReturnType<typeof createClient>>, refreshToken: string) {
  const res = await fetch("https://app.jortt.nl/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.JORTT_CLIENT_ID!,
      client_secret: process.env.JORTT_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) return null;
  const token = await res.json();
  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null;
  await supabase.from("integrations").upsert(
    { provider: "jortt", access_token: token.access_token, refresh_token: token.refresh_token ?? refreshToken, expires_at: expiresAt, updated_at: new Date().toISOString() },
    { onConflict: "provider" }
  );
  return token.access_token as string;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await getJorttToken(supabase);
  if (!integration) {
    return NextResponse.json({ error: "Jortt not connected", connectUrl: "/api/jortt/connect" }, { status: 503 });
  }

  // Refresh token if expired
  let accessToken = integration.access_token;
  if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
    if (integration.refresh_token) {
      const refreshed = await refreshJorttToken(supabase, integration.refresh_token);
      if (refreshed) accessToken = refreshed;
    }
  }

  const headers = { Authorization: `Bearer ${accessToken}`, Accept: "application/json" };
  const BASE = "https://app.jortt.nl/api";

  try {
    // Fetch last 6 months of expenses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const fromDate = sixMonthsAgo.toISOString().split("T")[0];

    const [expensesRes, ledgerRes, invoicesRes] = await Promise.all([
      fetch(`${BASE}/invoices/purchase?from_date=${fromDate}&per_page=250`, { headers }),
      fetch(`${BASE}/ledger_accounts`, { headers }),
      fetch(`${BASE}/invoices/sent?from_date=${fromDate}&per_page=250`, { headers }),
    ]);

    const [expensesJson, ledgerJson, invoicesJson] = await Promise.all([
      expensesRes.json(),
      ledgerRes.json(),
      invoicesRes.json(),
    ]);

    const expenses: any[] = expensesJson.data ?? expensesJson ?? [];
    const invoices: any[] = invoicesJson.data ?? invoicesJson ?? [];

    // Group expenses by month and category
    const monthMap: Record<string, Record<string, number>> = {};
    const detailMap: Record<string, { name: string; amount: number; source: string }[]> = {
      team: [], agencies: [], content: [], software: [], other: [],
    };

    for (const exp of expenses) {
      const dateStr: string = exp.date ?? exp.invoice_date ?? "";
      if (!dateStr) continue;
      const d = new Date(dateStr);
      const monthKey = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
      const accountName: string = exp.ledger_account?.name ?? exp.description ?? "Other";
      const cat = categorise(accountName);
      const amount = Math.abs(parseFloat(exp.total_amount_incl_vat ?? exp.amount ?? "0")) / 1000;

      if (!monthMap[monthKey]) monthMap[monthKey] = { team: 0, agencies: 0, content: 0, software: 0, other: 0 };
      monthMap[monthKey][cat] = (monthMap[monthKey][cat] ?? 0) + amount;

      detailMap[cat].push({ name: exp.description ?? accountName, amount: Math.round(amount), source: accountName });
    }

    // Group invoices by month for revenue
    const revenueByMonth: Record<string, number> = {};
    for (const inv of invoices) {
      const dateStr: string = inv.date ?? inv.invoice_date ?? "";
      if (!dateStr) continue;
      const d = new Date(dateStr);
      const monthKey = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
      const amount = parseFloat(inv.total_amount_excl_vat ?? inv.amount ?? "0") / 1000;
      revenueByMonth[monthKey] = (revenueByMonth[monthKey] ?? 0) + amount;
    }

    // Sort months chronologically
    const opexByMonth = Object.entries(monthMap)
      .sort(([a], [b]) => new Date("1 " + a.replace("'", "20")).getTime() - new Date("1 " + b.replace("'", "20")).getTime())
      .map(([month, cats]) => ({ month, ...cats }));

    return NextResponse.json({
      opexByMonth,
      opexDetail: detailMap,
      revenueByMonth,
      ledger: ledgerJson.data ?? ledgerJson,
      fetchedAt: new Date().toISOString(),
      source: "jortt_live",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Jortt API error", detail: err.message }, { status: 500 });
  }
}
