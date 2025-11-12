import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Notice {
  id: string;
  risk_score: number;
  estimated_value: number;
  ron_contract_value: number;
  publication_date: string;
  contracting_authority: string;
}

interface Vendor {
  id: string;
  vendor_name: string;
  total_contracts: number;
  total_value: number;
}

export const DashboardCharts = () => {
  // Fetch all notices for analytics
  const { data: notices, isLoading: loadingNotices } = useQuery({
    queryKey: ["notices-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("id, risk_score, estimated_value, ron_contract_value, publication_date, contracting_authority")
        .order("publication_date", { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as Notice[];
    },
  });

  // Fetch top vendors
  const { data: vendors, isLoading: loadingVendors } = useQuery({
    queryKey: ["vendors-top"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, vendor_name, total_contracts, total_value")
        .order("total_value", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as Vendor[];
    },
  });

  // Calculate risk distribution from real data
  const riskDistributionData = notices ? [
    { 
      name: "Low Risk", 
      value: notices.filter(n => n.risk_score < 30).length,
      color: "hsl(142, 76%, 36%)" 
    },
    { 
      name: "Medium Risk", 
      value: notices.filter(n => n.risk_score >= 30 && n.risk_score < 70).length,
      color: "hsl(48, 96%, 53%)" 
    },
    { 
      name: "High Risk", 
      value: notices.filter(n => n.risk_score >= 70).length,
      color: "hsl(0, 84%, 60%)" 
    },
  ] : [];

  // Calculate monthly trends from real data
  const monthlyTrendsData = notices ? (() => {
    const monthlyData: Record<string, { contracts: number; value: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    notices.forEach(notice => {
      const date = new Date(notice.publication_date);
      const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { contracts: 0, value: 0 };
      }
      
      monthlyData[monthKey].contracts++;
      monthlyData[monthKey].value += notice.estimated_value || notice.ron_contract_value || 0;
    });
    
    // Get last 6 months
    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .slice(-6);
  })() : [];

  // Top contractors data from vendors
  const topContractorsData = vendors?.map(v => ({
    name: v.vendor_name.length > 20 ? v.vendor_name.substring(0, 20) + '...' : v.vendor_name,
    contracts: v.total_contracts,
    value: v.total_value
  })) || [];

  if (loadingNotices || loadingVendors) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[350px]" />
        <Skeleton className="h-[350px]" />
        <Skeleton className="h-[350px] lg:col-span-2" />
      </div>
    );
  }

  const hasRiskData = riskDistributionData.some(d => d.value > 0);
  const hasMonthlyData = monthlyTrendsData.length > 0;
  const hasContractorData = topContractorsData.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Risk Distribution</h3>
        {hasRiskData ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {riskDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No risk data available yet. Sync procurement notices to see analytics.
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Contract Trends</h3>
        {hasMonthlyData ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)"
                }}
              />
              <Line type="monotone" dataKey="contracts" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No monthly trend data available yet.
          </div>
        )}
      </Card>

      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Top Contractors by Value</h3>
        {hasContractorData ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topContractorsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)"
                }}
                formatter={(value: number) => 
                  new Intl.NumberFormat("ro-RO", {
                    style: "currency",
                    currency: "RON",
                    maximumFractionDigits: 0,
                  }).format(value)
                }
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No contractor data available yet.
          </div>
        )}
      </Card>
    </div>
  );
};
