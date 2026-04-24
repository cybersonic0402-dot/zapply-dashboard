# Loop Subscriptions API — Resolution Log

## ✅ RESOLVED (April 2026)

**Working endpoint:** `GET https://api.loopsubscriptions.com/admin/2023-10/subscription`
**Auth:** `X-Loop-Token: <key>` header (NOT Bearer token)
**Response:** `{ success: true, message: "...", data: [...subscriptions] }`

The dashboard fetcher (`lib/fetchers.ts → fetchLoop`) is now live and returning real subscription data.

---

## Previous Failure (archived)

API Key: `64U4RJquXWrNtcfm6PAgL8c03wcsvxoKLtEgHl9b0aqg9z2Vx5J44v3gQg6Y775k`

Every endpoint at `api.loopwork.co` returned **HTTP 404** regardless of:
- Auth method (Bearer token, x-api-key header)
- HTTP verb (GET, POST)
- Path variations tried:

```
404  https://api.loopwork.co/v1/subscriptions/summary
404  https://api.loopwork.co/v1/subscriptions
404  https://api.loopwork.co/v1/analytics
404  https://api.loopwork.co/v1/analytics/dashboard
404  https://api.loopwork.co/v1/analytics/repeat-purchase
404  https://api.loopwork.co/v1/metrics
404  https://api.loopwork.co/v1/orders
404  https://api.loopwork.co/v1/customers
404  https://api.loopwork.co/v1/plans
404  https://api.loopwork.co/v1/me
404  https://api.loopwork.co/v1/shops/zapply-nl.myshopify.com/subscriptions
404  https://api.loopwork.co/api/v1/subscriptions
404  https://api.loopwork.co/public/v1/subscriptions
404  https://api.loopwork.co/merchant/v1/subscriptions
404  https://api.loopwork.co/graphql (GraphQL)
404  https://api.loopreturns.com/api/v1/subscriptions
```

Server responds with nginx/1.24.0 and HTML `<pre>Not Found</pre>`, meaning the server is alive but has no routes matching any of these paths.

## Root Cause

Loop Subscriptions does not have a **publicly documented REST API**. Their API may be:

1. **Private / invite-only** — only accessible to enterprise merchants with explicit API access enabled by Loop
2. **Different host** — the correct base URL might not be `api.loopwork.co`
3. **Shopify App Proxy only** — data might only be accessible via the Shopify store's app proxy URL (e.g. `https://zapply-nl.myshopify.com/apps/loop-subscriptions/api/...`), which would require the Shopify store access token

## How to Fix

### Option 1: Contact Loop Support (Recommended)
Email Loop Subscriptions support and ask:
- "What is the base URL for the Merchant API?"
- "How do I authenticate? (Bearer token, API key, etc.)"
- "Does my account have API access enabled?"

Ask them to share their API documentation link.

### Option 2: Use Loop's Shopify App Proxy (if available)
If Loop exposes data via an app proxy, the URL pattern would be:
```
https://{shopify-store}/apps/loop/api/v1/subscriptions
```
This requires: Shopify admin token for the store + Loop app installed.

### Option 3: Scrape Loop Dashboard (last resort)
Use Puppeteer to log into the Loop dashboard and extract KPIs.
Not recommended for production.

### Option 4: Use Shopify Subscription Contracts API
Shopify has a native Subscriptions API (via Selling Plans):
```graphql
{
  subscriptionContracts(first: 250) {
    edges {
      node {
        id
        status
        nextBillingDate
        lineCount
        lines(first: 10) { edges { node { currentPrice { amount } } } }
      }
    }
  }
}
```
This requires: `read_own_subscription_contracts` scope on the Shopify token.
Update `SHOPIFY_NL_ADMIN_TOKEN` scope to include this, then we can pull subscription data directly from Shopify.

## Current Dashboard Behavior

While Loop API is unavailable, the dashboard falls back to mock subscription data.
Triple Whale does track some subscription metrics under `rechargeSubscription*` IDs — however those are 0 in the current data, suggesting Loop (not Recharge) is the subscription provider and isn't integrated with Triple Whale yet.
