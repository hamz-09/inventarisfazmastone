import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";

interface Barang {
  id: string;
  nama_barang: string;
  harga_jual: number;
  stok: number;
}

interface CartItem {
  barang: Barang;
  jumlah: number;
}

export default function Penjualan() {
  const [barangList, setBarangList] = useState<Barang[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBarang, setSelectedBarang] = useState("");
  const [jumlah, setJumlah] = useState(1);
  const [diskon, setDiskon] = useState(0);
  const [pajak, setPajak] = useState(0);
  const [metodePembayaran, setMetodePembayaran] = useState("cash");
  const [statusBayar, setStatusBayar] = useState<"belum_bayar" | "dp" | "lunas">("lunas");
  const [jumlahBayar, setJumlahBayar] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transaksiList, setTransaksiList] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadBarang();
    loadTransaksi();
  }, []);

  const loadBarang = async () => {
    const { data } = await supabase.from("barang").select("id, nama_barang, harga_jual, stok").gt("stok", 0);
    setBarangList(data || []);
  };

  const loadTransaksi = async () => {
    const { data } = await supabase.from("transaksi").select("*").order("created_at", { ascending: false }).limit(20);
    setTransaksiList(data || []);
  };

  const addToCart = () => {
    const b = barangList.find((x) => x.id === selectedBarang);
    if (!b) return;
    const existing = cart.find((c) => c.barang.id === b.id);
    if (existing) {
      setCart(cart.map((c) => c.barang.id === b.id ? { ...c, jumlah: c.jumlah + jumlah } : c));
    } else {
      setCart([...cart, { barang: b, jumlah }]);
    }
    setSelectedBarang("");
    setJumlah(1);
  };

  const removeFromCart = (id: string) => setCart(cart.filter((c) => c.barang.id !== id));

  const subtotal = cart.reduce((s, c) => s + c.barang.harga_jual * c.jumlah, 0);
  const diskonAmount = subtotal * (diskon / 100);
  const pajakAmount = (subtotal - diskonAmount) * (pajak / 100);
  const total = subtotal - diskonAmount + pajakAmount;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const d = new Date();
      const nomorInvoice = `FZ/${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear()).slice(-2)}/${String(Date.now()).slice(-5)}`;
      const bayar = statusBayar === "lunas" ? total : statusBayar === "belum_bayar" ? 0 : jumlahBayar;
      const { data: transaksi, error: tErr } = await supabase.from("transaksi").insert({
        nomor_invoice: nomorInvoice,
        total,
        subtotal,
        diskon,
        pajak,
        metode_pembayaran: metodePembayaran,
        status: statusBayar,
        jumlah_bayar: bayar,
        user_id: user?.id,
      }).select().single();

      if (tErr) throw tErr;

      const details = cart.map((c) => ({
        transaksi_id: transaksi.id,
        barang_id: c.barang.id,
        jumlah: c.jumlah,
        harga: c.barang.harga_jual,
      }));
      const { error: dErr } = await supabase.from("detail_transaksi").insert(details);
      if (dErr) throw dErr;

      // Update stock
      for (const c of cart) {
        await supabase.from("barang").update({ stok: c.barang.stok - c.jumlah }).eq("id", c.barang.id);
      }

      toast({ title: "Transaksi & Invoice Dibuat!", description: `Invoice: ${nomorInvoice}` });
      setCart([]);
      setDiskon(0);
      setPajak(0);
      setStatusBayar("lunas");
      setJumlahBayar(0);
      setOpen(false);
      loadBarang();
      loadTransaksi();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Penjualan</h1>
            <p className="text-muted-foreground">Buat transaksi penjualan baru</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> Transaksi Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">Transaksi Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Add item */}
                <div className="flex gap-2">
                  <Select value={selectedBarang} onValueChange={setSelectedBarang}>
                    <SelectTrigger className="flex-1 bg-secondary border-border">
                      <SelectValue placeholder="Pilih barang" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {barangList.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.nama_barang} ({b.stok})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" value={jumlah} onChange={(e) => setJumlah(parseInt(e.target.value) || 1)} min={1} className="w-20 bg-secondary border-border" />
                  <Button onClick={addToCart} disabled={!selectedBarang} variant="secondary">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Cart */}
                {cart.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50">
                          <th className="text-left p-3">Barang</th>
                          <th className="text-right p-3">Harga</th>
                          <th className="text-right p-3">Qty</th>
                          <th className="text-right p-3">Total</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((c) => (
                          <tr key={c.barang.id} className="border-b border-border/50">
                            <td className="p-3">{c.barang.nama_barang}</td>
                            <td className="p-3 text-right">{formatCurrency(c.barang.harga_jual)}</td>
                            <td className="p-3 text-right">{c.jumlah}</td>
                            <td className="p-3 text-right">{formatCurrency(c.barang.harga_jual * c.jumlah)}</td>
                            <td className="p-3">
                              <Button variant="ghost" size="icon" onClick={() => removeFromCart(c.barang.id)} className="h-7 w-7 text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totals */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Diskon (%)</Label>
                    <Input type="number" value={diskon} onChange={(e) => setDiskon(parseFloat(e.target.value) || 0)} min={0} max={100} className="bg-secondary border-border mt-1" />
                  </div>
                  <div>
                    <Label>Pajak (%)</Label>
                    <Input type="number" value={pajak} onChange={(e) => setPajak(parseFloat(e.target.value) || 0)} min={0} className="bg-secondary border-border mt-1" />
                  </div>
                </div>

                <div>
                  <Label>Metode Pembayaran</Label>
                  <Select value={metodePembayaran} onValueChange={setMetodePembayaran}>
                    <SelectTrigger className="bg-secondary border-border mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status Pembayaran</Label>
                  <Select value={statusBayar} onValueChange={(v: any) => { setStatusBayar(v); if (v === "lunas") setJumlahBayar(total); else if (v === "belum_bayar") setJumlahBayar(0); }}>
                    <SelectTrigger className="bg-secondary border-border mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
                      <SelectItem value="dp">DP / Setengah</SelectItem>
                      <SelectItem value="lunas">Lunas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {statusBayar === "dp" && (
                  <div>
                    <Label>Jumlah Dibayar (DP)</Label>
                    <Input type="number" value={jumlahBayar} onChange={(e) => setJumlahBayar(parseFloat(e.target.value) || 0)} min={0} max={total} className="bg-secondary border-border mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Sisa: {formatCurrency(Math.max(0, total - jumlahBayar))}</p>
                  </div>
                )}

                <div className="glass-card rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  {diskon > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Diskon ({diskon}%)</span><span className="text-destructive">-{formatCurrency(diskonAmount)}</span></div>}
                  {pajak > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pajak ({pajak}%)</span><span>+{formatCurrency(pajakAmount)}</span></div>}
                  <div className="flex justify-between font-heading font-bold text-lg border-t border-border pt-2">
                    <span>Total</span><span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <Button onClick={handleCheckout} className="w-full gradient-primary text-primary-foreground" disabled={loading || cart.length === 0}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {loading ? "Memproses..." : "Bayar Sekarang"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Transaction List */}
        <div className="glass-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Invoice</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Tanggal</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Total</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Pembayaran</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {transaksiList.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Belum ada transaksi</td></tr>
                ) : (
                  transaksiList.map((t) => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="p-4 font-medium text-primary">{t.nomor_invoice}</td>
                      <td className="p-4 hidden sm:table-cell text-muted-foreground">{new Date(t.created_at).toLocaleDateString("id-ID")}</td>
                      <td className="p-4 font-medium">{formatCurrency(t.total)}</td>
                      <td className="p-4 hidden sm:table-cell capitalize text-muted-foreground">{t.metode_pembayaran}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${t.status === "lunas" ? "bg-success/10 text-success" : t.status === "dp" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                          {t.status === "belum_bayar" ? "Belum Bayar" : t.status === "dp" ? "DP" : "Lunas"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
