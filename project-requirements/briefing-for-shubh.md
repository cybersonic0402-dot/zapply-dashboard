# Zapply Finance Dashboard — Briefing for Shubh

**From:** Mike
**What:** React dashboard built with Claude, ready to go live
**File:** `finance-dashboard.jsx` (single-file, ~3,600 lines)
**Status:** Design finalized, ready for data integration

---

## TL;DR

I spent the last few days designing a finance dashboard with Claude, based on our Zapply finance sheets, Loop subscription data, and our 2026 Growth Plan. Design and structure are done, but the data is all mocked. Can you take this live with our real data?

Supabase project is already set up (EU/Frankfurt region, Pro plan, org = Zapply Group BV). You're not a member yet — I'll invite you once you're ready to dive in.

---

## What's working (design + structure)

Single-file React component using Tailwind + recharts + lucide-react icons. Has 9 views accessible via sidebar (desktop) or top tab bar (mobile).

### Overview (the main page)

Structured top-to-bottom as:

1. **Today's profit hero** — 42px profit number, trend sparkline, this-week / MTD / YTD
2. **Revenue hero card** — 44px headline Revenue number (Shopify icon), Orders + AOV inline on desktop
3. **Profit row** (3 tiles, always horizontal) — Contribution margin · OpEx · EBITDA
4. **Customer economics** (3 tiles, Triple Whale-attributed) — NCPA · 90D LTV · 365D LTV
5. **Marketing efficiency** (2 tiles, Triple Whale-attributed) — Ad spend · Blended ROAS
6. **Subscriptions section** (Loop-attributed, big card) —
   - Subscription share % (of total revenue)
   - 4 KPI tiles: MRR / Active subscribers / Churn / Repeat to 3rd order
   - NL/UK market split strip
   - **Repeat purchase funnel** (4 stages: 1st → 2nd → 3rd → 4th order)
   - **Expandable cohort drilldown** (`<details>` toggle) — shows 5th/6th/7th+ orders + cohort-by-cohort comparison table
   - 6-month repeat rate trend line chart
   - MRR + active subscribers dual-axis chart (bars + line)
   - New vs churned subscribers divergent bar chart
7. **Revenue vs Profit** area chart (30/60/90 day)

### Other pillars

- **Daily P&L** — Today's hourly revenue curve, full P&L line items
- **Markets** (Pillar 3) — Per-country breakdown for NL / UK / USA only. US is newly launched, showing negative contribution margin during scale-up. Earlier iterations had OSS/BE/DE which we consolidated away.
- **Monthly overview** (Pillar 4) — trailing 6-month management rollup:
  - Hero with Revenue MTD / Gross profit / Contribution margin / Net profit
  - 6-month trend chart (Revenue + Ad spend bars, Net profit line)
  - KPI strip: CAC, LTV, MER, Repeat rate sparklines
  - **OpEx breakdown** with 5 categories (Team / Agencies / Content samenwerkingen / Software / Other costs) — each clickable with line-item drilldown (real names from Zapply OpEx sheet: Nodots, Argento, Eightx.co, Klaviyo, Triplewhale, Monday.com, Notion, Remy Bonjasky, Thor Magis, HAEC, Zadero, etc.)
  - **12-month P&L forecast** — trend + seasonality with ±1 std dev confidence bands, animations off for smooth rendering
  - Month close status cards
- **Balance sheet** (Pillar 5) —
  - Liquidity warning banner (cash vs outstanding context)
  - Cash positions per bank/platform with brand icons:
    - ING Bank (EUR · NL operating)
    - Revolut NL (EUR · EU operational)
    - Revolut UK (GBP · UK savings)
    - Revolut USA (USD · US settlements)
    - Mollie / Shopify / PayPal (pending payouts)
  - Inventory per SKU (11 real SKUs across NL/UK/US warehouses with unit costs: T1 601, Sleepcharge, Creatine, Electrolytes, Fles, Zapply Tas, Handdoeken, Sokken, Petrus, etc.)
  - **Outstanding payments drilldown** (clickable categories): Whisk supplier invoices (€945k, 26 real invoice refs) / META billing (€1.1M) / VAT + VPB (€1.03M breakdown NL/UK/EU) / Affiliates & partners (€14k)
  - Classic balance sheet structure (Assets, Liabilities, Equity)
- **Forecast** (Pillar 6) — two toggles:
  - **13-week cashflow** — weekly inflow/outflow bars + cumulative cash line
  - **Growth Plan 2026** — full annual plan with:
    - YTD progress bar (against expected pace marker)
    - Per-market progress (🇳🇱 / 🇬🇧 / 🇺🇸) with On pace / Behind pills
    - Hero: 2026 Revenue / Profit / Marketing targets
    - Monthly breakdown stacked bar chart (switchable: revenue/profit/marketing)
    - Monthly targets table (12 rows, ✓ for completed / pulsing dot for current / ○ for future)
    - Per-market key assumptions (AOV, aMER, nCAC, gross margin)
  - **Monthly Spending Allowance** (new, dynamic) — below the horizon toggle, above assumptions panel:
    - 6 categories: Ad spend / Team / Agencies / Content samenwerkingen / Software / Other
    - Each with allowance / committed / remaining
    - Fixed vs flex distinction (Team, Software, Other are "Fixed" contractually; Ad spend, Agencies, Content are flex)
    - Color-coded progress: healthy < 80%, warning 80-95%, critical ≥ 95%
    - Dynamically adjusts with forecast revenue — if revenue drops, flex allowances drop with it
  - Assumptions panel at bottom (Growth rate, Target ROAS, Seasonality, etc.)

### Supporting views

- **Metrics** — Triple Whale's 20 metrics grid
- **Reconciliation** — Shopify → Jortt waterfall with variance detection
- **Sync status** — Data source health dashboard showing:
  - Shopify Plus (GraphQL Admin)
  - Triple Whale (REST v2)
  - Loop (subscription data)
  - TRL / Piqcer (fulfillment partner, amber-coded)
  - Jortt (with Xero migration badge)

### Branding & styling

- Navy accent `#0d1d3d` (Zapply brand color)
- Prominent Zapply wordmark top-left: small navy "Z" tile + blue "ZAPPLY" text (18px, Barlow Condensed, extrabold)
- 2px navy accent stripe at the very top of the header
- Body font: Geist, Mono font: Geist Mono (via Google Fonts)
- **All currency is in euros (€)** — fully normalized across Overview, Monthly Overview, Balance Sheet, and Forecast. Daily P&L / Reconciliation / Metrics views may still have some $ placeholders; please normalize during integration.
- **`BrandIcon` component** (just before `OverviewView`) renders inline SVGs for: shopify, loop, triplewhale, ing, revolut, mollie, paypal, jortt. Swap these with official Simple Icons SVGs if you prefer — they're placeholders built for visual recognition at small sizes (14-18px).
- 🇳🇱 🇬🇧 🇺🇸 flag emojis throughout Growth Plan 2026 and Markets view for visual market identification.

---

## What's mocked and needs real integration

Everything in the `MOCK DATA LAYER` section at the top of the file (lines ~58–560). Structured to mirror what the real APIs return, so swapping should be straightforward. Key mock arrays to replace:

| Mock variable | Real source | Notes |
|---|---|---|
| `generateTrend()` | Shopify orders aggregated daily | Currently generates random walk |
| `markets` | Shopify per-store + Triple Whale per-country | 3 markets: NL/UK/US |
| `months` | Monthly aggregates of orders + P&L | 6 months of data |
| `subscriptionData` | Loop API | MRR, active subs, new, churned, churnRate, repeat2nd/3rd/4th |
| `subscriptionByMarket` | Loop API split by store | NL (6,072 subs / €108k MRR), UK (26,343 subs / £602k MRR) |
| `opexByMonth` + `opexDetail` | Jortt aggregates / Xero journal entries | 5 categories + line items |
| `cashPositions` | Direct from banks or manual admin UI | ING + Revolut (NL/UK/USA) + Mollie/Shopify/PayPal payouts |
| `inventorySKUs` | Whisk (supplier) integration OR Shopify Inventory | Real SKUs listed, update periodically |
| `outstandingPayments` | Manual input via admin UI, or Xero AP | Whisk invoices + META billing + VAT + affiliates |
| `pnlLines` | Calculated from Shopify + Jortt/Xero | Daily P&L view |
| `forecast12m` + `cashflow13w` | Derived from trend + assumptions | Editable assumptions panel |
| `growthPlan` + `growthPlanTotals` | Pre-set targets from 2026 Growth Plan PDF | Fixed annual plan, doesn't change per run |
| Monthly Spending Allowance values (hardcoded inside ForecastView) | Should derive from: `forecast12m[currentMonth].revenue × targetMargin − fixedCosts` | Currently hardcoded. Team/Software/Other are "Fixed" (contract-based). Ad spend/Agencies/Content are "Flex" (recalculate from forecast) |

### Data sources (in priority order)

| Source | Priority | Purpose | Notes |
|---|---|---|---|
| **Shopify** | P0 | Revenue, orders, AOV, customers, refunds, discounts, per-market data | Use GraphQL Admin API. NL + UK + US stores |
| **Loop** | P0 | MRR, active subscribers, churn, repeat rates (2nd/3rd/4th order), cohort analysis | Their API — NL and UK subscription data |
| **Triple Whale** | P0 | Ad spend per channel, ROAS, NCPA, CAC, LTV (90D/365D) | Their v2 REST API. Blended metrics |
| **TRL / Piqcer** | P1 | Fulfillment shipments, costs | Currently shown in Sync view; integrate for inventory movement tracking |
| **Jortt** | P1 (bridge) | OpEx categories, indirect costs, P&L reconciliation | Limited API — aggregate data only. Bridge until Xero |
| **Xero** | P2 (~1 month out) | Full accounting, per-journal-entry detail | Replaces Jortt. OAuth flow |
| **Whisk (supplier)** | P2 | Inventory + purchase invoice tracking | May be easier to maintain via admin UI than integrate |

### Nuances to know

- **Jortt → Xero migration** is mentioned in the UI (amber badges in Reconciliation & Balance views). Leave those in; they disappear once Xero is connected.
- **Outstanding payments data** (Whisk invoices, META billing, VAT breakdown) currently comes from a manually-maintained sheet. For now, consider keeping that in a Supabase table that our finance person can update via a simple form — not worth integrating Jortt's weak API for this.
- **US market** is newly launched — small revenue, negative contribution margin expected during scale-up phase. Keep the "scaling" status badge.
- **Cohort drilldown** in Overview is behind an expandable `<details>` element. April '26 cohort shows amber "still maturing" pill since cohorts need 90 days to fully populate 3rd/4th order data.
- **The €220k cash vs €3.09M outstanding** ratio in Balance Sheet is intentional — it's the real current-week snapshot, not the forecast peak. The liquidity warning banner contextualizes that Whisk has 60-day terms, META bills rolling, and VAT includes accruing 2026 liabilities not yet due.
- **Growth Plan 2026 numbers** (€41M revenue target, €12.4M net profit) come from our existing Growth Plan PDF. Please don't recalculate from trend — these are committed targets.
- **Monthly Spending Allowance** is dynamic: it adjusts with forecast revenue. If revenue drops mid-month, flex categories (Ad spend / Agencies / Content) should proportionally drop their allowances on the next weekly recalc. Fixed categories stay put.

---

## Recommended architecture

```
GitHub repo (code)
      ↓
Vercel (hosting)  →  dashboard.zapply.nl (or subdomain of your choice)
      ↓
Supabase EU (auth + cache + Edge Functions)
      ↓
Shopify / Loop / Triple Whale / TRL / Jortt→Xero (sources)
```

**Supabase usage:**
- Auth with Google Workspace SSO, restricted to `@zapply.nl` emails
- Edge Functions on a cron schedule to pull from sources and cache in Postgres tables
- Row-level security for user settings / saved scenarios
- Keep all API keys in Supabase secrets — never in frontend code

---

## Priority roadmap (suggested)

**Phase 1 — Ship with mocks (1–2 hrs)**
- Repo on GitHub, deploy to Vercel, custom domain
- Auth with Google SSO via Supabase
- Team can see the dashboard (still mock data)

**Phase 2 — Shopify live (4–8 hrs)**
- Edge Function pulling orders, revenue, AOV, per-market split
- Overview + Markets + Daily P&L views become real

**Phase 3 — Loop (2–4 hrs)**
- Connect NL + UK Loop accounts
- MRR, churn, repeat rates become real
- Subscription section in Overview fully alive

**Phase 4 — Triple Whale (4–6 hrs)**
- Ad spend, ROAS, NCPA, 90D/365D LTV for Overview + Markets

**Phase 5 — OpEx + cashflow + allowance (4–8 hrs)**
- Jortt integration for OpEx breakdown (or manual Supabase tables if faster)
- Outstanding payments as editable Supabase tables with admin form
- Monthly Spending Allowance: wire Fixed categories to config table, Flex categories to forecast calc

**Phase 6 — TRL + Xero when ready (~4–8 hrs)**
- TRL fulfillment data integration
- Swap Jortt out, unlock drilldown detail for reconciliation view

---

## Things I care about

1. **EU data residency** — everything in Frankfurt/Amsterdam, AVG-compliant
2. **Access control from day one** — only @zapply.nl emails, no public URL
3. **The design stays intact** — I've iterated a lot on this with Claude. Don't restyle without asking.
4. **Mobile-workable** — I check this on my phone. Top nav already has mobile tabs.
5. **Currency: euros everywhere** — Overview/Monthly/Balance/Forecast are fully € already; please normalize any remaining $ in Daily P&L / Reconciliation / Metrics during integration.

---

## What I'll help with

- Decisions on metric definitions (e.g. how we calculate contribution margin, what counts as "flex" spending)
- Which metrics matter vs nice-to-have
- Supabase admin tasks (adding members, setting up SSO domain restriction)
- Any new views or tweaks once it's live

---

## Files you'll want

- `finance-dashboard.jsx` — the dashboard itself
- Our finance sheets (the 3 Zapply Finance Sheet xlsx files — useful for real-data reference)
- Loop screenshots for NL + UK (real MRR/subscriber numbers)
- Zapply Growth Plan 2026 PDF

---

## Quick notes on code structure

Single-file for now. When you restructure:

- `MOCK DATA LAYER` section (lines ~58–560) → split into `src/data/` modules per data source
- `BrandIcon` component (just before `OverviewView`) → can move to `src/components/BrandIcon.jsx`
- Each `*View` const → its own file in `src/views/`
- `GrowthPlanSection` and `OpExBreakdownSection` → `src/components/`
- Main `FinanceDashboard` export at the bottom → `src/App.jsx` or `src/pages/Dashboard.jsx`

Up to you how granular you want it — the current structure is artifact-friendly for rapid iteration with Claude; production-friendly refactor is yours to shape.

Let me know when you've got an hour and we'll get Phase 1 shipped. Appreciate it.

— Mike
