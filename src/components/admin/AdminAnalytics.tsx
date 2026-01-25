import { useState, useEffect } from "react";
import {
  BarChart3,
  Users,
  Wallet,
  TrendingUp,
  Activity,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Analytics {
  totalUsers: number;
  totalDeposits: number;
  approvedDeposits: number;
  pendingDeposits: number;
  totalAnalyses: number;
  totalRevenue: number;
  todayAnalyses: number;
  todayDeposits: number;
}

export const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // Fetch all data in parallel
        const [
          usersResult,
          depositsResult,
          analysesResult,
          todayAnalysesResult,
          todayDepositsResult,
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("deposits").select("amount, status"),
          supabase.from("analyses").select("cost"),
          supabase
            .from("analyses")
            .select("*", { count: "exact", head: true })
            .gte("created_at", todayISO),
          supabase
            .from("deposits")
            .select("*", { count: "exact", head: true })
            .gte("created_at", todayISO),
        ]);

        const deposits = depositsResult.data || [];
        const analyses = analysesResult.data || [];

        setAnalytics({
          totalUsers: usersResult.count || 0,
          totalDeposits: deposits.length,
          approvedDeposits: deposits.filter((d) => d.status === "approved")
            .length,
          pendingDeposits: deposits.filter((d) => d.status === "pending").length,
          totalAnalyses: analyses.length,
          totalRevenue: analyses.reduce((sum, a) => sum + (a.cost || 0), 0),
          todayAnalyses: todayAnalysesResult.count || 0,
          todayDeposits: todayDepositsResult.count || 0,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!analytics) return null;

  const stats = [
    {
      label: "Total Users",
      value: analytics.totalUsers,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Analyses",
      value: analytics.totalAnalyses,
      icon: BarChart3,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      label: "Today Analyses",
      value: analytics.todayAnalyses,
      icon: Activity,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Revenue",
      value: `$${analytics.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Total Deposits",
      value: analytics.totalDeposits,
      icon: Wallet,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Pending Deposits",
      value: analytics.pendingDeposits,
      icon: TrendingUp,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Analytics Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-muted/50 flex items-center gap-3"
            >
              <div
                className={`w-10 h-10 rounded-full ${stat.bg} flex items-center justify-center`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
