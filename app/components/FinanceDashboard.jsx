'use client';
import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Wallet,
  Calendar,
  Search,
  Settings,
  ChevronDown,
  ChevronRight,
  Command,
  LayoutDashboard,
  GitCompareArrows,
  Activity,
  Plug,
  CircleCheck,
  CircleAlert,
  CircleDot,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  Info,
  Plus,
  Globe,
  CalendarDays,
  Scale,
  LineChart as LineChartIcon,
  Clock,
  Package,
  Truck,
  Zap,
  Sparkles,
} from "lucide-react";

/* =========================================================================
   MOCK DATA LAYER
   Structure mirrors what Shopify / Triple Whale / Jortt would return.
   Jortt is a bridge — Xero replaces it within ~1 month.
   Accounting fields use a neutral shape so swapping providers is trivial.
   ========================================================================= */

const generateTrend = (range) => {
  const points = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const today = new Date();
  return Array.from({ length: points }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (points - 1 - i));
    const trend = 1 + i / points / 2;
    const noise = 0.85 + Math.random() * 0.3;
    const revenue = Math.round(4200 * trend * noise);
    const adSpend = Math.round(1100 * trend * (0.9 + Math.random() * 0.2));
    const cogs = Math.round(revenue * 0.38);
    const profit = revenue - cogs - adSpend;
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue,
      profit,
      adSpend,
      cogs,
      roas: +(revenue / adSpend).toFixed(2),
    };
  });
};

// The 20 Triple Whale metrics
const tripleWhaleMetrics = [
  { id: "revenue", label: "Revenue", value: 442, format: "currency", delta: 12.4, positive: true, group: "Sales" },
  { id: "orders", label: "Orders", value: 4, format: "number", delta: 8.1, positive: true, group: "Sales" },
  { id: "aov", label: "Average Order Value", value: 1.24, format: "currency", delta: 3.9, positive: true, group: "Sales" },
  { id: "upt", label: "Units per Transaction", value: 1.84, format: "decimal", delta: 0.02, positive: true, group: "Sales" },
  { id: "cac", label: "Customer Acquisition Cost", value: 28.4, format: "currency", delta: 4.2, positive: false, group: "Marketing" },
  { id: "roas", label: "Return on Ad Spend", value: 4.12, format: "multiplier", delta: 0.4, positive: true, group: "Marketing" },
  { id: "adspend", label: "Ad Spend", value: 107, format: "currency", delta: 3.2, positive: false, group: "Marketing" },
  { id: "conversion", label: "Conversion Rate", value: 2.84, format: "percent", delta: 0.3, positive: true, group: "Marketing" },
  { id: "traffic", label: "Traffic", value: 149, format: "number", delta: 15.2, positive: true, group: "Marketing" },
  { id: "customers", label: "Customers", value: 3, format: "number", delta: 6.8, positive: true, group: "Customers" },
  { id: "ltv", label: "Lifetime Value", value: 1.5, format: "currency", delta: 9.1, positive: true, group: "Customers" },
  { id: "churn", label: "Churn Rate", value: 4.2, format: "percent", delta: 0.4, positive: true, group: "Customers" },
  { id: "repeat", label: "Repeat Purchase Rate", value: 28.4, format: "percent", delta: 2.1, positive: true, group: "Customers" },
  { id: "refund", label: "Refund Rate", value: 3.1, format: "percent", delta: 0.2, positive: true, group: "Customers" },
  { id: "grossprofit", label: "Gross Profit", value: 274, format: "currency", delta: 11.2, positive: true, group: "Profitability" },
  { id: "cogs", label: "Cost of Goods Sold", value: 168, format: "currency", delta: 2.8, positive: false, group: "Profitability" },
  { id: "netprofit", label: "Net Profit", value: 97, format: "currency", delta: 14.8, positive: true, group: "Profitability" },
  { id: "margin", label: "Margin %", value: 22.0, format: "percent", delta: 1.4, positive: true, group: "Profitability" },
  { id: "mer", label: "MER (Marketing Efficiency)", value: 4.12, format: "multiplier", delta: 0.3, positive: true, group: "Custom" },
  { id: "contribution", label: "Contribution Margin", value: 18.2, format: "percent", delta: 0.8, positive: true, group: "Custom" },
];

// Reconciliation waterfall: Shopify → Jortt totals
// NOTE: Jortt's API doesn't expose per-journal-entry detail like Exact/Xero would,
// so some deductions are aggregated under "Jortt (aggregate)".
const reconciliation = [
  { label: "Shopify gross revenue", value: 442, type: "start", source: "Shopify" },
  { label: "Refunds & returns", value: -4420, type: "deduction", source: "Shopify" },
  { label: "Discounts applied", value: -6180, type: "deduction", source: "Shopify" },
  { label: "Cost of Goods Sold", value: -54280, type: "deduction", source: "Jortt" },
  { label: "Payment processing fees", value: -3128, type: "deduction", source: "Shopify" },
  { label: "Shipping costs", value: -8940, type: "deduction", source: "Jortt" },
  { label: "Ad spend", value: -34680, type: "deduction", source: "Triple Whale" },
  { label: "Operational expenses", value: -12400, type: "deduction", source: "Jortt" },
  { label: "Net profit (calculated)", value: 58, type: "subtotal", source: "Calculated" },
  { label: "Jortt reported profit", value: 56, type: "final", source: "Jortt" },
];

const variance = 58 - 56; // 708 unaccounted

// Drill-down: what's causing the variance
// Jortt gives us aggregate category totals, not per-journal-entry lines.
// When Xero goes live, this list will expand with real journal references.
const varianceItems = [
  { id: "CAT-001", description: "Shipping costs (aggregate diff vs Jortt)", amount: -240, source: "Jortt category", date: "Apr 18", category: "Shipping", trackedInXero: true },
  { id: "CAT-002", description: "FX rounding on EUR orders", amount: -82, source: "Shopify", date: "Apr 17", category: "Currency", trackedInXero: false },
  { id: "CAT-003", description: "Off-platform cost (manual)", amount: -450, source: "Manual entry", date: "Apr 15", category: "Operational", trackedInXero: true },
  { id: "CAT-004", description: "Refund timing mismatch", amount: 64, source: "Shopify", date: "Apr 12", category: "Refunds", trackedInXero: false },
];

// Sync status per data source
const syncSources = [
  { name: "Shopify Plus", status: "ok", lastSync: "2 min ago", records: "4 orders", api: "GraphQL Admin", color: "#95BF47" },
  { name: "Triple Whale", status: "ok", lastSync: "14 min ago", records: "20 metrics", api: "REST v2", color: "#7C3AED" },
  { name: "Loop", status: "ok", lastSync: "8 min ago", records: "32,415 subscribers", api: "REST", color: "#7C3AED" },
  { name: "Fulfillment partner", status: "ok", lastSync: "22 min ago", records: "482 shipments", api: "REST", color: "#F59E0B", note: "Fulfillment partner" },
  { name: "Jortt", status: "ok", lastSync: "1 hr ago", records: "312 transactions", api: "REST", color: "#00A6A6", note: "Bridge connector · Xero replacing within ~1 month" },
];

/* ============================= PILLAR 1: DAILY P&L ============================= */

// Hourly revenue curve for today vs avg of last 4 Tuesdays
const hourlyRevenue = Array.from({ length: 24 }, (_, h) => {
  const curve = Math.sin((h - 6) / 24 * Math.PI) * 0.8 + 0.3;
  const base = Math.max(0, curve * 800);
  const avgLast4 = Math.round(base * (0.9 + Math.random() * 0.2));
  // Today tracked until now (hour 14)
  const today = h <= 14 ? Math.round(base * (1.05 + Math.random() * 0.15)) : null;
  return {
    hour: `${String(h).padStart(2, "0")}:00`,
    today,
    avgLast4,
  };
});

// Full P&L line items for selected period (MTD)
const pnlLines = [
  { label: "Gross revenue", value: 442, source: "Shopify", type: "top" },
  { label: "Refunds & returns", value: -4420, source: "Shopify", type: "deduction" },
  { label: "Discounts", value: -6180, source: "Shopify", type: "deduction" },
  { label: "Net revenue", value: 409, source: "Calculated", type: "subtotal" },
  { label: "COGS (Supplier supplier)", value: -48680, source: "Supplier × Shopify", type: "deduction" },
  { label: "Fulfillment costs", value: -8940, source: "Fulfillment", type: "deduction" },
  { label: "Payment processing", value: -3128, source: "Shopify Payments", type: "deduction" },
  { label: "Gross profit", value: 221, source: "Calculated", type: "subtotal" },
  { label: "Ad spend — Meta", value: -18420, source: "Meta Ads", type: "deduction" },
  { label: "Ad spend — Google", value: -12180, source: "Google Ads", type: "deduction" },
  { label: "Ad spend — TikTok", value: -4080, source: "Meta Ads", type: "deduction" },
  { label: "Contribution margin", value: 114, source: "Calculated", type: "subtotal", highlight: true },
  { label: "OpEx — Salaries", value: -9200, source: "Jortt", type: "deduction" },
  { label: "OpEx — Software", value: -820, source: "Jortt", type: "deduction" },
  { label: "OpEx — Rent & utilities", value: -1480, source: "Jortt", type: "deduction" },
  { label: "OpEx — Other", value: -6500, source: "Jortt", type: "deduction" },
  { label: "Net profit", value: 58, source: "Calculated", type: "final" },
];

/* ============================= PILLAR 2: MARGIN PER MARKET ============================= */

// Revenue-split geïnspireerd op Month sheet 2026: Q1 totaal ~€4.8M (NL+OSS ~€1.9M, UK ~€2.7M)
// April MTD gebaseerd op dagelijkse cadence ~€50k/dag → ~€1.4M MTD
// US is net gelanceerd en scaled up (kleinste market)
const markets = [
  { code: "NL", name: "Netherlands", revenue: 2512, orders: 21, adSpend: 577, cogs: 410, fulfillment: 185, grossMargin: 54.2, contributionMargin: 32.4, cac: 25.08, newCustomers: 9, flag: "🇳🇱" },
  { code: "UK", name: "United Kingdom", revenue: 1595, orders: 12, adSpend: 472, cogs: 258, fulfillment: 126, grossMargin: 46.9, contributionMargin: 18.1, cac: 38.20, newCustomers: 5, flag: "🇬🇧" },
  { code: "US", name: "United States", revenue: 304, orders: 2, adSpend: 151, cogs: 57, fulfillment: 33, grossMargin: 50.2, contributionMargin: 5.8, cac: 71.40, newCustomers: 1, flag: "🇺🇸", status: "scaling" },
];

/* ============================= PILLAR 3: MONTHLY OVERVIEW ============================= */

const months = [
  { month: "Nov '25", revenue: 335, grossProfit: 181, contributionMargin: 87, netProfit: 39, adSpend: 88 },
  { month: "Dec '25", revenue: 510, grossProfit: 277, contributionMargin: 130, netProfit: 69, adSpend: 119 },
  { month: "Jan '26", revenue: 304, grossProfit: 161, contributionMargin: 77, netProfit: 30, adSpend: 77 },
  { month: "Feb '26", revenue: 348, grossProfit: 186, contributionMargin: 90, netProfit: 41, adSpend: 87 },
  { month: "Mar '26", revenue: 399, grossProfit: 211, contributionMargin: 100, netProfit: 49, adSpend: 95 },
  { month: "Apr '26", revenue: 442, grossProfit: 221, contributionMargin: 114, netProfit: 58, adSpend: 107, current: true },
];

const monthlyKpis = {
  cac: [32.4, 29.8, 34.2, 31.4, 28.9, 28.4],
  ltv: [248, 262, 268, 275, 281, 284.5],
  mer: [3.81, 4.29, 3.96, 4.00, 4.18, 4.12],
  repeatRate: [22.4, 24.8, 25.2, 26.1, 27.4, 28.4],
};

/* ============================= SUBSCRIPTIONS / MRR ============================= */
// Mock subscription data (NL + UK markets)
// NL: demo subs / demo MRR  →  MRR ~€108k
// UK: demo subs / demo MRR           →  MRR ~€698k (@ GBP/EUR 1.16)
// Combined: 32,415 active subs · ~€807k MRR · ARPU ~€24.90/mo
// Repeat funnel: van alle first-time kopers, welk % plaatst een 2e, 3e order
// Subscription subscribers halen >95% een 2nd order (dat IS de sub), de interessante drop is 2→3
const subscriptionData = [
  { month: "Nov '25", mrr: 1448, activeSubs: 58, newSubs: 10, churnedSubs: 4, churnRate: 6.3, repeat2nd: 64.2, repeat3rd: 38.4, repeat4th: 24.8, arpu: 24.88 },
  { month: "Dec '25", mrr: 1679, activeSubs: 68, newSubs: 14, churnedSubs: 5, churnRate: 6.7, repeat2nd: 66.8, repeat3rd: 40.1, repeat4th: 26.2, arpu: 24.85 },
  { month: "Jan '26", mrr: 1931, activeSubs: 78, newSubs: 15, churnedSubs: 5, churnRate: 5.9, repeat2nd: 68.4, repeat3rd: 42.8, repeat4th: 28.6, arpu: 24.79 },
  { month: "Feb '26", mrr: 2173, activeSubs: 88, newSubs: 14, churnedSubs: 4, churnRate: 5.1, repeat2nd: 70.2, repeat3rd: 44.6, repeat4th: 30.2, arpu: 24.71 },
  { month: "Mar '26", mrr: 2360, activeSubs: 95, newSubs: 12, churnedSubs: 5, churnRate: 5.6, repeat2nd: 72.1, repeat3rd: 46.9, repeat4th: 32.1, arpu: 24.86 },
  { month: "Apr '26", mrr: 2496, activeSubs: 100, newSubs: 12, churnedSubs: 7, churnRate: 6.5, repeat2nd: 73.4, repeat3rd: 48.2, repeat4th: 33.8, arpu: 24.89, current: true },
];

const subscriptionCurrent = subscriptionData[subscriptionData.length - 1];
const subscriptionPrev = subscriptionData[subscriptionData.length - 2];

// Per-market split — from screenshots (April 2026)
const subscriptionByMarket = [
  { market: "NL", flag: "🇳🇱", subs: 19, mrr: 336, currency: "EUR" },
  { market: "UK", flag: "🇬🇧", subs: 81, mrr: 2160, currency: "EUR (from £602k)" },
];

// OpEx breakdown per maand — 5 hoofdcategorieën
// Mock ratios for DTC DTC business: Team/Freelancers ~35%, Content & Partnerships ~22%,
// Agencies ~12%, Software & Tools ~8%, Other (office, travel, legal, insurance, bank, food) ~23%
const opexByMonth = [
  { month: "Nov '25", team: 49, agencies: 17, content: 30, software: 11, other: 32 },
  { month: "Dec '25", team: 51, agencies: 19, content: 39, software: 12, other: 37 },
  { month: "Jan '26", team: 52, agencies: 18, content: 32, software: 13, other: 34 },
  { month: "Feb '26", team: 56, agencies: 19, content: 36, software: 13, other: 35 },
  { month: "Mar '26", team: 60, agencies: 21, content: 41, software: 14, other: 37 },
  { month: "Apr '26", team: 62, agencies: 21, content: 45, software: 15, other: 38, current: true },
];

// Line-item detail per categorie voor de huidige maand (April '26)
// Bedragen realistic DTC mock data
const opexDetail = {
  team: {
    label: "Team",
    color: "#171717",
    description: "Freelancers, management fee, customer service",
    items: [
      { name: "Freelancers — Creative team", amount: 27, source: "Creative" },
      { name: "Freelancer #1 (Operations)", amount: 14, source: "Operations" },
      { name: "Management fee", amount: 11, source: "Management" },
      { name: "Freelancer #2 (Finance)", amount: 5, source: "Finance" },
      { name: "Freelancer #3 (CRO/Dev)", amount: 4, source: "CRO" },
      { name: "Customer service", amount: 2, source: "Support" },
    ],
  },
  agencies: {
    label: "Agencies",
    color: "#6366f1",
    description: "Paid ads, partnerships, fractional CFO",
    items: [
      { name: "Agency A — Paid ads", amount: 14, source: "Paid ads" },
      { name: "Agency B — Partnerships", amount: 4, source: "Partnerships" },
      { name: "Agency C — Fractional CFO", amount: 3, source: "Finance" },
    ],
  },
  content: {
    label: "Content samenwerkingen",
    color: "#f59e0b",
    description: "Creator deals, content shoots, influencer fees",
    items: [
      { name: "Creator #1", amount: 6, source: "Creator" },
      { name: "Creator #2", amount: 11, source: "Freelance creator" },
      { name: "Creator #3", amount: 7, source: "Freelance creator" },
      { name: "Creator #4", amount: 5, source: "Freelance creator" },
      { name: "Creator #5", amount: 5, source: "Freelance creator" },
      { name: "Creator #6", amount: 3, source: "Freelance creator" },
      { name: "Content partner A", amount: 3, source: "Content" },
      { name: "Content partner B", amount: 2, source: "Content" },
      { name: "Content partner C", amount: 1, source: "Content" },
      { name: "Content production — overig", amount: 3, source: "Various" },
    ],
  },
  software: {
    label: "Software",
    color: "#10b981",
    description: "SaaS subscriptions across all teams",
    items: [
      { name: "Email tool", amount: 3, source: "Email" },
      { name: "Creative tool", amount: 2, source: "Creative" },
      { name: "PM tool", amount: 1, source: "Operations" },
      { name: "Analytics tool", amount: 1, source: "Paid ads" },
      { name: "Reviews tool", amount: 1, source: "Other" },
      { name: "Support tool", amount: 1, source: "Customer support" },
      { name: "Docs tool", amount: 1, source: "Creative" },
      { name: "Review tool", amount: 1, source: "Creative" },
      { name: "Slack", amount: 1, source: "Operations" },
      { name: "CRO tool", amount: 1, source: "CRO" },
      { name: "Research tool", amount: 1, source: "Creative" },
      { name: "OpenAI", amount: 1, source: "Operations" },
      { name: "Overige subscriptions", amount: 2, source: "Various" },
    ],
  },
  other: {
    label: "Other costs",
    color: "#6b7280",
    description: "Rent, travel, legal, insurance, bank, food, FX",
    items: [
      { name: "Office rent", amount: 11, source: "Facility" },
      { name: "Travel", amount: 7, source: "Travel" },
      { name: "Legal & admin", amount: 4, source: "Legal" },
      { name: "Food & representation", amount: 2, source: "Office" },
      { name: "Insurance", amount: 1, source: "Insurance" },
      { name: "Currency fees (FX)", amount: 7, source: "Banking" },
      { name: "Bank costs", amount: 1, source: "Banking" },
      { name: "Other", amount: 5, source: "Various" },
    ],
  },
};

/* ============================= PILLAR 4: BALANCE SHEET ============================= */
/* Demo data mirroring a real balance sheet snapshot
   Current snapshot: bank + platforms = €220k, inventory €447k per SKU,
   to-be-paid €3.09M (Supplier + ad network + VAT breakdown).
   Cash forecast peak shown separately in Forecast view. */

const cashPositions = [
  { label: "ING Bank", type: "bank", value: 163, currency: "EUR", note: "Primary NL operating account" },
  { label: "Revolut NL", type: "bank", value: 134, currency: "EUR", note: "EU operational" },
  { label: "Revolut UK", type: "bank", value: 130, currency: "GBP", note: "UK savings" },
  { label: "Revolut USA", type: "bank", value: 0, currency: "USD", note: "US settlements" },
  { label: "Mollie", type: "platform", value: 225, currency: "EUR", note: "Pending payouts (NL/EU orders)" },
  { label: "Shopify (NL + WW)", type: "platform", value: 15, currency: "EUR", note: "Pending payouts" },
  { label: "PayPal", type: "platform", value: 15, currency: "EUR", note: "Pending payouts" },
];

// Inventory per SKU — demo data (fictional DTC health brand) (Supplier supplier)
const inventorySKUs = [
  { sku: "Product A · Type 1", unitCost: 3.6, pieces: 181, value: 652, location: "NL" },
  { sku: "Product C", unitCost: 3.45, pieces: 73, value: 250, location: "NL" },
  { sku: "Product B", unitCost: 4.2, pieces: 43, value: 180, location: "NL" },
  { sku: "Product A · Type 1 UK", unitCost: 3.6, pieces: 24, value: 86, location: "UK" },
  { sku: "Product D", unitCost: 4.05, pieces: 15, value: 60, location: "NL" },
  { sku: "Product E · US", unitCost: 3.6, pieces: 9, value: 33, location: "US" },
  { sku: "Product A · restock", unitCost: 3.86, pieces: 9, value: 36, location: "NL" },
  { sku: "Accessory #3", unitCost: 0.835, pieces: 46, value: 39, location: "NL" },
  { sku: "Accessory #2", unitCost: 1.265, pieces: 25, value: 31, location: "NL" },
  { sku: "Accessory #1", unitCost: 3.45, pieces: 4, value: 12, location: "NL" },
  { sku: "Northstar Tas", unitCost: 4.84, pieces: 1, value: 4, location: "NL" },
];

// Outstanding payments — categorized from the sheet
const outstandingPayments = {
  whisk: {
    label: "Supplier (supplier invoices)",
    total: 2924,
    urgency: "high",
    lastUpdated: "Apr 19, 2026",
    description: "Open purchase invoices — product supplier",
    items: [
      { ref: "INV-0001", date: "Feb 12", amount: 81 },
      { ref: "INV-0002", date: "Feb 12", amount: 37 },
      { ref: "INV-0003", date: "Feb 12", amount: 125 },
      { ref: "INV-0004", date: "Feb 16", amount: 62 },
      { ref: "INV-0005", date: "Feb 16", amount: 63 },
      { ref: "INV-0006", date: "Feb 16", amount: 124 },
      { ref: "INV-0007", date: "Feb 19", amount: 169 },
      { ref: "INV-0008", date: "Feb 22", amount: 72 },
      { ref: "INV-0009", date: "Mar 02", amount: 88 },
      { ref: "INV-0010", date: "Mar 04", amount: 141 },
      { ref: "INV-0011", date: "Mar 04", amount: 73 },
      { ref: "INV-0012", date: "Mar 05", amount: 48 },
      { ref: "INV-0013", date: "Apr 09", amount: 174 },
      { ref: "INV-0014", date: "Mar 12", amount: 121 },
      { ref: "INV-0015", date: "Mar 12", amount: 1 },
      { ref: "INV-0016", date: "Mar 12", amount: 122 },
      { ref: "INV-0017", date: "Mar 16", amount: 200 },
      { ref: "INV-0018", date: "Mar 16", amount: 73 },
      { ref: "INV-0019", date: "Mar 19", amount: 48 },
      { ref: "INV-0020", date: "Mar 23", amount: 152 },
      { ref: "INV-0021", date: "Mar 25", amount: 120 },
      { ref: "INV-0022", date: "Mar 26", amount: 181 },
      { ref: "INV-0023", date: "Mar 26", amount: 124 },
      { ref: "INV-0024", date: "Mar 27", amount: 73 },
      { ref: "INV-0025", date: "Apr 04", amount: 121 },
      { ref: "INV-0026", date: "Apr 09", amount: 287 },
    ],
  },
  meta: {
    label: "Ad network (billing)",
    total: 3437,
    urgency: "high",
    lastUpdated: "Apr 12, 2026",
    description: "Open Facebook/Instagram ad invoices",
    items: [
      { ref: "Invoice #A001", date: "Open", amount: 594 },
      { ref: "Invoice #A002", date: "Open", amount: 23 },
      { ref: "Invoice #A003", date: "Open", amount: 1736 },
      { ref: "Invoice #A004", date: "Open", amount: 5 },
      { ref: "Till 12-04 accrual", date: "Apr 12", amount: 1079 },
    ],
  },
  vat: {
    label: "VAT & corporate tax",
    total: 3183,
    urgency: "medium",
    lastUpdated: "Apr 12, 2026",
    description: "VAT obligations across NL/EU/UK + VPB",
    items: [
      { ref: "UK VAT 2026", date: "Accruing", amount: 2042 },
      { ref: "VPB 2026 (corporate tax)", date: "Accruing", amount: 756 },
      { ref: "UK VAT 2025", date: "Due", amount: 388 },
      { ref: "VPB 2025", date: "Due", amount: 118 },
      { ref: "Q1 2026 NL + EU VAT", date: "Credit", amount: -38841 },
    ],
  },
  other: {
    label: "Affiliates & partners",
    total: 42,
    urgency: "low",
    lastUpdated: "Apr 12, 2026",
    description: "Affiliate B, Affiliate A, misc small invoices",
    items: [
      { ref: "Affiliate A (till Apr 07)", date: "Apr 07", amount: 25 },
      { ref: "Affiliate B", date: "Open", amount: 8 },
      { ref: "Order #A1", date: "Open", amount: 10 },
    ],
  },
};

const totalOutstanding = Object.values(outstandingPayments).reduce((s, c) => s + c.total, 0);
const totalCash = cashPositions.reduce((s, p) => s + p.value, 0);
const totalInventory = inventorySKUs.reduce((s, i) => s + i.value, 0);

// Weekly cash balance history — 26 weeks trailing
// Three perspectives: pure cash, cash-after-debt, assets-after-debt
const weeklyCashBalance = [
  { week: "W42", label: "Oct 12–18", cash: 1120, cashMinusDebt: -63, assetsMinusDebt: 0 },
  { week: "W43", label: "Oct 19–25", cash: 1268, cashMinusDebt: -45, assetsMinusDebt: 0 },
  { week: "W44", label: "Oct 26–Nov 1", cash: 1503, cashMinusDebt: 149, assetsMinusDebt: 0 },
  { week: "W45", label: "Nov 2–8", cash: 882, cashMinusDebt: -89, assetsMinusDebt: 0 },
  { week: "W46", label: "Nov 9–15", cash: 1077, cashMinusDebt: 108, assetsMinusDebt: 0 },
  { week: "W47", label: "Nov 16–22", cash: 1333, cashMinusDebt: 0, assetsMinusDebt: 0 },
  { week: "W48", label: "Nov 23–29", cash: 2005, cashMinusDebt: -165, assetsMinusDebt: 0 },
  { week: "W49", label: "Nov 30–Dec 6", cash: 2104, cashMinusDebt: 129, assetsMinusDebt: 0 },
  { week: "W50", label: "Dec 7–13", cash: 2283, cashMinusDebt: 205, assetsMinusDebt: 0 },
  { week: "W51", label: "Dec 14–20", cash: 2589, cashMinusDebt: 306, assetsMinusDebt: 0 },
  { week: "W52", label: "Dec 21–27", cash: 2864, cashMinusDebt: -310, assetsMinusDebt: 0 },
  { week: "W53", label: "Dec 28–Jan 3", cash: 3919, cashMinusDebt: 33, assetsMinusDebt: 1515 },
  { week: "W1", label: "Jan 4–10", cash: 4145, cashMinusDebt: 661, assetsMinusDebt: 1845 },
  { week: "W2", label: "Jan 11–17", cash: 4315, cashMinusDebt: 684, assetsMinusDebt: 2044 },
  { week: "W3", label: "Jan 18–24", cash: 5104, cashMinusDebt: 915, assetsMinusDebt: 1893 },
  { week: "W4", label: "Jan 25–31", cash: 4863, cashMinusDebt: 889, assetsMinusDebt: 1775 },
  { week: "W5", label: "Feb 1–7", cash: 5871, cashMinusDebt: 686, assetsMinusDebt: 1610 },
  { week: "W6", label: "Feb 8–14", cash: 6335, cashMinusDebt: 627, assetsMinusDebt: 1556 },
  { week: "W7", label: "Feb 15–21", cash: 5955, cashMinusDebt: 638, assetsMinusDebt: 1904 },
  { week: "W8", label: "Feb 22–28", cash: 5924, cashMinusDebt: 1026, assetsMinusDebt: 1914 },
  { week: "W9", label: "Mar 1–7", cash: 7059, cashMinusDebt: 923, assetsMinusDebt: 1998 },
  { week: "W10", label: "Mar 8–14", cash: 7823, cashMinusDebt: 852, assetsMinusDebt: 2094 },
  { week: "W11", label: "Mar 15–21", cash: 8222, cashMinusDebt: 807, assetsMinusDebt: 2309 },
  { week: "W12", label: "Mar 22–28", cash: 7514, cashMinusDebt: 826, assetsMinusDebt: 2408 },
  { week: "W13", label: "Mar 29–Apr 4", cash: 8473, cashMinusDebt: 1028, assetsMinusDebt: 2628 },
  { week: "W14", label: "Apr 5–11", cash: 9197, cashMinusDebt: 1347, assetsMinusDebt: 2784 },
  { week: "W15", label: "Apr 12–18", cash: 10944, cashMinusDebt: 1824, assetsMinusDebt: 2986 },
  { week: "W16", label: "Apr 19–25", cash: 10982, cashMinusDebt: 1454, assetsMinusDebt: 2933, current: true },
];

const balanceSheet = {
  assets: {
    current: [
      { label: "Cash — Bank accounts", value: cashPositions.filter(p => p.type === "bank").reduce((s, p) => s + p.value, 0), detail: "ING + Revolut (EUR/GBP)" },
      { label: "Platform receivables", value: cashPositions.filter(p => p.type === "platform").reduce((s, p) => s + p.value, 0), detail: "Mollie + Shopify + PayPal pending payouts" },
      { label: "Inventory (at cost)", value: totalInventory, detail: `${inventorySKUs.length} SKUs across NL/UK/US` },
      { label: "Prepaid expenses", value: 39, detail: "Rent, software, insurance" },
    ],
    fixed: [
      { label: "Equipment & hardware", value: 77 },
      { label: "Less: accumulated depreciation", value: -8420 },
    ],
  },
  liabilities: {
    current: [
      { label: "Accounts payable — Supplier", value: outstandingPayments.whisk.total, detail: "Product supplier" },
      { label: "Accounts payable — META", value: outstandingPayments.meta.total, detail: "Ad spend billing" },
      { label: "VAT payable", value: outstandingPayments.vat.total, detail: "NL/EU/UK + VPB" },
      { label: "Other payables", value: outstandingPayments.other.total, detail: "Affiliates, partners" },
      { label: "Accrued expenses", value: 77, detail: "Salaries, utilities" },
    ],
    longTerm: [
      { label: "Long-term loan", value: 0, detail: "None" },
    ],
  },
  equity: [
    { label: "Share capital", value: 56 },
    { label: "Retained earnings", value: 1302 },
    { label: "Current period result (YTD)", value: 2380, detail: "EBITDA Q1 2026" },
  ],
};

const balanceRatios = [
  { label: "Current ratio", value: 0.30, target: 1.5, status: "critical", note: "Current assets vs current liabilities" },
  { label: "Quick ratio", value: 0.10, target: 1.0, status: "critical", note: "Excludes inventory" },
  { label: "Cash position", value: totalCash, suffix: "€", status: "warning", note: "Bank + platforms" },
  { label: "Inventory days", value: 48, suffix: "days", target: 45, status: "warning", note: "Target: 30-45" },
];

/* ============================= PILLAR 5: FORECAST ============================= */

// 13-week cashflow
const cashflow13w = Array.from({ length: 13 }, (_, w) => {
  const weekIn = 99 + Math.sin(w / 4) * 6000 + Math.random() * 4000;
  const weekOut = 80 + Math.cos(w / 5) * 3000 + Math.random() * 2000;
  return {
    week: `W${w + 17}`,
    inflow: Math.round(weekIn),
    outflow: -Math.round(weekOut),
    net: Math.round(weekIn - weekOut),
    cumulative: 0, // Will calculate below
  };
});
let cumul = 150;
cashflow13w.forEach(w => { cumul += w.net; w.cumulative = cumul; });

// 12-month forecast
const forecast12m = Array.from({ length: 12 }, (_, m) => {
  const month = new Date();
  month.setMonth(month.getMonth() + m);
  const base = 439 * (1 + m * 0.04);
  const seasonal = m === 7 || m === 8 ? 1.35 : m === 11 ? 0.75 : 1; // dec peak, summer dip
  const revenue = Math.round(base * seasonal);
  return {
    month: month.toLocaleDateString("en-US", { month: "short" }),
    revenue,
    revenueLow: Math.round(revenue * 0.82),
    revenueHigh: Math.round(revenue * 1.18),
    profit: Math.round(revenue * 0.13),
    profitLow: Math.round(revenue * 0.08),
    profitHigh: Math.round(revenue * 0.18),
  };
});

// ========== GROWTH PLAN 2026 — 12-month revenue forecast per market ==========
// Source: Northstar Growth Plan PDF (NL + UK + US markets, monthly targets Jan-Dec)
const growthPlan = [
  // Jan
  { month: "Jan", nl: 2904, uk: 2858, us: 5, marketingNL: 863, marketingUK: 1071, marketingUS: 0, profitNL: 1314, profitUK: 1073, profitUS: 4 },
  // Feb
  { month: "Feb", nl: 2029, uk: 2722, us: 5, marketingNL: 656, marketingUK: 1185, marketingUS: 0, profitNL: 866, profitUK: 857, profitUS: 4 },
  // Mar
  { month: "Mar", nl: 2320, uk: 3712, us: 5, marketingNL: 806, marketingUK: 1615, marketingUS: 0, profitNL: 934, profitUK: 1169, profitUS: 4 },
  // Apr (current month - partial)
  { month: "Apr", nl: 2422, uk: 4265, us: 155, marketingNL: 838, marketingUK: 1819, marketingUS: 155, profitNL: 979, profitUK: 1380, profitUS: -12489, current: true },
  // May
  { month: "May", nl: 2629, uk: 4713, us: 402, marketingNL: 930, marketingUK: 1980, marketingUS: 309, profitNL: 1042, profitUK: 1555, profitUS: -2475 },
  // Jun
  { month: "Jun", nl: 2315, uk: 5250, us: 758, marketingNL: 721, marketingUK: 2233, marketingUS: 541, profitNL: 1016, profitUK: 1704, profitUS: 27 },
  // Jul
  { month: "Jul", nl: 2426, uk: 5551, us: 1733, marketingNL: 773, marketingUK: 2345, marketingUS: 1083, profitNL: 1047, profitUK: 1819, profitUS: 217 },
  // Aug
  { month: "Aug", nl: 2629, uk: 5888, us: 3465, marketingNL: 866, marketingUK: 2475, marketingUS: 2165, profitNL: 1105, profitUK: 1942, profitUS: 433 },
  // Sep
  { month: "Sep", nl: 2540, uk: 6029, us: 4950, marketingNL: 773, marketingUK: 2475, marketingUS: 3093, profitNL: 1132, profitUK: 2047, profitUS: 619 },
  // Oct
  { month: "Oct", nl: 3156, uk: 6245, us: 5940, marketingNL: 1092, marketingUK: 2475, marketingUS: 3712, profitNL: 1275, profitUK: 2209, profitUS: 743 },
  // Nov
  { month: "Nov", nl: 4211, uk: 8425, us: 7890, marketingNL: 1636, marketingUK: 3403, marketingUS: 4640, profitNL: 1522, profitUK: 2916, profitUS: 1277 },
  // Dec
  { month: "Dec", nl: 2926, uk: 6580, us: 6837, marketingNL: 1364, marketingUK: 2602, marketingUS: 4021, profitNL: 831, profitUK: 2333, profitUS: 1107 },
];

// Totals from the plan
const growthPlanTotals = {
  revenueNL: 32508,
  revenueUK: 62239,
  revenueUS: 32130,
  profitNL: 13062,
  profitUK: 21004,
  profitUS: 4377,
  marketingNL: 11319,
  marketingUK: 25676,
  marketingUS: 19720,
  get totalRevenue() { return this.revenueNL + this.revenueUK + this.revenueUS; },
  get totalProfit() { return this.profitNL + this.profitUK + this.profitUS; },
  get totalMarketing() { return this.marketingNL + this.marketingUK + this.marketingUS; },
};

/* =========================================================================
   HELPERS
   ========================================================================= */

const formatValue = (value, format) => {
  switch (format) {
    case "currency":
      return `€${value.toLocaleString(undefined, { minimumFractionDigits: value % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "multiplier":
      return `${value.toFixed(2)}x`;
    case "decimal":
      return value.toFixed(2);
    case "number":
    default:
      return value.toLocaleString();
  }
};

const fmtCurrency = (n) => `€${Math.abs(n).toLocaleString()}`;
const fmtSigned = (n) => (n >= 0 ? `+€${n.toLocaleString()}` : `-€${Math.abs(n).toLocaleString()}`);

/* =========================================================================
   SMALL UI COMPONENTS
   ========================================================================= */

const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl border border-neutral-200/70 bg-white ${className}`}>
    {children}
  </div>
);

const Chip = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
      active ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
    }`}
  >
    {children}
  </button>
);

const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`group flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] font-medium transition ${
      active ? "bg-neutral-100 text-neutral-900" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
    }`}
  >
    <span className="flex items-center gap-2.5">
      <Icon size={14} strokeWidth={2} />
      {label}
    </span>
    {badge && (
      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
        {badge}
      </span>
    )}
  </button>
);

const StatusDot = ({ status }) => {
  const colors = {
    ok: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
  };
  return (
    <span className="relative flex h-2 w-2">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${colors[status]} opacity-40`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${colors[status]}`} />
    </span>
  );
};

/* =========================================================================
   BRAND ICONS — small source indicators
   ========================================================================= */

const BrandIcon = ({ brand, size = 14, className = "" }) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", className };
  switch (brand) {
    case "shopify":
      return (
        <svg {...common}>
          <path fill="#95BF47" d="M15.337 3.967c-.026-.22-.22-.34-.38-.352-.156-.01-3.115-.054-3.115-.054s-2.478-2.407-2.724-2.652c-.246-.246-.726-.171-.913-.115-.003 0-.469.145-1.243.385-.13-.422-.322-.94-.596-1.46C5.486.188 4.31-.086 3.59.021c-.017.004-.085.028-.106.033C3.424.014 3.225-.032 3.004.02 2.583.115 2.22.387 1.973.783 1.621 1.35 1.424 2.17 1.37 3.355.49 3.627.015 3.78 0 3.78l4.635 15.894 13.253-2.895s-2.544-17.035-2.551-17.063zM9.24 2.58c-.596.183-1.25.387-1.905.59.187-.717.547-1.43 1.016-1.864.173-.16.404-.34.681-.444.26.545.37 1.322.208 1.718zm-2.26.699a20.76 20.76 0 0 0-2.03.629c.18-.868.523-1.735.942-2.307.155-.213.374-.45.631-.583.24.507.293 1.223.207 1.742zm-1.59-2.71c.242-.1.515-.115.69-.099-.253.129-.505.34-.739.619-.548.65-.972 1.66-1.14 2.636-.512.158-1.012.313-1.473.455.298-1.39 1.463-3.574 2.662-3.611zm1.41 8.957c.056.864 2.318 1.05 2.446 3.08.1 1.595-.846 2.686-2.21 2.771-1.636.103-2.538-.863-2.538-.863l.346-1.474s.908.686 1.632.64c.474-.03.644-.414.627-.686-.073-1.128-1.915-1.06-2.033-2.917-.098-1.561 1.023-3.145 3.265-3.287 1.057-.067 1.599.203 1.599.203l-.474 2.168s-.692-.317-1.513-.265c-1.204.076-1.217.837-1.204 1.08l.057.55zm5.64-5.93c-.6.185-1.193.368-1.78.55.005-.2.009-.393.009-.606 0-.56-.078-1.01-.202-1.365.5.064.842.644.99 1.135.08.273.15.549.209.826.148.047.293.094.437.14-.168-.19-.33-.393-.482-.613.282.07.56.15.834.226-.004.007-.01.012-.015.02-.237-.086-.48-.16-.725-.22.17.243.325.484.464.713zM19.32 2.1s-.85-.015-1.31-.018c.075.054.137.12.21.183l2.33 2.19c-.41.125-.826.252-1.23.375l-.245-1.66c-.015-.086-.105-.146-.165-.15-.12-.015-.7-.022-.725-.022-.045 0-.06.015-.09.045l-.265.09s.42-.135 1.49-.75z"/>
          <path fill="#5E8E3E" d="M15.337 3.967c-.026-.22-.22-.34-.38-.352-.156-.01-3.115-.054-3.115-.054l-.008 15.912 6.5-1.42-2.997-14.086z"/>
        </svg>
      );
    case "loop":
      return (
        <svg {...common} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="7" fill="#7C3AED"/>
          <path d="M9 13.5c0 1.933 1.567 3.5 3.5 3.5s3.5-1.567 3.5-3.5M16 13.5c0 1.933 1.567 3.5 3.5 3.5S23 15.433 23 13.5s-1.567-3.5-3.5-3.5-3.5 1.567-3.5 3.5zM9 13.5c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5v5.5c0 1.38-1.12 2.5-2.5 2.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      );
    case "triplewhale":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="5" fill="#1a1a2e"/>
          <path d="M5 10 L8 14 L12 8 L16 14 L19 10" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      );
    case "ing":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="3" fill="#FF6200"/>
          <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="Arial">ING</text>
        </svg>
      );
    case "revolut":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="3" fill="#000"/>
          <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff" fontFamily="Georgia, serif" fontStyle="italic">R</text>
        </svg>
      );
    case "mollie":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="5" fill="#000"/>
          <circle cx="9" cy="12" r="2.5" fill="#fff"/>
          <circle cx="15" cy="12" r="2.5" fill="#fff"/>
        </svg>
      );
    case "paypal":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="3" fill="#fff" stroke="#e5e5e5" strokeWidth="0.5"/>
          <path d="M9.5 7h4c2 0 3 1 2.7 2.7-.4 2.2-2 3.3-4.3 3.3h-1.2l-.5 3.2a.5.5 0 0 1-.5.4H8.5a.3.3 0 0 1-.3-.4L9.5 7z" fill="#003087"/>
          <path d="M10.8 8.5h3c1.3 0 2 .7 1.8 1.9-.3 1.5-1.3 2.3-3 2.3h-1L11 15c0 .2-.2.3-.3.3H9.5a.3.3 0 0 1-.3-.4l1.6-6.4z" fill="#009CDE"/>
        </svg>
      );
    case "jortt":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="4" fill="#00A6A6"/>
          <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="Arial">J</text>
        </svg>
      );
    default:
      return null;
  }
};

/* =========================================================================
   VIEW: OVERVIEW
   ========================================================================= */

const OverviewView = ({ range, setRange, data, totals }) => (
  <>
    <div className="flex items-end justify-between">
      <div>
        <div className="text-[12px] font-medium text-neutral-400">Overview</div>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Finance</h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Live revenue from Shopify, ad performance from Triple Whale, reconciled nightly against Jortt.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white p-0.5">
          <Chip active={range === "7d"} onClick={() => setRange("7d")}>7D</Chip>
          <Chip active={range === "30d"} onClick={() => setRange("30d")}>30D</Chip>
          <Chip active={range === "90d"} onClick={() => setRange("90d")}>90D</Chip>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50">
          <Calendar size={13} />
          Custom
        </button>
      </div>
    </div>

    {/* Hero: today's profit */}
    <Card className="mt-6 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="border-b border-neutral-100 p-6 lg:col-span-2 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Today's profit (est.)</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
              <span className="h-1 w-1 rounded-full bg-neutral-500" />
              Shopify + TW · Jortt T-1
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-[42px] font-semibold tracking-tight tabular-nums">€7</span>
            <span className="text-[13px] font-medium text-emerald-600">+18.2%</span>
          </div>
          <div className="mt-1 text-[12px] text-neutral-400">vs. yesterday €6 · 30-day avg €6</div>
          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-neutral-100 pt-4">
            <div>
              <div className="text-[11px] text-neutral-400">This week</div>
              <div className="mt-0.5 text-[15px] font-semibold tabular-nums">€41</div>
            </div>
            <div>
              <div className="text-[11px] text-neutral-400">MTD</div>
              <div className="mt-0.5 text-[15px] font-semibold tabular-nums">€97</div>
            </div>
            <div>
              <div className="text-[11px] text-neutral-400">YTD</div>
              <div className="mt-0.5 text-[15px] font-semibold tabular-nums">€570</div>
            </div>
          </div>
        </div>
        <div className="p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-neutral-400">30-day rolling profit</span>
            <span className="text-[11px] text-neutral-400">Daily</span>
          </div>
          <div className="mt-3 h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} interval={Math.floor(data.length / 5)} />
                <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12, padding: "8px 10px" }}
                  formatter={(v) => [`€${v.toLocaleString()}`, "Profit"]}
                />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={1.75} fill="url(#profitArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>

    {/* Revenue hero */}
    <section className="mt-3">
      <Card className="p-6 transition hover:border-neutral-300">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-medium text-neutral-500">
              <BrandIcon brand="shopify" size={14} />
              <span>Revenue</span>
              <span className="text-[11px] text-neutral-400">· selected period</span>
            </div>
            <div className="mt-3 flex items-baseline gap-4">
              <span className="text-[44px] font-semibold tracking-tight tabular-nums leading-none">
                €{totals.revenue.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-2 py-1 text-[13px] font-medium text-emerald-700">
                <ArrowUpRight size={13} strokeWidth={2.5} />
                12.4%
              </span>
            </div>
            <div className="mt-1 text-[12px] text-neutral-400">vs. previous period · Shopify live</div>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Orders</div>
              <div className="mt-0.5 text-[16px] font-semibold tabular-nums">4</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">AOV</div>
              <div className="mt-0.5 text-[16px] font-semibold tabular-nums">€0.34</div>
            </div>
          </div>
        </div>
      </Card>
    </section>

    {/* Profit row — contribution margin, opex, EBITDA */}
    <section className="mt-3 grid grid-cols-3 gap-3">
      {[
        {
          icon: Sparkles,
          label: "Contribution margin",
          value: `€${Math.round(totals.profit * 1.42).toLocaleString()}`,
          delta: "9.4%",
          positive: true,
          sub: `${(((totals.profit * 1.42) / totals.revenue) * 100).toFixed(1)}% of revenue`,
        },
        {
          icon: Wallet,
          label: "OpEx",
          value: `€${Math.round(totals.revenue * 0.18).toLocaleString()}`,
          delta: "2.8%",
          positive: false,
          sub: "Team, software, agencies, other",
        },
        {
          icon: TrendingUp,
          label: "EBITDA",
          value: `€${totals.profit.toLocaleString()}`,
          delta: "8.1%",
          positive: true,
          sub: `Margin ${((totals.profit / totals.revenue) * 100).toFixed(1)}%`,
        },
      ].map((s) => (
        <Card key={s.label} className="p-5 transition hover:border-neutral-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-medium text-neutral-500">
              <s.icon size={14} />
              <span>{s.label}</span>
            </div>
            <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${s.positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {s.positive ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
              {s.delta}
            </span>
          </div>
          <div className="mt-3 text-[28px] font-semibold tracking-tight tabular-nums">{s.value}</div>
          <div className="mt-1 text-[12px] text-neutral-400">{s.sub}</div>
        </Card>
      ))}
    </section>

    {/* Customer economics row */}
    <section className="mt-3">
      <div className="mb-2 flex items-center gap-2 px-1">
        <BrandIcon brand="triplewhale" size={12} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Customer economics</span>
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-[10px] text-neutral-400">Triple Whale · per acquired customer</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "NCPA",
            fullLabel: "New Customer Acquisition Cost",
            value: "€32.84",
            delta: "4.2%",
            positive: false,
            sub: "Ad spend ÷ new customers",
            icon: Target,
          },
          {
            label: "90D LTV",
            fullLabel: "Lifetime value · 90 days",
            value: "€68.40",
            delta: "6.8%",
            positive: true,
            sub: "2.08× NCPA payback",
            icon: TrendingUp,
          },
          {
            label: "365D LTV",
            fullLabel: "Lifetime value · 365 days",
            value: "€184.20",
            delta: "11.4%",
            positive: true,
            sub: "5.61× NCPA · healthy",
            icon: Sparkles,
          },
        ].map((s) => (
          <Card key={s.label} className="p-4 transition hover:border-neutral-300">
            <div className="flex items-start justify-between gap-1">
              <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-neutral-500">
                <s.icon size={13} className="shrink-0" />
                <span className="truncate">{s.label}</span>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${s.positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {s.positive ? <ArrowUpRight size={10} strokeWidth={2.5} /> : <ArrowDownRight size={10} strokeWidth={2.5} />}
                {s.delta}
              </span>
            </div>
            <div className="mt-2 text-[22px] font-semibold tracking-tight tabular-nums">{s.value}</div>
            <div className="mt-0.5 text-[10px] text-neutral-400 truncate">{s.fullLabel}</div>
            <div className="text-[11px] text-neutral-400">{s.sub}</div>
          </Card>
        ))}
      </div>
    </section>

    {/* Marketing efficiency row */}
    <section className="mt-3">
      <div className="mb-2 flex items-center gap-2 px-1">
        <BrandIcon brand="triplewhale" size={12} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Marketing efficiency</span>
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-[10px] text-neutral-400">Source: Triple Whale</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: Target,
            label: "Ad spend",
            value: `€${totals.adSpend.toLocaleString()}`,
            delta: "3.2%",
            positive: false,
            sub: "Meta, Google, TikTok, affiliate",
          },
          {
            icon: Activity,
            label: "Blended ROAS",
            value: `${totals.roas.toFixed(2)}x`,
            delta: "0.4x",
            positive: true,
            sub: "Break-even at 2.10x",
          },
        ].map((s) => (
          <Card key={s.label} className="p-4 transition hover:border-neutral-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] font-medium text-neutral-500">
                <s.icon size={13} />
                <span>{s.label}</span>
              </div>
              <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${s.positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {s.positive ? <ArrowUpRight size={10} strokeWidth={2.5} /> : <ArrowDownRight size={10} strokeWidth={2.5} />}
                {s.delta}
              </span>
            </div>
            <div className="mt-2 text-[22px] font-semibold tracking-tight tabular-nums">{s.value}</div>
            <div className="mt-0.5 text-[11px] text-neutral-400">{s.sub}</div>
          </Card>
        ))}
      </div>
    </section>

    {/* Subscriptions / MRR section */}
    <Card className="mt-3 overflow-hidden">
      <div className="border-b border-neutral-100 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BrandIcon brand="loop" size={16} />
              <div className="text-[13px] font-semibold">Subscriptions</div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                Recurring
              </span>
            </div>
            <div className="mt-0.5 text-[12px] text-neutral-400">
              MRR, active subscribers, churn · source: Loop (NL + UK)
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Subscription share</div>
            <div className="text-[18px] font-semibold tabular-nums">45.0%</div>
            <div className="text-[10px] text-neutral-400">Of total revenue</div>
          </div>
        </div>
      </div>

      {/* MRR KPI tiles */}
      <div className="grid grid-cols-2 divide-x divide-y divide-neutral-100 border-b border-neutral-100 md:grid-cols-4 md:divide-y-0">
        {[
          {
            label: "MRR",
            value: `€${(subscriptionCurrent.mrr / 1000).toFixed(1)}k`,
            prev: subscriptionPrev.mrr,
            current: subscriptionCurrent.mrr,
            sub: `€${subscriptionCurrent.mrr.toLocaleString()} recurring`,
            invertGood: false,
          },
          {
            label: "Active subscribers",
            value: subscriptionCurrent.activeSubs.toLocaleString(),
            prev: subscriptionPrev.activeSubs,
            current: subscriptionCurrent.activeSubs,
            sub: `ARPU €${subscriptionCurrent.arpu.toFixed(2)}/mo`,
            invertGood: false,
          },
          {
            label: "Churn rate",
            value: `${subscriptionCurrent.churnRate.toFixed(1)}%`,
            prev: subscriptionPrev.churnRate,
            current: subscriptionCurrent.churnRate,
            sub: `${subscriptionCurrent.churnedSubs} lost this month`,
            invertGood: true,
          },
          {
            label: "Repeat to 3rd order",
            value: `${subscriptionCurrent.repeat3rd.toFixed(1)}%`,
            prev: subscriptionPrev.repeat3rd,
            current: subscriptionCurrent.repeat3rd,
            sub: "Of first-time buyers",
            invertGood: false,
          },
        ].map((m) => {
          const delta = ((m.current - m.prev) / m.prev) * 100;
          const isImproving = m.invertGood ? delta < 0 : delta > 0;
          return (
            <div key={m.label} className="p-5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">{m.label}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[22px] font-semibold tabular-nums">{m.value}</span>
                <span className={`text-[11px] font-medium ${isImproving ? "text-emerald-600" : "text-rose-600"}`}>
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(1)}%
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-400">{m.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Market split */}
      <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/40 px-5 py-3 text-[11px]">
        <span className="font-medium text-neutral-500">Split:</span>
        {subscriptionByMarket.map((m, idx) => {
          const share = (m.mrr / (subscriptionByMarket[0].mrr + subscriptionByMarket[1].mrr)) * 100;
          return (
            <React.Fragment key={m.market}>
              <div className="flex items-center gap-1.5">
                <span>{m.flag}</span>
                <span className="font-medium text-neutral-700">{m.market}</span>
                <span className="text-neutral-500">
                  {m.subs.toLocaleString()} subs · €{(m.mrr / 1000).toFixed(0)}k MRR
                </span>
                <span className="rounded-full bg-neutral-200/60 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                  {share.toFixed(0)}%
                </span>
              </div>
              {idx < subscriptionByMarket.length - 1 && <span className="text-neutral-300">·</span>}
            </React.Fragment>
          );
        })}
      </div>

      {/* Repeat purchase funnel */}
      <div className="border-b border-neutral-100 bg-neutral-50/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold text-neutral-700">Repeat purchase funnel</div>
            <div className="text-[11px] text-neutral-400">Cohort of first-time buyers from 90 days ago · tracks how many came back</div>
          </div>
          <div className="text-[10px] text-neutral-400">Cohort size: 30 first-time buyers</div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { stage: "1st order", label: "First purchase", pct: 100, count: 30, drop: null, color: "#171717" },
            { stage: "2nd order", label: "Repeat to 2nd", pct: subscriptionCurrent.repeat2nd, count: Math.round(30 * subscriptionCurrent.repeat2nd / 100), drop: 100 - subscriptionCurrent.repeat2nd, color: "#6366f1" },
            { stage: "3rd order", label: "Repeat to 3rd", pct: subscriptionCurrent.repeat3rd, count: Math.round(30 * subscriptionCurrent.repeat3rd / 100), drop: subscriptionCurrent.repeat2nd - subscriptionCurrent.repeat3rd, color: "#8b5cf6" },
            { stage: "4th order", label: "Repeat to 4th", pct: subscriptionCurrent.repeat4th, count: Math.round(30 * subscriptionCurrent.repeat4th / 100), drop: subscriptionCurrent.repeat3rd - subscriptionCurrent.repeat4th, color: "#a855f7" },
          ].map((step, idx) => {
            const prevKey = idx === 0 ? null : idx === 1 ? "repeat2nd" : idx === 2 ? "repeat3rd" : "repeat4th";
            const prevPct = prevKey ? subscriptionPrev[prevKey] : null;
            const delta = prevPct !== null ? step.pct - prevPct : null;
            return (
              <div key={step.stage} className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: step.color }} />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{step.stage}</span>
                  </div>
                  {delta !== null && (
                    <span className={`text-[10px] font-medium ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {delta >= 0 ? "+" : ""}{delta.toFixed(1)}pp
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[22px] font-semibold tabular-nums">{step.pct.toFixed(1)}%</span>
                  <span className="text-[11px] text-neutral-500">{step.label}</span>
                </div>
                <div className="mt-1 text-[11px] text-neutral-400 tabular-nums">
                  {step.count.toLocaleString()} customers
                  {step.drop !== null && <span className="ml-1 text-rose-500">· -{step.drop.toFixed(1)}pp</span>}
                </div>
                {/* Funnel bar */}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full transition-all" style={{ width: `${step.pct}%`, background: step.color }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Expandable "see more" drawer */}
        <details className="mt-3 group rounded-lg border border-neutral-200 bg-white">
          <summary className="flex cursor-pointer items-center justify-between p-4 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50">
            <span className="flex items-center gap-2">
              <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
              See deeper cohort analysis
            </span>
            <span className="text-[11px] text-neutral-400">5th+ orders, cohort-by-cohort, LTV projection</span>
          </summary>
          <div className="border-t border-neutral-100 p-5">
            {/* Extended funnel: 5th, 6th, 7th+ */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { stage: "5th order", pct: 24.2, count: 2420, color: "#c084fc" },
                { stage: "6th order", pct: 17.8, count: 1780, color: "#d8b4fe" },
                { stage: "7th+ orders", pct: 12.4, count: 1240, color: "#e9d5ff" },
              ].map((step) => (
                <div key={step.stage} className="rounded-lg border border-neutral-200 p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: step.color }} />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{step.stage}</span>
                  </div>
                  <div className="mt-1.5 text-[18px] font-semibold tabular-nums">{step.pct.toFixed(1)}%</div>
                  <div className="text-[10px] text-neutral-400 tabular-nums">{step.count.toLocaleString()} customers</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full" style={{ width: `${step.pct}%`, background: step.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Cohort comparison table */}
            <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                    <th className="px-3 py-2">Cohort</th>
                    <th className="px-3 py-2 text-right">Size</th>
                    <th className="px-3 py-2 text-right">2nd</th>
                    <th className="px-3 py-2 text-right">3rd</th>
                    <th className="px-3 py-2 text-right">4th</th>
                    <th className="px-3 py-2 text-right">Avg orders</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { cohort: "Jan '26", size: 30, r2: 72.4, r3: 47.1, r4: 32.8, avg: 2.84 },
                    { cohort: "Feb '26", size: 32, r2: 73.1, r3: 47.8, r4: 33.2, avg: 2.89 },
                    { cohort: "Mar '26", size: 35, r2: 73.4, r3: 48.2, r4: 33.8, avg: 2.92 },
                    { cohort: "Apr '26 (MTD)", size: 23, r2: null, r3: null, r4: null, avg: null, partial: true },
                  ].map(c => (
                    <tr key={c.cohort} className={`border-b border-neutral-100 last:border-0 ${c.partial ? "bg-amber-50/30" : "hover:bg-neutral-50/50"}`}>
                      <td className="px-3 py-2 font-medium text-neutral-700">{c.cohort}{c.partial && <span className="ml-1 text-[9px] text-amber-700">still maturing</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-neutral-500">{c.size.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.r2 !== null ? `${c.r2}%` : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.r3 !== null ? `${c.r3}%` : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.r4 !== null ? `${c.r4}%` : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{c.avg !== null ? c.avg.toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-neutral-400">
              <Info size={11} />
              Cohorts need at least 90 days to fully mature for 3rd/4th order data.
            </div>
          </div>
        </details>

        {/* Trend of repeat rates */}
        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-medium text-neutral-500">Repeat rate trend — 6 months</div>
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                <span className="text-neutral-500">2nd</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                <span className="text-neutral-500">3rd</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-400" />
                <span className="text-neutral-500">4th</span>
              </div>
            </div>
          </div>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={subscriptionData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#a3a3a3", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a3a3a3", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[20, 80]} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 }}
                  formatter={(v, name) => [`${v}%`, name === "repeat2nd" ? "2nd order" : name === "repeat3rd" ? "3rd order" : "4th order"]}
                />
                <Line type="monotone" dataKey="repeat2nd" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: "#6366f1" }} />
                <Line type="monotone" dataKey="repeat3rd" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: "#8b5cf6" }} />
                <Line type="monotone" dataKey="repeat4th" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: "#a855f7" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two-column: MRR trend + churn/new subs */}
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        {/* MRR + Active Subscribers trend */}
        <div className="border-b border-neutral-100 p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-medium text-neutral-500">MRR & active subscribers</div>
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-neutral-900" />
                <span className="text-neutral-500">MRR</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                <span className="text-neutral-500">Subscribers</span>
              </div>
            </div>
          </div>
          <div className="mt-3 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={subscriptionData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "#a3a3a3", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `€${v / 1000}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#a3a3a3", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 }}
                  formatter={(v, name) =>
                    name === "MRR" ? [`€${v.toLocaleString()}`, name] : [v.toLocaleString(), name]
                  }
                />
                <Bar yAxisId="left" dataKey="mrr" name="MRR" fill="#171717" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="activeSubs"
                  name="Active subscribers"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#8b5cf6" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Churn vs New */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-medium text-neutral-500">New vs churned subscribers</div>
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-neutral-500">New</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-neutral-500">Churned</span>
              </div>
            </div>
          </div>
          <div className="mt-3 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={subscriptionData.map(d => ({ ...d, churnedNeg: -d.churnedSubs }))}
                margin={{ top: 10, right: 8, left: -10, bottom: 0 }}
              >
                <CartesianGrid stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#a3a3a3", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.abs(v / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 }}
                  formatter={(v, name) => [Math.abs(v).toLocaleString(), name]}
                />
                <Bar dataKey="newSubs" name="New" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="churnedNeg" name="Churned" fill="#f43f5e" radius={[0, 0, 4, 4]} maxBarSize={28} />
                <Line
                  type="monotone"
                  dataKey="churnRate"
                  name="Churn %"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#f59e0b" }}
                  yAxisId={0}
                  hide
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
            <span>Net gain this month:</span>
            <span className="font-semibold text-emerald-600 tabular-nums">
              +{(subscriptionCurrent.newSubs - subscriptionCurrent.churnedSubs).toLocaleString()} subscribers
            </span>
          </div>
        </div>
      </div>
    </Card>

    {/* Revenue vs Profit */}
    <Card className="mt-3 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[12px] font-medium text-neutral-400">Revenue vs. Profit</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-[22px] font-semibold tracking-tight tabular-nums">€{totals.revenue.toLocaleString()}</span>
            <span className="text-[13px] font-medium text-emerald-600">+12.4%</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[12px]">
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-900" /><span className="text-neutral-500">Revenue</span></div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="text-neutral-500">Profit</span></div>
        </div>
      </div>
      <div className="mt-5 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#171717" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#171717" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f4f4f5" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} interval={Math.floor(data.length / 6)} />
            <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v / 1000}k`} />
            <Tooltip
              contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12, padding: "8px 10px" }}
              formatter={(v, n) => [`€${v.toLocaleString()}`, n === "revenue" ? "Revenue" : "Profit"]}
            />
            <Area type="monotone" dataKey="revenue" stroke="#171717" strokeWidth={1.75} fill="url(#revFill)" />
            <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={1.75} fill="url(#profFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  </>
);

/* =========================================================================
   VIEW: METRICS (20 Triple Whale metrics with toggle)
   ========================================================================= */

const MetricsView = () => {
  const [visible, setVisible] = useState(new Set(tripleWhaleMetrics.map((m) => m.id)));
  const [editMode, setEditMode] = useState(false);
  const groups = [...new Set(tripleWhaleMetrics.map((m) => m.group))];

  const toggle = (id) => {
    const next = new Set(visible);
    next.has(id) ? next.delete(id) : next.add(id);
    setVisible(next);
  };

  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[12px] font-medium text-neutral-400">Triple Whale</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Metrics</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            20 metrics pulled from Triple Whale · cached 15 minutes
          </p>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
            editMode ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          <Settings size={13} />
          {editMode ? "Done customizing" : "Customize layout"}
        </button>
      </div>

      {editMode && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="flex items-center gap-2 text-[12px] text-neutral-600">
            <Info size={13} />
            <span>Click any metric below to toggle its visibility. {visible.size} of {tripleWhaleMetrics.length} shown.</span>
          </div>
        </div>
      )}

      {groups.map((group) => (
        <section key={group} className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{group}</h2>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {tripleWhaleMetrics.filter((m) => m.group === group).map((m) => {
              const isVisible = visible.has(m.id);
              if (!editMode && !isVisible) return null;
              return (
                <button
                  key={m.id}
                  onClick={() => editMode && toggle(m.id)}
                  disabled={!editMode}
                  className={`group relative rounded-xl border p-4 text-left transition ${
                    editMode
                      ? isVisible
                        ? "border-neutral-900 bg-white shadow-sm"
                        : "border-dashed border-neutral-300 bg-neutral-50/50 opacity-60"
                      : "border-neutral-200/70 bg-white hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[12px] font-medium text-neutral-500 leading-tight">{m.label}</span>
                    {editMode ? (
                      isVisible ? <Eye size={12} className="text-neutral-400 shrink-0 ml-1" /> : <EyeOff size={12} className="text-neutral-400 shrink-0 ml-1" />
                    ) : (
                      <span className={`inline-flex items-center gap-0.5 rounded text-[10px] font-medium ${m.positive ? "text-emerald-600" : "text-rose-600"}`}>
                        {m.positive ? <ArrowUpRight size={10} strokeWidth={2.5} /> : <ArrowDownRight size={10} strokeWidth={2.5} />}
                        {m.delta}{m.format === "multiplier" ? "x" : m.format === "percent" ? "pp" : "%"}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-[20px] font-semibold tracking-tight tabular-nums">
                    {formatValue(m.value, m.format)}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
};

/* =========================================================================
   VIEW: RECONCILIATION (Waterfall + Variance)
   ========================================================================= */

const ReconciliationView = () => {
  const [showDrilldown, setShowDrilldown] = useState(false);

  let runningTotal = 0;
  const maxValue = reconciliation[0].value;

  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[12px] font-medium text-neutral-400">Reconciliation</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Profit Variance</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Shopify-calculated profit cross-checked against Jortt totals.
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50">
          <Plus size={13} />
          Manual journal entry
        </button>
      </div>

      {/* Migration banner — Jortt → Xero */}
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-neutral-200 bg-gradient-to-r from-neutral-50 to-[#13B5EA]/5 p-4">
        <div className="mt-0.5 rounded-md bg-[#13B5EA]/10 p-1.5 text-[#13B5EA]">
          <Info size={14} />
        </div>
        <div className="flex-1 text-[12px]">
          <div className="font-semibold text-neutral-900">Bridge mode — Xero migration in progress</div>
          <div className="mt-0.5 text-neutral-600">
            Reconciliation runs against Jortt aggregate totals. Per-journal-entry drilldown activates automatically once Xero is connected (est. within 1 month). Items tagged below with a Xero dot will become fully traceable.
          </div>
        </div>
      </div>

      {/* Variance banner */}
      <Card className={`mt-6 p-5 ${variance > 0 ? "border-amber-200 bg-amber-50/40" : "border-rose-200 bg-rose-50/40"}`}>
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-lg p-2 ${variance > 0 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
              <AlertTriangle size={16} />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-neutral-900">
                {variance > 0 ? "Overstated" : "Understated"} profit of ${Math.abs(variance).toLocaleString()}
              </div>
              <div className="mt-0.5 text-[13px] text-neutral-600">
                Shopify calculated <span className="font-medium tabular-nums">€18,812</span> · Jortt reported <span className="font-medium tabular-nums">€18,104</span> · {varianceItems.length} line items explain the gap
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowDrilldown(!showDrilldown)}
            className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {showDrilldown ? "Hide" : "Drill down"}
          </button>
        </div>

        {showDrilldown && (
          <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-[13px]">
              <thead className="border-b border-neutral-100 bg-neutral-50/60">
                <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                  <th className="px-4 py-2.5 font-medium">Ref</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium">Source</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">In Xero</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {varianceItems.map((item, i) => (
                  <tr key={item.id} className={i !== varianceItems.length - 1 ? "border-b border-neutral-50" : ""}>
                    <td className="px-4 py-3 mono text-[11px] text-neutral-400">{item.id}</td>
                    <td className="px-4 py-3 font-medium">{item.description}</td>
                    <td className="px-4 py-3 text-neutral-500">{item.source}</td>
                    <td className="px-4 py-3 text-neutral-500">{item.date}</td>
                    <td className="px-4 py-3">
                      {item.trackedInXero ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#13B5EA]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#13B5EA]">
                          <span className="h-1 w-1 rounded-full bg-[#13B5EA]" />
                          Will trace
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400">Manual only</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${item.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {fmtSigned(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Waterfall */}
      <Card className="mt-3 p-6">
        <div className="mb-6">
          <div className="text-[13px] font-semibold">Profit waterfall</div>
          <div className="text-[12px] text-neutral-400">Every dollar from gross revenue to net profit, traced to source system.</div>
        </div>
        <div className="space-y-1.5">
          {reconciliation.map((step, i) => {
            const isStart = step.type === "start";
            const isSubtotal = step.type === "subtotal";
            const isFinal = step.type === "final";
            const isDeduction = step.type === "deduction";

            if (isStart) runningTotal = step.value;
            else if (isDeduction) runningTotal += step.value;

            const barValue = isStart ? step.value : isSubtotal || isFinal ? step.value : Math.abs(step.value);
            const barPct = (barValue / maxValue) * 100;

            const sourceColors = {
              Shopify: "bg-[#95BF47]",
              "Triple Whale": "bg-[#7C3AED]",
              Jortt: "bg-[#00A6A6]",
              Calculated: "bg-neutral-500",
            };

            return (
              <div
                key={i}
                className={`grid grid-cols-12 items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                  isSubtotal ? "bg-neutral-50 font-semibold" : isFinal ? "bg-emerald-50/60 font-semibold" : "hover:bg-neutral-50"
                }`}
              >
                <div className="col-span-4 flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${sourceColors[step.source]}`} />
                  <span className="text-[13px]">{step.label}</span>
                </div>
                <div className="col-span-2 text-[11px] text-neutral-400">{step.source}</div>
                <div className="col-span-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full ${
                        isStart ? "bg-neutral-900" : isSubtotal ? "bg-neutral-700" : isFinal ? "bg-emerald-500" : "bg-rose-400"
                      }`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
                <div className={`col-span-2 text-right text-[13px] tabular-nums ${isDeduction ? "text-rose-600" : "text-neutral-900"}`}>
                  {isDeduction ? fmtSigned(step.value) : `€${step.value.toLocaleString()}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-4 border-t border-neutral-100 pt-4 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#95BF47]" /> Shopify</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" /> Triple Whale</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#00A6A6]" /> Jortt</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-neutral-500" /> Calculated</span>
          <span className="ml-auto flex items-center gap-1.5 text-[#13B5EA]"><span className="h-1.5 w-1.5 rounded-full bg-[#13B5EA]" /> Xero (incoming)</span>
        </div>
      </Card>
    </>
  );
};

/* =========================================================================
   VIEW: SYNC STATUS
   ========================================================================= */

const SyncView = () => (
  <>
    <div className="flex items-end justify-between">
      <div>
        <div className="text-[12px] font-medium text-neutral-400">Connections</div>
        <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Sync status</h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Health of each data source and last successful pull.
        </p>
      </div>
      <button className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50">
        <RefreshCw size={13} />
        Sync all now
      </button>
    </div>

    <div className="mt-6 space-y-3">
      {syncSources.map((src) => (
        <Card key={src.name} className="p-5">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${src.color}15` }}>
                <Plug size={18} style={{ color: src.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold">{src.name}</span>
                  <StatusDot status={src.status} />
                  <span className={`text-[11px] font-medium ${src.status === "ok" ? "text-emerald-600" : src.status === "warning" ? "text-amber-600" : "text-rose-600"}`}>
                    {src.status === "ok" ? "Healthy" : src.status === "warning" ? "Warning" : "Error"}
                  </span>
                </div>
                <div className="mt-1 text-[12px] text-neutral-500">
                  {src.api} · Last sync {src.lastSync} · {src.records}
                </div>
                {src.note && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                    <CircleAlert size={11} />
                    {src.note}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50">
                Logs
              </button>
              <button className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50">
                Resync
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>

    {/* Data flow diagram */}
    <Card className="mt-6 p-6">
      <div className="mb-4">
        <div className="text-[13px] font-semibold">Data flow</div>
        <div className="text-[12px] text-neutral-400">How data moves from source to dashboard.</div>
      </div>
      <div className="flex items-center justify-between gap-2 overflow-x-auto py-4">
        {[
          { label: "Shopify", color: "#95BF47", desc: "Orders, customers" },
          { label: "Triple Whale", color: "#7C3AED", desc: "20 metrics" },
          { label: "Jortt", color: "#00A6A6", desc: "Accounting totals", sublabel: "→ Xero soon" },
        ].map((s, i, arr) => (
          <React.Fragment key={s.label}>
            <div className="flex min-w-[120px] flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm" style={{ backgroundColor: `${s.color}15` }}>
                <Plug size={20} style={{ color: s.color }} />
              </div>
              <div className="mt-2 text-[12px] font-semibold">{s.label}</div>
              <div className="text-[10px] text-neutral-400">{s.desc}</div>
              {s.sublabel && <div className="text-[10px] text-[#13B5EA] font-medium">{s.sublabel}</div>}
            </div>
            {i < arr.length - 1 && (
              <div className="flex flex-1 items-center justify-center">
                <div className="h-px flex-1 bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200" />
                <ChevronRight size={14} className="text-neutral-400" />
                <div className="h-px flex-1 bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200" />
              </div>
            )}
          </React.Fragment>
        ))}
        <div className="mx-2 flex flex-1 items-center justify-center">
          <div className="h-px flex-1 bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200" />
          <ChevronRight size={14} className="text-neutral-400" />
          <div className="h-px flex-1 bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200" />
        </div>
        <div className="flex min-w-[120px] flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm">
            <LayoutDashboard size={20} />
          </div>
          <div className="mt-2 text-[12px] font-semibold">Dashboard</div>
          <div className="text-[10px] text-neutral-400">Reconciled view</div>
        </div>
      </div>
    </Card>
  </>
);

/* =========================================================================
   VIEW: PILLAR 1 — DAILY P&L
   ========================================================================= */

const DailyPnLView = () => {
  const [period, setPeriod] = useState("mtd");

  const todayRevenue = hourlyRevenue.filter(h => h.today !== null).reduce((s, h) => s + h.today, 0);
  const pacingRevenue = hourlyRevenue.filter(h => h.today !== null).reduce((s, h) => s + h.avgLast4, 0);
  const pacingDelta = ((todayRevenue - pacingRevenue) / pacingRevenue * 100).toFixed(1);

  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[12px] font-medium text-neutral-400">Pillar 1</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Daily P&L Tracker</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Live intraday revenue with full profit & loss breakdown.
          </p>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white p-0.5">
          <Chip active={period === "today"} onClick={() => setPeriod("today")}>Today</Chip>
          <Chip active={period === "wtd"} onClick={() => setPeriod("wtd")}>WTD</Chip>
          <Chip active={period === "mtd"} onClick={() => setPeriod("mtd")}>MTD</Chip>
        </div>
      </div>

      {/* Headline band */}
      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        {[
          { label: "Revenue today", value: `€${todayRevenue.toLocaleString()}`, delta: `${pacingDelta > 0 ? "+" : ""}${pacingDelta}%`, sub: "vs. 4-Tue avg", positive: pacingDelta > 0, icon: DollarSign },
          { label: "Profit today (est.)", value: "€2,184", delta: "+18.2%", sub: "Shopify-based", positive: true, icon: TrendingUp },
          { label: "Ad spend today", value: "€1,148", delta: "+3.2%", sub: "1h lag", positive: false, icon: Wallet },
          { label: "Contribution margin", value: "26.4%", delta: "+1.8pp", sub: "per order", positive: true, icon: Target },
        ].map(m => (
          <Card key={m.label} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-medium text-neutral-500">
                <m.icon size={14} />{m.label}
              </div>
              <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${m.positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {m.positive ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
                {m.delta}
              </span>
            </div>
            <div className="mt-3 text-[24px] font-semibold tracking-tight tabular-nums">{m.value}</div>
            <div className="mt-0.5 text-[11px] text-neutral-400">{m.sub}</div>
          </Card>
        ))}
      </section>

      {/* Intraday chart */}
      <Card className="mt-3 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[12px] font-medium text-neutral-400">Intraday revenue — today vs. avg of last 4 Tuesdays</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-[22px] font-semibold tabular-nums">€{todayRevenue.toLocaleString()}</span>
              <span className={`text-[13px] font-medium ${pacingDelta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                Pacing {pacingDelta > 0 ? "+" : ""}{pacingDelta}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[12px]">
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-900" /><span className="text-neutral-500">Today</span></div>
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-300" /><span className="text-neutral-500">4-Tue avg</span></div>
          </div>
        </div>
        <div className="mt-5 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourlyRevenue} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: "#a3a3a3", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => v === null ? ["—", ""] : [`€${v.toLocaleString()}`, ""]}
              />
              <Line type="monotone" dataKey="avgLast4" stroke="#d4d4d8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              <Line type="monotone" dataKey="today" stroke="#171717" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Full P&L breakdown */}
      <Card className="mt-3 p-5">
        <div className="mb-4">
          <div className="text-[13px] font-semibold">Full P&L breakdown — month-to-date</div>
          <div className="text-[12px] text-neutral-400">Every line traced to its source system.</div>
        </div>
        <div className="space-y-0.5">
          {pnlLines.map((line, i) => {
            const isSubtotal = line.type === "subtotal";
            const isFinal = line.type === "final";
            const isTop = line.type === "top";
            const isDeduction = line.type === "deduction";
            const sourceColor = {
              Shopify: "#95BF47", "Shopify Payments": "#95BF47", "Meta Ads": "#7C3AED", "Google Ads": "#4285F4",
              Jortt: "#00A6A6", TRL: "#F59E0B", Supplier: "#EC4899", "Supplier × Shopify": "#EC4899", Calculated: "#737373",
            }[line.source] || "#737373";

            return (
              <div
                key={i}
                className={`grid grid-cols-12 items-center gap-3 rounded-md px-3 py-2 text-[13px] ${
                  isSubtotal ? "bg-neutral-50 font-semibold" : isFinal ? "bg-emerald-50/60 font-semibold" : isTop ? "font-semibold" : "hover:bg-neutral-50"
                } ${line.highlight ? "ring-1 ring-amber-200 bg-amber-50/30" : ""}`}
              >
                <div className="col-span-6 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: sourceColor }} />
                  <span className={isDeduction ? "pl-3 text-neutral-600" : ""}>{line.label}</span>
                </div>
                <div className="col-span-3 text-[11px] text-neutral-400">{line.source}</div>
                <div className={`col-span-3 text-right tabular-nums ${isDeduction ? "text-rose-600" : isFinal ? "text-emerald-700" : ""}`}>
                  {isDeduction ? fmtSigned(line.value) : `€${line.value.toLocaleString()}`}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
};

/* =========================================================================
   VIEW: PILLAR 2 — MARGIN PER MARKET
   ========================================================================= */

const MarketsView = () => {
  const [sortBy, setSortBy] = useState("revenue");
  const [allocation, setAllocation] = useState("revenue-weighted");

  const sorted = [...markets].sort((a, b) => b[sortBy] - a[sortBy]);
  const maxRev = Math.max(...markets.map(m => m.revenue));

  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[12px] font-medium text-neutral-400">Pillar 2</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Margin per Market</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Geographic breakdown following Shopify Markets · last 30 days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={allocation}
            onChange={(e) => setAllocation(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700"
          >
            <option value="direct">Direct targeting</option>
            <option value="revenue-weighted">Revenue-weighted</option>
            <option value="attribution">TW attribution</option>
          </select>
        </div>
      </div>

      {/* Market cards */}
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {markets.map(m => (
          <Card key={m.code} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[20px]">{m.flag}</span>
              <span className={`text-[10px] font-medium ${m.contributionMargin >= 30 ? "text-emerald-600" : m.contributionMargin >= 20 ? "text-neutral-600" : "text-amber-600"}`}>
                {m.contributionMargin}%
              </span>
            </div>
            <div className="mt-2 text-[11px] font-medium text-neutral-500">{m.name}</div>
            <div className="mt-1 text-[16px] font-semibold tabular-nums">€{(m.revenue / 1000).toFixed(1)}k</div>
          </Card>
        ))}
      </section>

      {/* Main markets table */}
      <Card className="mt-3">
        <div className="border-b border-neutral-100 px-5 py-4">
          <div className="text-[13px] font-semibold">Full market breakdown</div>
          <div className="text-[12px] text-neutral-400">
            Ad spend allocation method: <span className="font-medium capitalize">{allocation}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                <th className="px-5 py-2.5 font-medium">Market</th>
                <th className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-neutral-900" onClick={() => setSortBy("revenue")}>Revenue</th>
                <th className="px-3 py-2.5 font-medium text-right">Orders</th>
                <th className="px-3 py-2.5 font-medium text-right">AOV</th>
                <th className="px-3 py-2.5 font-medium text-right">Ad spend</th>
                <th className="px-3 py-2.5 font-medium text-right">CAC</th>
                <th className="px-3 py-2.5 font-medium text-right">Gross M%</th>
                <th className="px-3 py-2.5 font-medium text-right cursor-pointer hover:text-neutral-900" onClick={() => setSortBy("contributionMargin")}>Contrib M%</th>
                <th className="px-5 py-2.5 font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => {
                const pct = (m.revenue / maxRev) * 100;
                return (
                  <tr key={m.code} className={i !== sorted.length - 1 ? "border-b border-neutral-50 hover:bg-neutral-50/50" : "hover:bg-neutral-50/50"}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span>{m.flag}</span>
                        <span className="font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium">€{m.revenue.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-neutral-600">{m.orders}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-neutral-600">€{(m.revenue / m.orders).toFixed(0)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-neutral-600">€{m.adSpend.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={m.cac > 40 ? "text-rose-600 font-medium" : m.cac > 30 ? "text-amber-600" : "text-neutral-900"}>
                        ${m.cac.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-neutral-600">{m.grossMargin}%</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={m.contributionMargin >= 30 ? "text-emerald-600 font-medium" : m.contributionMargin >= 20 ? "text-neutral-900" : "text-amber-600 font-medium"}>
                        {m.contributionMargin}%
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-20 overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full bg-neutral-900" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Alert on underperforming market */}
      <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
        <div className="mt-0.5 rounded-md bg-amber-100 p-1.5 text-amber-700">
          <AlertTriangle size={14} />
        </div>
        <div className="flex-1 text-[13px]">
          <div className="font-semibold text-neutral-900">France contribution margin below target</div>
          <div className="mt-0.5 text-neutral-600">
            🇫🇷 France CAC of €48.82 is 72% higher than NL. Contribution margin of 15.1% is below your 20% threshold. Consider pausing France prospecting campaigns or testing a localised creative before scaling.
          </div>
        </div>
      </div>
    </>
  );
};

/* =========================================================================
   VIEW: PILLAR 3 — MONTHLY OVERVIEW
   ========================================================================= */

/* ============================= OPEX BREAKDOWN (used in MonthlyView) ============================= */

const OpExBreakdownSection = () => {
  const [activeCategory, setActiveCategory] = useState("team");
  const current = opexByMonth[opexByMonth.length - 1];
  const prev = opexByMonth[opexByMonth.length - 2];
  const totalCurrent = current.team + current.agencies + current.content + current.software + current.other;
  const totalPrev = prev.team + prev.agencies + prev.content + prev.software + prev.other;
  const totalDelta = ((totalCurrent - totalPrev) / totalPrev * 100);

  const categories = [
    { key: "team", label: "Team", color: "#171717" },
    { key: "agencies", label: "Agencies", color: "#6366f1" },
    { key: "content", label: "Content samenwerkingen", color: "#f59e0b" },
    { key: "software", label: "Software", color: "#10b981" },
    { key: "other", label: "Other costs", color: "#6b7280" },
  ];

  const donutData = categories.map(c => ({
    name: c.label,
    value: current[c.key],
    color: c.color,
    key: c.key,
  }));

  const activeDetail = opexDetail[activeCategory];
  const activeTotal = activeDetail.items.reduce((s, i) => s + i.amount, 0);

  return (
    <Card className="mt-3 overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-100 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[13px] font-semibold">OpEx breakdown — April '26</div>
            <div className="mt-0.5 text-[12px] text-neutral-400">
              Indirect costs by category · source: Jortt OPEX overview
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Total OpEx</div>
            <div className="mt-0.5 text-[22px] font-semibold tabular-nums">€{totalCurrent.toLocaleString()}</div>
            <div className={`text-[11px] font-medium ${totalDelta >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {totalDelta >= 0 ? "+" : ""}{totalDelta.toFixed(1)}% MoM
            </div>
          </div>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-5">
        {categories.map(cat => {
          const value = current[cat.key];
          const prevValue = prev[cat.key];
          const delta = ((value - prevValue) / prevValue * 100);
          const share = (value / totalCurrent * 100);
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`rounded-lg border p-3 text-left transition ${
                isActive
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                <span className="text-[11px] font-medium text-neutral-500">{cat.label}</span>
              </div>
              <div className="mt-1.5 text-[17px] font-semibold tabular-nums">
                ${value.toLocaleString()}
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[10px]">
                <span className="text-neutral-400">{share.toFixed(1)}% of OpEx</span>
                <span className={`font-medium ${delta >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Two-column: donut + trend */}
      <div className="grid grid-cols-1 gap-4 border-t border-neutral-100 p-5 lg:grid-cols-5">
        {/* Donut */}
        <div className="lg:col-span-2">
          <div className="text-[12px] font-medium text-neutral-500">Cost mix — April '26</div>
          <div className="relative mt-2 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="none"
                >
                  {donutData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={entry.color}
                      opacity={activeCategory === entry.key ? 1 : 0.35}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => `€${v.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                {activeDetail.label}
              </div>
              <div className="mt-0.5 text-[18px] font-semibold tabular-nums">
                ${current[activeCategory].toLocaleString()}
              </div>
              <div className="text-[10px] text-neutral-400">
                {((current[activeCategory] / totalCurrent) * 100).toFixed(1)}% share
              </div>
            </div>
          </div>
        </div>

        {/* Trend: stacked bar across 6 months */}
        <div className="lg:col-span-3">
          <div className="text-[12px] font-medium text-neutral-500">Trend — trailing 6 months</div>
          <div className="mt-2 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={opexByMonth} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => `€${v.toLocaleString()}`}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
                {categories.map(cat => (
                  <Bar
                    key={cat.key}
                    dataKey={cat.key}
                    name={cat.label}
                    stackId="opex"
                    fill={cat.color}
                    opacity={activeCategory === cat.key ? 1 : 0.55}
                    maxBarSize={48}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Line items for active category */}
      <div className="border-t border-neutral-100 bg-neutral-50/40 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: activeDetail.color }} />
            <div>
              <div className="text-[13px] font-semibold">{activeDetail.label} — line items</div>
              <div className="text-[11px] text-neutral-400">{activeDetail.description}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Category total</div>
            <div className="text-[15px] font-semibold tabular-nums">€{activeTotal.toLocaleString()}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-3 py-2">Line item</th>
                <th className="px-3 py-2">Team / source</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">% of category</th>
              </tr>
            </thead>
            <tbody>
              {activeDetail.items
                .slice()
                .sort((a, b) => b.amount - a.amount)
                .map((item, idx) => {
                  const pct = (item.amount / activeTotal * 100);
                  return (
                    <tr key={idx} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50">
                      <td className="px-3 py-2 font-medium text-neutral-800">{item.name}</td>
                      <td className="px-3 py-2 text-neutral-500">{item.source}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">€{item.amount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, pct)}%`, background: activeDetail.color, opacity: 0.6 }}
                            />
                          </div>
                          <span className="w-10 text-right tabular-nums text-neutral-500">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-neutral-400">
          <Info size={11} />
          Click a category above to see its breakdown. Data shown for April '26 (MTD).
        </div>
      </div>
    </Card>
  );
};

/* =========================================================================
   VIEW: PILLAR 3 — MONTHLY OVERVIEW
   ========================================================================= */

const MonthlyView = () => {
  const current = months[months.length - 1];
  const prev = months[months.length - 2];
  const yoy = months[0];

  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[12px] font-medium text-neutral-400">Pillar 3</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Monthly Overview</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Management rollup · trailing 6 months
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
            April: In progress
          </span>
        </div>
      </div>

      {/* Hero summary */}
      <Card className="mt-6 p-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { label: "Revenue MTD", value: current.revenue, prev: prev.revenue, format: "€" },
            { label: "Gross profit MTD", value: current.grossProfit, prev: prev.grossProfit, format: "€" },
            { label: "Contribution margin", value: current.contributionMargin, prev: prev.contributionMargin, format: "€" },
            { label: "Net profit MTD", value: current.netProfit, prev: prev.netProfit, format: "€" },
          ].map(m => {
            const delta = ((m.value - m.prev) / m.prev * 100).toFixed(1);
            const positive = delta > 0;
            return (
              <div key={m.label}>
                <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{m.label}</div>
                <div className="mt-1 text-[24px] font-semibold tabular-nums">€{m.value.toLocaleString()}</div>
                <div className={`mt-0.5 flex items-center gap-1 text-[11px] font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                  {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {delta}% MoM
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Trend chart */}
      <Card className="mt-3 p-5">
        <div className="mb-4">
          <div className="text-[13px] font-semibold">Revenue, profit & ad spend — trailing 6 months</div>
          <div className="text-[12px] text-neutral-400">April is MTD and will update as month progresses</div>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={months} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v / 1000}k`} />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => `€${v.toLocaleString()}`}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
              <Bar dataKey="revenue" name="Revenue" fill="#171717" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="adSpend" name="Ad spend" fill="#d4d4d8" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line type="monotone" dataKey="netProfit" name="Net profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* KPI strip */}
      <section className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "CAC", data: monthlyKpis.cac, format: "€", color: "#171717", reverse: true },
          { label: "LTV", data: monthlyKpis.ltv, format: "€", color: "#10b981" },
          { label: "MER", data: monthlyKpis.mer, format: "x", color: "#7c3aed" },
          { label: "Repeat rate", data: monthlyKpis.repeatRate, format: "%", color: "#f59e0b" },
        ].map(kpi => {
          const current = kpi.data[kpi.data.length - 1];
          const prev = kpi.data[kpi.data.length - 2];
          const delta = ((current - prev) / prev * 100).toFixed(1);
          const improving = kpi.reverse ? delta < 0 : delta > 0;
          const chartData = kpi.data.map((v, i) => ({ month: months[i].month, v }));
          return (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{kpi.label}</div>
                  <div className="mt-1 text-[20px] font-semibold tabular-nums">
                    {kpi.format === "$" ? "$" : ""}{current.toFixed(kpi.format === "x" ? 2 : kpi.format === "%" ? 1 : 0)}{kpi.format === "x" || kpi.format === "%" ? kpi.format : ""}
                  </div>
                </div>
                <span className={`text-[10px] font-medium ${improving ? "text-emerald-600" : "text-rose-600"}`}>
                  {delta > 0 ? "+" : ""}{delta}%
                </span>
              </div>
              <div className="mt-2 h-[40px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Line type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          );
        })}
      </section>

      {/* OpEx breakdown — 5 categories */}
      <OpExBreakdownSection />

      {/* 12-month P&L forecast */}
      <Card className="mt-3 p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-[13px] font-semibold">12-month revenue & profit forecast</div>
            <div className="text-[12px] text-neutral-400">Trend + seasonality · shaded bands show ±1 std dev confidence range</div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
            <Sparkles size={10} />
            Backtest MAE 14.2%
          </span>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecast12m} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revRangeMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#171717" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#171717" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => `€${Number(v).toLocaleString()}`}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
              <Area type="monotone" dataKey="revenueHigh" name="Revenue high" stroke="none" fill="url(#revRangeMonthly)" isAnimationActive={false} />
              <Area type="monotone" dataKey="revenueLow" name="Revenue low" stroke="none" fill="#fafafa" isAnimationActive={false} />
              <Line type="monotone" dataKey="revenue" name="Revenue (base)" stroke="#171717" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="profit" name="Net profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Month close status */}
      <Card className="mt-3 p-5">
        <div className="text-[13px] font-semibold">Month close status</div>
        <div className="mt-3 flex items-center gap-3 overflow-x-auto">
          {months.map(m => {
            const status = m.current ? "open" : "closed";
            return (
              <div key={m.month} className={`shrink-0 rounded-lg border px-4 py-3 ${status === "open" ? "border-amber-200 bg-amber-50/40" : "border-emerald-200 bg-emerald-50/30"}`}>
                <div className="text-[11px] font-medium text-neutral-500">{m.month}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  {status === "closed" ? <CircleCheck size={12} className="text-emerald-600" /> : <Clock size={12} className="text-amber-600" />}
                  <span className={`text-[11px] font-medium ${status === "open" ? "text-amber-700" : "text-emerald-700"}`}>
                    {status === "open" ? "Open" : "Closed"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
};

/* =========================================================================
   VIEW: PILLAR 4 — BALANCE SHEET
   ========================================================================= */

const BalanceView = () => {
  const [activeOutstanding, setActiveOutstanding] = useState("whisk");
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(weeklyCashBalance.length - 1);
  const totalCurrentAssets = balanceSheet.assets.current.reduce((s, i) => s + i.value, 0);
  const totalFixedAssets = balanceSheet.assets.fixed.reduce((s, i) => s + i.value, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;
  const totalCurrentLiabs = balanceSheet.liabilities.current.reduce((s, i) => s + i.value, 0);
  const totalLongTermLiabs = balanceSheet.liabilities.longTerm.reduce((s, i) => s + i.value, 0);
  const totalLiabs = totalCurrentLiabs + totalLongTermLiabs;
  const totalEquity = balanceSheet.equity.reduce((s, i) => s + i.value, 0);

  const activeCategory = outstandingPayments[activeOutstanding];
  const outstandingCategories = [
    { key: "whisk", color: "#f97316" },
    { key: "meta", color: "#6366f1" },
    { key: "vat", color: "#eab308" },
    { key: "other", color: "#6b7280" },
  ];

  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[12px] font-medium text-neutral-400">Pillar 4</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Balance Sheet</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Financial position · as of April 20, 2026 · all amounts in EUR
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Total assets</div>
          <div className="text-[22px] font-semibold tabular-nums">€{totalAssets.toLocaleString()}</div>
        </div>
      </div>

      {/* Liquidity warning banner */}
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
        <div className="mt-0.5 rounded-md bg-amber-100 p-1.5 text-amber-700">
          <AlertTriangle size={14} />
        </div>
        <div className="flex-1 text-[12px]">
          <div className="font-semibold text-amber-900">
            Liquidity check: €{totalCash.toLocaleString()} cash vs €{totalOutstanding.toLocaleString()} outstanding
          </div>
          <div className="mt-0.5 text-amber-800">
            Not all payables are due immediately — Supplier has 60-day terms, META bills rolling, VAT includes accruing 2026 liabilities not yet due. See outstanding breakdown below for timing.
          </div>
        </div>
      </div>

      {/* Key ratios */}
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {balanceRatios.map(r => {
          const statusTextClass = r.status === "good" ? "text-emerald-600" : r.status === "warning" ? "text-amber-600" : r.status === "critical" ? "text-rose-600" : "text-neutral-500";
          const statusBorderClass = r.status === "warning" ? "border-amber-200 bg-amber-50/30" : r.status === "critical" ? "border-rose-200 bg-rose-50/30" : "";
          return (
            <Card key={r.label} className={`p-5 ${statusBorderClass}`}>
              <div className="text-[12px] font-medium text-neutral-500">{r.label}</div>
              <div className="mt-2 text-[22px] font-semibold tabular-nums">
                {r.suffix === "€" ? "€" : ""}{r.value.toLocaleString()}{r.suffix && r.suffix !== "€" ? ` ${r.suffix}` : ""}
              </div>
              <div className={`mt-1 text-[11px] ${statusTextClass}`}>
                {r.note || (r.status === "good" ? "Healthy" : "Watch")}
              </div>
            </Card>
          );
        })}
      </section>

      {/* Cash breakdown per account */}
      <Card className="mt-3 overflow-hidden">
        <div className="border-b border-neutral-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold">Cash & platform positions</div>
              <div className="mt-0.5 text-[12px] text-neutral-400">Current balances across banks and payment processors</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Total liquid</div>
              <div className="text-[18px] font-semibold tabular-nums">€{totalCash.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
          {/* Bank accounts */}
          <div className="border-b border-neutral-100 p-5 md:border-b-0 md:border-r">
            <div className="mb-3 flex items-center gap-2">
              <Wallet size={14} className="text-neutral-500" />
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Bank accounts</div>
            </div>
            {cashPositions.filter(p => p.type === "bank").map(p => {
              const brand = p.label.includes("ING") ? "ing" : p.label.includes("Revolut") ? "revolut" : null;
              return (
                <div key={p.label} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                  <div className="flex items-center gap-2.5">
                    {brand && <BrandIcon brand={brand} size={18} />}
                    <div>
                      <div className="text-[13px] font-medium">{p.label}</div>
                      <div className="text-[11px] text-neutral-400">{p.note}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-semibold tabular-nums">€{p.value.toLocaleString()}</div>
                    <div className="text-[10px] text-neutral-400">{p.currency}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Platforms */}
          <div className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Plug size={14} className="text-neutral-500" />
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Platform payouts pending</div>
            </div>
            {cashPositions.filter(p => p.type === "platform").map(p => {
              const brand = p.label.toLowerCase().includes("mollie") ? "mollie" : p.label.toLowerCase().includes("shopify") ? "shopify" : p.label.toLowerCase().includes("paypal") ? "paypal" : null;
              return (
                <div key={p.label} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                  <div className="flex items-center gap-2.5">
                    {brand && <BrandIcon brand={brand} size={18} />}
                    <div>
                      <div className="text-[13px] font-medium">{p.label}</div>
                      <div className="text-[11px] text-neutral-400">{p.note}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-semibold tabular-nums">€{p.value.toLocaleString()}</div>
                    <div className="text-[10px] text-neutral-400">{p.currency}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Weekly cash balance trend */}
      <Card className="mt-3 overflow-hidden">
        <div className="border-b border-neutral-100 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LineChartIcon size={14} className="text-neutral-500" />
                <div className="text-[13px] font-semibold">Cash & assets · week over week</div>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                  26 weeks trailing
                </span>
              </div>
              <div className="mt-0.5 text-[12px] text-neutral-400">
                How much does the business have: cash · cash after debt · cash + assets after debt
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-neutral-500">Week</label>
              <select
                value={selectedWeekIdx}
                onChange={(e) => setSelectedWeekIdx(Number(e.target.value))}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
              >
                {weeklyCashBalance.map((w, i) => (
                  <option key={w.week} value={i}>
                    {w.week} · {w.label}{w.current ? " · current" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {(() => {
          const selected = weeklyCashBalance[selectedWeekIdx];
          const prev = selectedWeekIdx > 0 ? weeklyCashBalance[selectedWeekIdx - 1] : null;
          const tiles = [
            { label: "Total cash", value: selected.cash, prev: prev?.cash, sub: "Bank + platforms combined", dot: "#0d1d3d" },
            { label: "Cash after debt", value: selected.cashMinusDebt, prev: prev?.cashMinusDebt, sub: "What's left after paying all outstanding", dot: "#10b981" },
            { label: "Cash + assets after debt", value: selected.assetsMinusDebt, prev: prev?.assetsMinusDebt, sub: "Cash + inventory + receivables, after debt", dot: "#10b981" },
          ];
          return (
            <div className="grid grid-cols-1 divide-y divide-neutral-100 border-b border-neutral-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              {tiles.map(t => {
                const absDelta = t.prev != null ? t.value - t.prev : 0;
                const deltaPct = t.prev != null && t.prev !== 0 ? ((t.value - t.prev) / Math.abs(t.prev)) * 100 : 0;
                const isImproving = absDelta >= 0;
                const valueColor = "text-neutral-900";
                return (
                  <div key={t.label} className="p-5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: t.dot }} />
                      <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">{t.label}</div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <div className={`text-[28px] font-semibold tracking-tight tabular-nums leading-none ${valueColor}`}>
                        {t.value < 0 ? "-" : ""}€{Math.abs(t.value).toLocaleString()}
                      </div>
                      {t.prev != null && (
                        <span className={`text-[11px] font-medium ${isImproving ? "text-emerald-600" : "text-rose-600"}`}>
                          {isImproving ? "+" : ""}€{absDelta.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-neutral-400">{t.sub}</div>
                    {t.prev != null && (
                      <div className="mt-2 text-[10px] text-neutral-400">
                        vs prev week: €{t.prev.toLocaleString()} ({deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="p-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">26-week trend</div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyCashBalance} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "#a3a3a3", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fill: "#a3a3a3", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v.toLocaleString()}`} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12, padding: "8px 10px" }}
                  formatter={(v, name) => {
                    const labels = { cash: "Total cash", cashMinusDebt: "Cash after debt", assetsMinusDebt: "Cash + assets after debt" };
                    return [`€${Number(v).toLocaleString()}`, labels[name] || name];
                  }}
                  labelFormatter={(l) => {
                    const row = weeklyCashBalance.find(w => w.week === l);
                    return row ? `${l} · ${row.label}` : l;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => {
                    const labels = { cash: "Total cash", cashMinusDebt: "Cash after debt", assetsMinusDebt: "Cash + assets after debt" };
                    return <span className="text-neutral-600">{labels[value] || value}</span>;
                  }}
                />
                <Line type="monotone" dataKey="cash" name="cash" stroke="#0d1d3d" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="cashMinusDebt" name="cashMinusDebt" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="assetsMinusDebt" name="assetsMinusDebt" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <details className="border-t border-neutral-100 bg-neutral-50/40">
          <summary className="cursor-pointer list-none p-5 hover:bg-neutral-100/40 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronDown size={12} className="text-neutral-400" />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Last 8 weeks</div>
                <span className="text-[10px] text-neutral-400">click to expand</span>
              </div>
              <div className="text-[10px] text-neutral-400">Click a row to select a week</div>
            </div>
          </summary>
          <div className="px-5 pb-5">
            <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-neutral-200 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  <th className="px-2 py-2 text-left">Week</th>
                  <th className="px-2 py-2 text-right">Cash</th>
                  <th className="px-2 py-2 text-right">Cash after debt</th>
                  <th className="px-2 py-2 text-right">Cash + assets after debt</th>
                  <th className="px-2 py-2 text-right">Δ cash WoW</th>
                </tr>
              </thead>
              <tbody>
                {weeklyCashBalance.slice(-8).map((w, idx, arr) => {
                  const prev = idx > 0 ? arr[idx - 1].cash : weeklyCashBalance[weeklyCashBalance.length - 9].cash;
                  const delta = w.cash - prev;
                  const deltaPct = (delta / prev) * 100;
                  const weekFullIdx = weeklyCashBalance.findIndex(x => x.week === w.week);
                  const isSelected = selectedWeekIdx === weekFullIdx;
                  return (
                    <tr
                      key={w.week}
                      onClick={() => setSelectedWeekIdx(weekFullIdx)}
                      className={`border-b border-neutral-100 last:border-0 cursor-pointer transition ${isSelected ? "bg-neutral-200/50" : w.current ? "bg-amber-50/40 hover:bg-amber-50/60" : "hover:bg-neutral-100/50"}`}
                    >
                      <td className="px-2 py-2">
                        <div className="font-medium text-neutral-800">
                          {w.week}
                          {w.current && <span className="ml-1 text-[9px] font-normal text-amber-700">current</span>}
                          {isSelected && !w.current && <span className="ml-1 text-[9px] font-normal text-neutral-600">· selected</span>}
                        </div>
                        <div className="text-[10px] text-neutral-400">{w.label}</div>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold">€{w.cash.toLocaleString()}</td>
                      <td className={`px-2 py-2 text-right tabular-nums ${w.cashMinusDebt < 0 ? "text-rose-600" : "text-neutral-700"}`}>
                        {w.cashMinusDebt < 0 ? "-" : ""}€{Math.abs(w.cashMinusDebt).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-neutral-700">€{w.assetsMinusDebt.toLocaleString()}</td>
                      <td className={`px-2 py-2 text-right tabular-nums font-medium ${delta >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                        {delta >= 0 ? "+" : ""}€{delta.toLocaleString()}
                        <span className="ml-1 text-[10px] opacity-70">({deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%)</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </details>
      </Card>


      {/* OUTSTANDING PAYMENTS — drill-down */}
      <Card className="mt-3 overflow-hidden">
        <div className="border-b border-neutral-100 bg-gradient-to-r from-rose-50/40 to-transparent p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-600" />
                <div className="text-[13px] font-semibold">Outstanding payments</div>
              </div>
              <div className="mt-0.5 text-[12px] text-neutral-400">
                Open invoices and accruing obligations · sourced from finance team tracking sheet
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Total outstanding</div>
              <div className="text-[22px] font-semibold tabular-nums text-rose-700">€{totalOutstanding.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-4">
          {outstandingCategories.map(c => {
            const cat = outstandingPayments[c.key];
            const isActive = activeOutstanding === c.key;
            const share = (cat.total / totalOutstanding * 100);
            return (
              <button
                key={c.key}
                onClick={() => setActiveOutstanding(c.key)}
                className={`rounded-lg border p-3 text-left transition ${
                  isActive ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                  <span className="text-[11px] font-medium text-neutral-500">{cat.label}</span>
                </div>
                <div className="mt-1.5 text-[16px] font-semibold tabular-nums">€{cat.total.toLocaleString()}</div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-neutral-400">
                  <span>{share.toFixed(1)}% of total</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                    cat.urgency === "high" ? "bg-rose-100 text-rose-700" :
                    cat.urgency === "medium" ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-600"
                  }`}>
                    {cat.urgency}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active category detail */}
        <div className="border-t border-neutral-100 bg-neutral-50/40 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold">{activeCategory.label}</div>
              <div className="text-[11px] text-neutral-400">
                {activeCategory.description} · Last updated {activeCategory.lastUpdated}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Category total</div>
              <div className="text-[16px] font-semibold tabular-nums">€{activeCategory.total.toLocaleString()}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCategory.items
                    .slice()
                    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
                    .map((item, idx) => (
                      <tr key={idx} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50">
                        <td className="px-3 py-2 font-medium text-neutral-800 mono">{item.ref}</td>
                        <td className="px-3 py-2 text-neutral-500">{item.date}</td>
                        <td className={`px-3 py-2 text-right tabular-nums font-medium ${item.amount < 0 ? "text-emerald-600" : "text-neutral-800"}`}>
                          {item.amount < 0 ? "" : ""}€{item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-neutral-400">
            <Info size={11} />
            Click a category above to drill into line items. Jortt bridge — drill-down becomes automatic when Xero replaces Jortt.
          </div>
        </div>
      </Card>

      {/* Inventory per SKU */}
      <Card className="mt-3 overflow-hidden">
        <div className="border-b border-neutral-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={14} className="text-neutral-500" />
              <div>
                <div className="text-[13px] font-semibold">Inventory at cost — {inventorySKUs.length} SKUs</div>
                <div className="mt-0.5 text-[12px] text-neutral-400">Stock positions across NL, UK, and US warehouses</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Total value</div>
              <div className="text-[18px] font-semibold tabular-nums">€{totalInventory.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2 text-right">Unit cost</th>
                <th className="px-4 py-2 text-right">Pieces</th>
                <th className="px-4 py-2 text-right">Value</th>
                <th className="px-4 py-2 text-right">% of stock</th>
              </tr>
            </thead>
            <tbody>
              {inventorySKUs.map((sku, idx) => {
                const pct = (sku.value / totalInventory * 100);
                const flagMap = { NL: "🇳🇱", UK: "🇬🇧", US: "🇺🇸" };
                return (
                  <tr key={idx} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50">
                    <td className="px-4 py-2 font-medium text-neutral-800">{sku.sku}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                        <span>{flagMap[sku.location]}</span>
                        {sku.location}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-500">€{sku.unitCost.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-500">{sku.pieces.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">€{sku.value.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full bg-neutral-700" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className="w-10 text-right tabular-nums text-neutral-500">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Classic Balance sheet structure */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Assets */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold">Assets</div>
            <div className="text-[18px] font-semibold tabular-nums">€{totalAssets.toLocaleString()}</div>
          </div>

          <div className="mt-4 space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Current</div>
            {balanceSheet.assets.current.map(item => (
              <div key={item.label} className="flex items-start justify-between py-1.5 text-[13px]">
                <div>
                  <div className="text-neutral-700">{item.label}</div>
                  {item.detail && <div className="text-[10px] text-neutral-400">{item.detail}</div>}
                </div>
                <span className="tabular-nums font-medium">€{item.value.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-neutral-100 py-1.5 text-[13px] font-semibold">
              <span>Total current</span>
              <span className="tabular-nums">€{totalCurrentAssets.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Fixed</div>
            {balanceSheet.assets.fixed.map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 text-[13px]">
                <span className={`text-neutral-700 ${item.value < 0 ? "pl-3" : ""}`}>{item.label}</span>
                <span className={`tabular-nums ${item.value < 0 ? "text-rose-600" : "font-medium"}`}>{item.value < 0 ? "-" : ""}€{Math.abs(item.value).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-neutral-100 py-1.5 text-[13px] font-semibold">
              <span>Total fixed</span>
              <span className="tabular-nums">€{totalFixedAssets.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Liabilities & Equity */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold">Liabilities & Equity</div>
            <div className="text-[18px] font-semibold tabular-nums">€{(totalLiabs + totalEquity).toLocaleString()}</div>
          </div>

          <div className="mt-4 space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Current liabilities</div>
            {balanceSheet.liabilities.current.map(item => (
              <div key={item.label} className="flex items-start justify-between py-1.5 text-[13px]">
                <div>
                  <div className="text-neutral-700">{item.label}</div>
                  {item.detail && <div className="text-[10px] text-neutral-400">{item.detail}</div>}
                </div>
                <span className="tabular-nums font-medium">€{item.value.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-neutral-100 py-1.5 text-[13px] font-semibold">
              <span>Total current liabilities</span>
              <span className="tabular-nums">€{totalCurrentLiabs.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Equity</div>
            {balanceSheet.equity.map(item => (
              <div key={item.label} className="flex items-start justify-between py-1.5 text-[13px]">
                <div>
                  <div className="text-neutral-700">{item.label}</div>
                  {item.detail && <div className="text-[10px] text-neutral-400">{item.detail}</div>}
                </div>
                <span className="tabular-nums font-medium">€{item.value.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-neutral-100 py-1.5 text-[13px] font-semibold">
              <span>Total equity</span>
              <span className="tabular-nums">€{totalEquity.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

/* =========================================================================
   VIEW: PILLAR 5 — FORECAST
   ========================================================================= */

/* ============================= GROWTH PLAN 2026 (used in ForecastView) ============================= */

const GrowthPlanSection = () => {
  const [viewMode, setViewMode] = useState("revenue"); // revenue | profit | marketing

  const totalRevenue = growthPlanTotals.totalRevenue;
  const totalProfit = growthPlanTotals.totalProfit;
  const totalMarketing = growthPlanTotals.totalMarketing;
  const netMargin = (totalProfit / totalRevenue) * 100;
  const mer = totalRevenue / totalMarketing;

  // Prepare chart data based on mode
  const chartData = growthPlan.map(m => {
    if (viewMode === "revenue") {
      return { month: m.month, NL: m.nl, UK: m.uk, US: m.us, total: m.nl + m.uk + m.us };
    } else if (viewMode === "profit") {
      return { month: m.month, NL: m.profitNL, UK: m.profitUK, US: m.profitUS, total: m.profitNL + m.profitUK + m.profitUS };
    } else {
      return { month: m.month, NL: m.marketingNL, UK: m.marketingUK, US: m.marketingUS, total: m.marketingNL + m.marketingUK + m.marketingUS };
    }
  });

  const marketColors = { NL: "#171717", UK: "#6366f1", US: "#f59e0b" };

  return (
    <>
      {/* YTD progress summary */}
      {(() => {
        // Calculate what's completed vs target — Jan/Feb/Mar are "done", Apr is MTD
        const completedMonths = growthPlan.filter(m => !m.current && growthPlan.indexOf(m) < growthPlan.findIndex(x => x.current));
        const currentMonth = growthPlan.find(m => m.current);
        const ytdRevenueNL = completedMonths.reduce((s, m) => s + m.nl, 0) + (currentMonth ? currentMonth.nl : 0);
        const ytdRevenueUK = completedMonths.reduce((s, m) => s + m.uk, 0) + (currentMonth ? currentMonth.uk : 0);
        const ytdRevenueUS = completedMonths.reduce((s, m) => s + m.us, 0) + (currentMonth ? currentMonth.us : 0);
        const ytdTotal = ytdRevenueNL + ytdRevenueUK + ytdRevenueUS;
        const ytdPct = (ytdTotal / totalRevenue) * 100;
        // Expected pace: 4 months (Jan-Apr) of 12 = 33%
        const expectedPacePct = ((completedMonths.length + 0.66) / 12) * 100; // partial Apr

        return (
          <Card className="mt-6 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold">Year-to-date progress</div>
                <div className="text-[11px] text-neutral-400">Jan–Apr MTD · tracking against full-year plan</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-neutral-500">€{(ytdTotal / 1000000).toFixed(1)}M / €{(totalRevenue / 1000000).toFixed(1)}M</div>
                <div className="text-[20px] font-semibold tabular-nums text-neutral-900">{ytdPct.toFixed(1)}%</div>
              </div>
            </div>

            {/* Big progress bar */}
            <div className="relative h-3 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, ytdPct)}%` }}
              />
              {/* Expected pace marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-neutral-400"
                style={{ left: `${expectedPacePct}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-neutral-400">
              <span>Start of year</span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-0.5 bg-neutral-400" />
                Expected pace ({expectedPacePct.toFixed(1)}%)
              </span>
              <span>Year-end target</span>
            </div>

            {/* Per-market YTD bars */}
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { label: "Netherlands", flag: "🇳🇱", ytd: ytdRevenueNL, target: growthPlanTotals.revenueNL, color: marketColors.NL },
                { label: "United Kingdom", flag: "🇬🇧", ytd: ytdRevenueUK, target: growthPlanTotals.revenueUK, color: marketColors.UK },
                { label: "United States", flag: "🇺🇸", ytd: ytdRevenueUS, target: growthPlanTotals.revenueUS, color: marketColors.US },
              ].map(m => {
                const pct = (m.ytd / m.target) * 100;
                const onPace = pct >= expectedPacePct - 2;
                return (
                  <div key={m.label}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[16px]">{m.flag}</span>
                        <span className="text-[12px] font-medium text-neutral-700">{m.label}</span>
                      </div>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${onPace ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {onPace ? "On pace" : "Behind"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between text-[11px] text-neutral-500">
                      <span className="tabular-nums">€{(m.ytd / 1000000).toFixed(1)}M / €{(m.target / 1000000).toFixed(1)}M</span>
                      <span className="font-semibold tabular-nums text-neutral-900">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, pct)}%`, background: m.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* Hero: annual total */}
      <Card className="mt-3 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="border-b border-neutral-100 p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">2026 Revenue Target</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                Annual plan
              </span>
            </div>
            <div className="mt-3 text-[38px] font-semibold tracking-tight tabular-nums leading-none">
              €{(totalRevenue / 1000000).toFixed(1)}M
            </div>
            <div className="mt-1 text-[12px] text-neutral-400">Combined 🇳🇱 + 🇬🇧 + 🇺🇸 · Jan–Dec 2026</div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-neutral-100 pt-4">
              {[
                { label: "NL", flag: "🇳🇱", value: growthPlanTotals.revenueNL, color: marketColors.NL },
                { label: "UK", flag: "🇬🇧", value: growthPlanTotals.revenueUK, color: marketColors.UK },
                { label: "US", flag: "🇺🇸", value: growthPlanTotals.revenueUS, color: marketColors.US },
              ].map(m => {
                const pct = (m.value / totalRevenue) * 100;
                return (
                  <div key={m.label}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px]">{m.flag}</span>
                      <span className="text-[11px] font-medium text-neutral-500">{m.label}</span>
                    </div>
                    <div className="mt-1 text-[14px] font-semibold tabular-nums">€{(m.value / 1000000).toFixed(1)}M</div>
                    <div className="text-[10px] text-neutral-400">{pct.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-b border-neutral-100 p-6 lg:border-b-0 lg:border-r">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Net profit target</div>
            <div className="mt-3 text-[38px] font-semibold tracking-tight tabular-nums leading-none">
              €{(totalProfit / 1000000).toFixed(1)}M
            </div>
            <div className="mt-1 text-[12px] text-neutral-400">{netMargin.toFixed(1)}% net margin</div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-neutral-100 pt-4">
              {[
                { label: "NL", flag: "🇳🇱", value: growthPlanTotals.profitNL, margin: growthPlanTotals.profitNL / growthPlanTotals.revenueNL * 100 },
                { label: "UK", flag: "🇬🇧", value: growthPlanTotals.profitUK, margin: growthPlanTotals.profitUK / growthPlanTotals.revenueUK * 100 },
                { label: "US", flag: "🇺🇸", value: growthPlanTotals.profitUS, margin: growthPlanTotals.profitUS / growthPlanTotals.revenueUS * 100 },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px]">{m.flag}</span>
                    <span className="text-[11px] font-medium text-neutral-500">{m.label}</span>
                  </div>
                  <div className="mt-1 text-[14px] font-semibold tabular-nums">€{(m.value / 1000000).toFixed(1)}M</div>
                  <div className="text-[10px] text-neutral-400">{m.margin.toFixed(0)}% margin</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Marketing spend</div>
            <div className="mt-3 text-[38px] font-semibold tracking-tight tabular-nums leading-none">
              €{(totalMarketing / 1000000).toFixed(1)}M
            </div>
            <div className="mt-1 text-[12px] text-neutral-400">Blended MER {mer.toFixed(2)}×</div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-neutral-100 pt-4">
              {[
                { label: "NL", flag: "🇳🇱", value: growthPlanTotals.marketingNL },
                { label: "UK", flag: "🇬🇧", value: growthPlanTotals.marketingUK },
                { label: "US", flag: "🇺🇸", value: growthPlanTotals.marketingUS },
              ].map(m => {
                const pct = (m.value / totalMarketing) * 100;
                return (
                  <div key={m.label}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px]">{m.flag}</span>
                      <span className="text-[11px] font-medium text-neutral-500">{m.label}</span>
                    </div>
                    <div className="mt-1 text-[14px] font-semibold tabular-nums">€{(m.value / 1000000).toFixed(1)}M</div>
                    <div className="text-[10px] text-neutral-400">{pct.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Metric toggle + chart */}
      <Card className="mt-3 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold">Monthly breakdown per market</div>
            <div className="mt-0.5 text-[12px] text-neutral-400">Jan–Dec 2026 · stacked by market</div>
          </div>
          <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white p-0.5">
            <Chip active={viewMode === "revenue"} onClick={() => setViewMode("revenue")}>Revenue</Chip>
            <Chip active={viewMode === "profit"} onClick={() => setViewMode("profit")}>Net profit</Chip>
            <Chip active={viewMode === "marketing"} onClick={() => setViewMode("marketing")}>Marketing</Chip>
          </div>
        </div>

        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#a3a3a3", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000000 ? `€${(v / 1000000).toFixed(1)}M` : `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => `€${Number(v).toLocaleString()}`}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
              <Bar dataKey="NL" stackId="m" fill={marketColors.NL} maxBarSize={48} isAnimationActive={false} />
              <Bar dataKey="UK" stackId="m" fill={marketColors.UK} maxBarSize={48} isAnimationActive={false} />
              <Bar dataKey="US" stackId="m" fill={marketColors.US} maxBarSize={48} isAnimationActive={false} />
              <Line type="monotone" dataKey="total" name="Total" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Month-by-month table */}
      <Card className="mt-3 overflow-hidden">
        <div className="border-b border-neutral-100 p-4">
          <div className="text-[13px] font-semibold">Monthly targets detail</div>
          <div className="mt-0.5 text-[11px] text-neutral-400">Revenue, marketing spend, and net profit per market</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-3 py-2 text-left">Month</th>
                <th className="px-3 py-2 text-right">🇳🇱 NL rev</th>
                <th className="px-3 py-2 text-right">🇬🇧 UK rev</th>
                <th className="px-3 py-2 text-right">🇺🇸 US rev</th>
                <th className="px-3 py-2 text-right border-l border-neutral-200">Total</th>
                <th className="px-3 py-2 text-right">Marketing</th>
                <th className="px-3 py-2 text-right">Net profit</th>
                <th className="px-3 py-2 text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {growthPlan.map((m, idx) => {
                const total = m.nl + m.uk + m.us;
                const marketing = m.marketingNL + m.marketingUK + m.marketingUS;
                const profit = m.profitNL + m.profitUK + m.profitUS;
                const margin = (profit / total) * 100;
                const currentIdx = growthPlan.findIndex(x => x.current);
                const isCompleted = currentIdx >= 0 && idx < currentIdx;
                const isFuture = currentIdx >= 0 && idx > currentIdx;
                return (
                  <tr key={m.month} className={`border-b border-neutral-100 last:border-0 ${m.current ? "bg-amber-50/40" : isFuture ? "opacity-50" : "hover:bg-neutral-50/50"}`}>
                    <td className="px-3 py-2 font-medium text-neutral-800">
                      <span className="inline-flex items-center gap-1.5">
                        {isCompleted && <span className="text-[11px] text-emerald-600">✓</span>}
                        {m.current && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
                        {isFuture && <span className="text-[11px] text-neutral-300">○</span>}
                        {m.month}
                        {m.current && <span className="ml-1 text-[9px] font-normal text-amber-700">MTD</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-600">€{(m.nl / 1000).toFixed(0)}k</td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-600">€{(m.uk / 1000).toFixed(0)}k</td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                      {m.us < 1000 ? "—" : `€${(m.us / 1000).toFixed(0)}k`}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold border-l border-neutral-100">€{(total / 1000).toFixed(0)}k</td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-500">€{(marketing / 1000).toFixed(0)}k</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${profit < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      {profit < 0 ? "-" : ""}€{Math.abs(profit / 1000).toFixed(0)}k
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-500">{margin.toFixed(1)}%</td>
                  </tr>
                );
              })}
              {/* Total row */}
              <tr className="border-t-2 border-neutral-300 bg-neutral-50 font-semibold">
                <td className="px-3 py-2 text-neutral-900">Total 2026</td>
                <td className="px-3 py-2 text-right tabular-nums">€{(growthPlanTotals.revenueNL / 1000000).toFixed(1)}M</td>
                <td className="px-3 py-2 text-right tabular-nums">€{(growthPlanTotals.revenueUK / 1000000).toFixed(1)}M</td>
                <td className="px-3 py-2 text-right tabular-nums">€{(growthPlanTotals.revenueUS / 1000000).toFixed(1)}M</td>
                <td className="px-3 py-2 text-right tabular-nums border-l border-neutral-200">€{(totalRevenue / 1000000).toFixed(1)}M</td>
                <td className="px-3 py-2 text-right tabular-nums">€{(totalMarketing / 1000000).toFixed(1)}M</td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-700">€{(totalProfit / 1000000).toFixed(1)}M</td>
                <td className="px-3 py-2 text-right tabular-nums">{netMargin.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Key assumptions */}
      <Card className="mt-3 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Info size={13} className="text-neutral-500" />
          <div className="text-[13px] font-semibold">Key assumptions per market</div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              market: "🇳🇱 Netherlands",
              color: marketColors.NL,
              items: [
                { label: "Repeat customer AOV", value: "€59" },
                { label: "New customer AOV", value: "€78" },
                { label: "aMER target", value: "1.70×" },
                { label: "nCAC", value: "€46" },
                { label: "Gross margin", value: "75%" },
              ],
            },
            {
              market: "🇬🇧 United Kingdom",
              color: marketColors.UK,
              items: [
                { label: "Repeat customer AOV", value: "€70" },
                { label: "New customer AOV", value: "€71" },
                { label: "aMER target", value: "2.00×" },
                { label: "nCAC", value: "€36" },
                { label: "Gross margin", value: "75%" },
              ],
            },
            {
              market: "🇺🇸 United States",
              color: marketColors.US,
              items: [
                { label: "Repeat customer AOV", value: "€70" },
                { label: "New customer AOV", value: "€80" },
                { label: "aMER target", value: "1.43×" },
                { label: "nCAC", value: "€50" },
                { label: "Gross margin", value: "75%" },
                { label: "Launch", value: "Q2 2026" },
              ],
            },
          ].map(m => (
            <div key={m.market} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                <span className="text-[12px] font-semibold">{m.market}</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {m.items.map(i => (
                  <div key={i.label} className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500">{i.label}</span>
                    <span className="font-medium tabular-nums">{i.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
};

/* =========================================================================
   VIEW: PILLAR 5 — FORECAST
   ========================================================================= */

const ForecastView = () => {
  const [horizon, setHorizon] = useState("13w");
  const totalInflow = cashflow13w.reduce((s, w) => s + w.inflow, 0);
  const totalOutflow = cashflow13w.reduce((s, w) => s + Math.abs(w.outflow), 0);

  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[12px] font-medium text-neutral-400">Pillar 5</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Forecast</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Trend-based projection with configurable assumptions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-neutral-200 bg-white p-0.5">
          <Chip active={horizon === "13w"} onClick={() => setHorizon("13w")}>13-week cashflow</Chip>
          <Chip active={horizon === "growth"} onClick={() => setHorizon("growth")}>Growth Plan 2026</Chip>
        </div>
      </div>

      {/* Caveat banner */}
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="mt-0.5 rounded-md bg-neutral-200 p-1.5 text-neutral-700">
          <Sparkles size={14} />
        </div>
        <div className="flex-1 text-[12px]">
          <div className="font-semibold text-neutral-900">
            {horizon === "growth"
              ? "Growth Plan 2026 · NL + UK + US combined · source: Finance planning sheet"
              : "Forecast method: Trend + seasonality · Backtest MAE last 4 weeks: 14.2%"}
          </div>
          <div className="mt-0.5 text-neutral-600">
            {horizon === "growth"
              ? "Monthly targets built from per-market assumptions (marketing spend, MER, new customer AOV, repeat revenue growth). Edit in the assumptions sheet."
              : "Shaded bands show ±1 std dev confidence range. Edit assumptions in the panel below to model scenarios."}
          </div>
        </div>
      </div>

      {horizon === "13w" ? (
        <>
          {/* Cashflow summary */}
          <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Card className="p-5">
              <div className="text-[12px] font-medium text-neutral-500">Total inflow (13w)</div>
              <div className="mt-2 text-[24px] font-semibold tabular-nums text-emerald-700">€{totalInflow.toLocaleString()}</div>
            </Card>
            <Card className="p-5">
              <div className="text-[12px] font-medium text-neutral-500">Total outflow (13w)</div>
              <div className="mt-2 text-[24px] font-semibold tabular-nums text-rose-600">€{totalOutflow.toLocaleString()}</div>
            </Card>
            <Card className="p-5">
              <div className="text-[12px] font-medium text-neutral-500">Net change</div>
              <div className="mt-2 text-[24px] font-semibold tabular-nums">€{(totalInflow - totalOutflow).toLocaleString()}</div>
            </Card>
            <Card className="p-5">
              <div className="text-[12px] font-medium text-neutral-500">Ending cash (W29)</div>
              <div className="mt-2 text-[24px] font-semibold tabular-nums">€{cashflow13w[cashflow13w.length - 1].cumulative.toLocaleString()}</div>
            </Card>
          </section>

          {/* Cashflow chart */}
          <Card className="mt-3 p-5">
            <div className="mb-4">
              <div className="text-[13px] font-semibold">13-week rolling cashflow</div>
              <div className="text-[12px] text-neutral-400">Weekly inflows, outflows and cumulative cash position</div>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashflow13w} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v / 1000}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => `€${Math.abs(v).toLocaleString()}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                  <Bar yAxisId="left" dataKey="inflow" name="Inflow" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="left" dataKey="outflow" name="Outflow" fill="#f43f5e" radius={[0, 0, 3, 3]} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative cash" stroke="#171717" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      ) : horizon === "growth" ? (
        <GrowthPlanSection />
      ) : null}

      {/* Monthly Spending Allowance — dynamic, based on forecast + cash position */}
      <Card className="mt-3 overflow-hidden">
        <div className="border-b border-neutral-100 bg-gradient-to-r from-emerald-50/40 to-transparent p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Wallet size={14} className="text-emerald-700" />
                <div className="text-[13px] font-semibold">This month's spending allowance</div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  Dynamic · April '26
                </span>
              </div>
              <div className="mt-0.5 text-[12px] text-neutral-400">
                How much you can commit this month per category · adjusts with forecast revenue & cash
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Total available</div>
              <div className="text-[22px] font-semibold tabular-nums text-neutral-900">€261</div>
              <div className="text-[10px] text-neutral-400">€162 committed · €99 free</div>
            </div>
          </div>
        </div>

        {/* Spending categories with live usage */}
        <div className="p-5">
          <div className="space-y-3">
            {[
              {
                label: "Ad spend",
                allowance: 111,
                committed: 73,
                icon: "🎯",
                note: "Meta, Google, TikTok",
                fixed: false,
              },
              {
                label: "Team",
                allowance: 63,
                committed: 62,
                icon: "👥",
                note: "Freelancers + management fee · mostly locked in",
                fixed: true,
              },
              {
                label: "Agencies",
                allowance: 22,
                committed: 21,
                icon: "🏢",
                note: "Agency A, Agency B, Agency C",
                fixed: false,
              },
              {
                label: "Content samenwerkingen",
                allowance: 46,
                committed: 26,
                icon: "🎬",
                note: "Creators, content shoots, influencer fees",
                fixed: false,
              },
              {
                label: "Software",
                allowance: 16,
                committed: 15,
                icon: "💻",
                note: "Recurring SaaS · mostly locked",
                fixed: true,
              },
              {
                label: "Other (rent, travel, legal)",
                allowance: 40,
                committed: 38,
                icon: "📋",
                note: "Office, legal, insurance, bank costs",
                fixed: true,
              },
            ].map(cat => {
              const remaining = cat.allowance - cat.committed;
              const pct = (cat.committed / cat.allowance) * 100;
              const status = pct >= 95 ? "critical" : pct >= 80 ? "warning" : "healthy";
              const barColor = status === "critical" ? "bg-rose-500" : status === "warning" ? "bg-amber-500" : "bg-emerald-500";
              const badgeClass = status === "critical" ? "bg-rose-50 text-rose-700" : status === "warning" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
              return (
                <div key={cat.label} className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50/40 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[18px]">{cat.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold">{cat.label}</span>
                          {cat.fixed && (
                            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-600">
                              Fixed
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400">{cat.note}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
                          {remaining >= 0 ? "€" + remaining.toLocaleString() + " left" : "€" + Math.abs(remaining).toLocaleString() + " over"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] tabular-nums text-neutral-500">
                        €{cat.committed.toLocaleString()} / €{cat.allowance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-[10px] font-medium tabular-nums text-neutral-500">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* How this is calculated */}
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 text-[11px]">
            <Info size={12} className="mt-0.5 shrink-0 text-neutral-500" />
            <div className="text-neutral-600">
              <span className="font-semibold">How this updates:</span> Fixed categories (Team, Software, Other) are locked against contracts. Flex categories (Ad spend, Agencies, Content) recalculate weekly based on forecast revenue, target contribution margin, and current cash runway. If revenue drops, flex allowances drop with it.
            </div>
          </div>
        </div>
      </Card>

      {/* Assumptions panel */}
      <Card className="mt-3 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold">Assumptions panel</div>
            <div className="text-[12px] text-neutral-400">Adjust to model scenarios</div>
          </div>
          <button className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50">
            Save scenario
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { label: "Growth rate (MoM)", value: "+4.0%", hint: "Trailing trend: +3.8%" },
            { label: "Target ROAS", value: "4.0x", hint: "Current blended: 4.12x" },
            { label: "Seasonality", value: "On", hint: "Dec +35%, summer -25%" },
            { label: "Planned ad spend (May)", value: "€36,000", hint: "Up €1,320 from April" },
            { label: "New hire (Jun)", value: "+€4,500/mo", hint: "Starts June 1" },
            { label: "Supplier PO received (May)", value: "€52,000", hint: "Inventory cap" },
          ].map(a => (
            <div key={a.label} className="rounded-lg border border-neutral-200 p-3">
              <div className="text-[11px] font-medium text-neutral-500">{a.label}</div>
              <div className="mt-1 text-[16px] font-semibold tabular-nums">{a.value}</div>
              <div className="mt-0.5 text-[10px] text-neutral-400">{a.hint}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
};

/* =========================================================================
   MAIN APP
   ========================================================================= */

export default function FinanceDashboard() {
  const [range, setRange] = useState("30d");
  const [view, setView] = useState("overview");
  const data = useMemo(() => generateTrend(range), [range]);

  const totals = useMemo(() => {
    const revenue = data.reduce((s, d) => s + d.revenue, 0);
    const profit = data.reduce((s, d) => s + d.profit, 0);
    const adSpend = data.reduce((s, d) => s + d.adSpend, 0);
    const roas = revenue / adSpend;
    return { revenue, profit, adSpend, roas };
  }, [data]);

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased"
      style={{ fontFamily: '"Geist", ui-sans-serif, system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
        .tabular-nums { font-variant-numeric: tabular-nums; }
        .mono { font-family: "Geist Mono", ui-monospace, monospace; }
      `}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-neutral-200/70 bg-white/80 backdrop-blur-xl">
        {/* Northstar accent stripe */}
        <div className="h-[2px] w-full bg-[#0d1d3d]" />
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {/* Northstar wordmark */}
              <div className="flex items-center gap-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0d1d3d]">
                  <span
                    className="text-[13px] font-black leading-none text-white"
                    style={{
                      fontFamily: "'Barlow Condensed', 'Oswald', 'Arial Narrow', Impact, sans-serif",
                    }}
                  >
                    Z
                  </span>
                </div>
                <span
                  className="text-[18px] font-black uppercase tracking-[0.04em] leading-none text-[#0d1d3d]"
                  style={{
                    fontFamily: "'Barlow Condensed', 'Oswald', 'Arial Narrow', Impact, sans-serif",
                  }}
                >
                  NORTHSTAR
                </span>
              </div>
              <span className="text-neutral-300">/</span>
              <span className="text-[13px] text-neutral-500">Group B.V.</span>
              <ChevronDown size={13} className="text-neutral-400" />
            </div>
            <span className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 md:inline-flex">
              <span className="h-1 w-1 rounded-full bg-amber-500" />
              Demo · mock data
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[12px] text-neutral-500">
              <Search size={12} />
              <span>Search</span>
              <span className="mono ml-4 flex items-center gap-0.5 rounded border border-neutral-200 bg-white px-1 text-[10px] text-neutral-400">
                <Command size={9} /> K
              </span>
            </div>
            <button className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100">
              <Settings size={15} />
            </button>
            <div className="ml-1 h-7 w-7 rounded-full bg-gradient-to-br from-[#0d1d3d] to-[#1e3a6f] ring-2 ring-white" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-6 px-6 py-6">
        {/* Sidebar */}
        <aside className="hidden w-[220px] shrink-0 md:block">
          <nav className="sticky top-[72px] space-y-0.5">
            <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Dashboard</div>
            <NavItem icon={LayoutDashboard} label="Overview" active={view === "overview"} onClick={() => setView("overview")} />
            <div className="pt-3 px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">The 5 Pillars</div>
            <NavItem icon={Zap} label="Daily P&L" active={view === "daily"} onClick={() => setView("daily")} />
            <NavItem icon={Globe} label="Margin per market" active={view === "markets"} onClick={() => setView("markets")} />
            <NavItem icon={CalendarDays} label="Monthly overview" active={view === "monthly"} onClick={() => setView("monthly")} />
            <NavItem icon={Scale} label="Balance sheet" active={view === "balance"} onClick={() => setView("balance")} />
            <NavItem icon={LineChartIcon} label="Forecast" active={view === "forecast"} onClick={() => setView("forecast")} />

            <div className="pt-3 px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Operations</div>
            <NavItem icon={GitCompareArrows} label="Reconciliation" active={view === "reconciliation"} onClick={() => setView("reconciliation")} badge="4" />
            <NavItem icon={Plug} label="Sync status" active={view === "sync"} onClick={() => setView("sync")} />

            <div className="pt-4">
              <div className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Data sources</div>
              <div className="space-y-1 px-2.5 text-[12px] text-neutral-500">
                <div className="flex items-center justify-between"><span>Shopify Plus</span><StatusDot status="ok" /></div>
                <div className="flex items-center justify-between"><span>Triple Whale</span><StatusDot status="ok" /></div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">Jortt <span className="text-[9px] text-[#13B5EA] font-medium">→ Xero</span></span>
                  <StatusDot status="ok" />
                </div>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {/* Always-visible view switcher (also works on narrow screens) */}
          <div className="mb-5 -mx-6 border-b border-neutral-200 bg-white px-6 py-2 md:hidden">
            <div className="flex gap-1 overflow-x-auto">
              {[
                { id: "overview", label: "Overview", icon: LayoutDashboard },
                { id: "daily", label: "Daily P&L", icon: Zap },
                { id: "markets", label: "Markets", icon: Globe },
                { id: "monthly", label: "Monthly", icon: CalendarDays },
                { id: "balance", label: "Balance", icon: Scale },
                { id: "forecast", label: "Forecast", icon: LineChartIcon },
                { id: "reconciliation", label: "Reconcile", icon: GitCompareArrows },
                { id: "sync", label: "Sync", icon: Plug },
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setView(t.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
                      view === t.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    <Icon size={13} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {view === "overview" && <OverviewView range={range} setRange={setRange} data={data} totals={totals} />}
          {view === "daily" && <DailyPnLView />}
          {view === "markets" && <MarketsView />}
          {view === "monthly" && <MonthlyView />}
          {view === "balance" && <BalanceView />}
          {view === "forecast" && <ForecastView />}
          {view === "reconciliation" && <ReconciliationView />}
          {view === "sync" && <SyncView />}

          <div className="mt-10 text-center text-[11px] text-neutral-400">
            Synced · {new Date().toLocaleString()} · Prototype with mock data
          </div>
        </main>
      </div>
    </div>
  );
}
