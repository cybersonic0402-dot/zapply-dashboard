import { NextResponse } from "next/server";

// Jortt uses client_credentials — no user-facing OAuth flow needed.
// API keys are configured in .env.local directly.
export async function GET() {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL!);
  url.searchParams.set("connected", "jortt");
  return NextResponse.redirect(url.toString());
}
