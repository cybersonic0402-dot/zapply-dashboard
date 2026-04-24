import React from "react";

interface DashboardUser {
  email: string;
  name: string;
  avatar: string | null;
}

interface LiveData {
  shopifyMarkets?: any[] | null;
  shopifyMonthly?: any[] | null;
  tripleWhale?: any[] | null;
  loop?: any[] | null;
  jortt?: { opexByMonth: any[]; opexDetail: Record<string, any>; revenueByMonth: Record<string, number>; live: boolean } | null;
}

export default function FinanceDashboard(props: {
  user?: DashboardUser | null;
  liveData?: LiveData | null;
  connections?: Record<string, string>;
}): React.JSX.Element;
