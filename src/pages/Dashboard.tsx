import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const mockChartData = [
  { name: "Sen", penjualan: 12 },
  { name: "Sel", penjualan: 19 },
  { name: "Rab", penjualan: 8 },
  { name: "Kam", penjualan: 15 },
  { name: "Jum", penjualan: 22 },
  { name: "Sab", penjualan: 30 },
  { name: "Min", penjualan: 18 },
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalBarang: 0,
    totalTransaksi: 0,
    totalPendapatan: 0,
    stokRendah: 0,
  });
  const [recentTransaksi, setRecentTransaksi] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentTransaksi();
  }, []);

  const loadStats = async () => {
    const { count: totalBarang } = await supabase.from("barang").select("*", { count: "exact", head: true });
    const { count: totalTransaksi } = await supabase.from("transaksi").select("*", { count: "exact", head: true });
    const { data: pendapatan } = await supabase.from("transaksi").select("total").eq("status", "lunas");
    const { count: stokRendah } = await supabase.from("barang").select("*", { count: "exact", head: true }).lt("stok", 10);

    const totalPendapatan = pendapatan?.reduce((sum, t) => sum + (t.total || 0), 0) || 0;

    setStats({
      totalBarang: totalBarang || 0,
      totalTransaksi: totalTransaksi || 0,
      totalPendapatan,
      stokRendah: stokRendah || 0,
    });
  };

  const loadRecentTransaksi = async () => {
    const { data } = await supabase
      .from("transaksi")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentTransaksi(data || []);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Ringkasan bisnis Anda hari ini</p>
        </div>

        {/* Bento Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Barang" value={stats.totalBarang} icon={Package} change="+5 minggu ini" changeType="positive" />
          <StatCard title="Transaksi" value={stats.totalTransaksi} icon={ShoppingCart} change="+12 hari ini" changeType="positive" />
          <StatCard title="Pendapatan" value={formatCurrency(stats.totalPendapatan)} icon={DollarSign} change="+8.2%" changeType="positive" />
          <StatCard title="Stok Rendah" value={stats.stokRendah} icon={AlertTriangle} change="Perlu restock" changeType="negative" />
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart - takes 2 cols */}
          <div className="lg:col-span-2 glass-card rounded-lg p-5 animate-fade-in">
            <h3 className="font-heading font-semibold mb-4">Penjualan Mingguan</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(235 20% 18%)" />
                <XAxis dataKey="name" stroke="hsl(230 15% 55%)" fontSize={12} />
                <YAxis stroke="hsl(230 15% 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(235 28% 10%)",
                    border: "1px solid hsl(235 20% 18%)",
                    borderRadius: "8px",
                    color: "hsl(230 20% 92%)",
                  }}
                />
                <Bar dataKey="penjualan" fill="hsl(239 84% 67%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Activity */}
          <div className="glass-card rounded-lg p-5 animate-fade-in">
            <h3 className="font-heading font-semibold mb-4">Transaksi Terbaru</h3>
            <div className="space-y-3">
              {recentTransaksi.length === 0 ? (
                <p className="text-muted-foreground text-sm">Belum ada transaksi</p>
              ) : (
                recentTransaksi.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{t.nomor_invoice || "INV-000"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(t.total || 0)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        t.status === "lunas" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
