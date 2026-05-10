import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TransaksiDetail {
  id: string;
  nomor_invoice: string;
  total: number;
  subtotal: number;
  diskon: number;
  pajak: number;
  jumlah_bayar: number;
  metode_pembayaran: string;
  status: string;
  created_at: string;
  items: { nama_barang: string; jumlah: number; harga: number }[];
}

export default function Nota() {
  const [transaksi, setTransaksi] = useState<any[]>([]);
  const [selectedNota, setSelectedNota] = useState<TransaksiDetail | null>(null);
  const [open, setOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadTransaksi(); }, []);

  const loadTransaksi = async () => {
    const { data } = await supabase.from("transaksi").select("*").order("created_at", { ascending: false });
    setTransaksi(data || []);
  };

  const viewNota = async (t: any) => {
    const { data: details } = await supabase
      .from("detail_transaksi")
      .select("*, barang:barang_id(nama_barang)")
      .eq("transaksi_id", t.id);

    setSelectedNota({
      ...t,
      items: (details || []).map((d: any) => ({
        nama_barang: d.barang?.nama_barang || "Unknown",
        jumlah: d.jumlah,
        harga: d.harga,
      })),
    });
    setOpen(true);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Invoice ${selectedNota?.nomor_invoice}</title>
      <style>body{font-family:monospace;padding:20px;max-width:400px;margin:0 auto}table{width:100%;border-collapse:collapse}td,th{padding:4px 0;text-align:left}.right{text-align:right}.line{border-top:1px dashed #000;margin:8px 0}</style>
      </head><body>${printRef.current.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Nota / Invoice</h1>
          <p className="text-muted-foreground">Lihat dan cetak invoice transaksi</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {transaksi.length === 0 ? (
            <div className="col-span-full glass-card rounded-lg p-8 text-center text-muted-foreground">
              Belum ada nota
            </div>
          ) : (
            transaksi.map((t) => (
              <div key={t.id} className="glass-card rounded-lg p-5 hover:glow-primary transition-all animate-fade-in">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-heading font-semibold text-primary">{t.nomor_invoice}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${t.status === "lunas" ? "bg-success/10 text-success" : t.status === "dp" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {t.status === "belum_bayar" ? "Belum Bayar" : t.status === "dp" ? "DP" : "Lunas"}
                  </span>
                </div>
                <p className="text-xl font-heading font-bold mb-1">{formatCurrency(t.total)}</p>
                {t.status !== "lunas" && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Dibayar: {formatCurrency(t.jumlah_bayar || 0)} · Sisa: {formatCurrency(t.total - (t.jumlah_bayar || 0))}
                  </p>
                )}
                <Button onClick={() => viewNota(t)} variant="secondary" className="w-full mt-2" size="sm">
                  <Eye className="mr-2 h-3.5 w-3.5" /> Lihat Nota
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Invoice Preview Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Invoice Preview</DialogTitle>
            </DialogHeader>

            <div ref={printRef} className="bg-background p-6 rounded-lg text-sm">
              <div className="text-center mb-4">
                <h3 className="font-heading font-bold text-lg">InvenPOS</h3>
                <p className="text-muted-foreground text-xs">Sistem Inventaris & POS</p>
                <div className="border-t border-dashed border-border mt-2 pt-2">
                  <p className="text-xs">{selectedNota?.nomor_invoice}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedNota && new Date(selectedNota.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              <table className="w-full text-xs mb-3">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1">Item</th>
                    <th className="text-right py-1">Qty</th>
                    <th className="text-right py-1">Harga</th>
                    <th className="text-right py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedNota?.items.map((item, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-1">{item.nama_barang}</td>
                      <td className="text-right py-1">{item.jumlah}</td>
                      <td className="text-right py-1">{formatCurrency(item.harga)}</td>
                      <td className="text-right py-1">{formatCurrency(item.harga * item.jumlah)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-border pt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedNota?.subtotal || 0)}</span>
                </div>
                {(selectedNota?.diskon || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diskon ({selectedNota?.diskon}%)</span>
                    <span>-{formatCurrency((selectedNota?.subtotal || 0) * (selectedNota?.diskon || 0) / 100)}</span>
                  </div>
                )}
                {(selectedNota?.pajak || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pajak ({selectedNota?.pajak}%)</span>
                    <span>+{formatCurrency(((selectedNota?.subtotal || 0) - (selectedNota?.subtotal || 0) * (selectedNota?.diskon || 0) / 100) * (selectedNota?.pajak || 0) / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t border-dashed border-border pt-2">
                  <span>TOTAL</span>
                  <span>{formatCurrency(selectedNota?.total || 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Pembayaran</span>
                  <span className="capitalize">{selectedNota?.metode_pembayaran}</span>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-4">Terima kasih atas pembelian Anda!</p>
            </div>

            <Button onClick={handlePrint} className="w-full gradient-primary text-primary-foreground">
              <Printer className="mr-2 h-4 w-4" /> Cetak Nota
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
