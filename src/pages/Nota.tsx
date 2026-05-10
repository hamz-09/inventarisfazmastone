import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, Eye, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Konfigurasi file gambar dari folder public/
const LOGO_URL = "/Logo Fazma Stone Hitam.png"; 
const SIGNATURE_URL = "/Signature.png";

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

  const getPaymentStatus = (total: number, bayar: number) => {
    const paid = bayar || 0;
    if (paid === 0) return { label: "Belum Bayar", color: "bg-red-100 text-red-700", icon: <AlertCircle size={12} /> };
    if (paid < total) return { label: "Setengah / DP", color: "bg-orange-100 text-orange-700", icon: <Clock size={12} /> };
    return { label: "Lunas", color: "bg-green-100 text-green-700", icon: <CheckCircle2 size={12} /> };
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
      <html>
        <head>
          <title>Invoice ${selectedNota?.nomor_invoice}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 0; padding: 20px; font-size: 11px; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .company-info { color: #00796b; line-height: 1.4; flex: 1; }
            .company-name { font-weight: bold; font-size: 18px; margin-bottom: 5px; color: #00796b; }
            .logo-section { flex: 1; text-align: right; }
            .logo-img { max-width: 220px; height: auto; }
            .invoice-title { text-align: center; font-size: 22px; font-weight: bold; color: #00796b; margin: 20px 0; border-top: 1px solid #eee; padding-top: 10px; letter-spacing: 1px; }
            .bill-section { display: flex; justify-content: space-between; border-top: 2px solid #00796b; border-bottom: 2px solid #00796b; padding: 12px 0; margin-bottom: 20px; }
            .bill-to-label { color: #00796b; font-weight: bold; font-size: 12px; margin-bottom: 4px; }
            .inv-details span { color: #00796b; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #00796b; color: white; padding: 10px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .footer-section { display: flex; justify-content: space-between; margin-top: 20px; }
            .payment-info { width: 50%; color: #00796b; font-size: 10px; }
            .totals { width: 35%; }
            .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
            .grand-total { font-weight: bold; border-top: 2px solid #00796b; margin-top: 5px; padding-top: 5px; font-size: 12px; }
            .signature-area { margin-top: 30px; text-align: right; position: relative; height: 140px; }
            .signature-wrapper { display: inline-block; text-align: center; position: relative; min-width: 180px; }
            .signature-img { width: 160px; position: absolute; left: 50%; top: 55%; transform: translate(-50%, -50%); z-index: 1; opacity: 0.95; pointer-events: none; }
            .signature-box p { position: relative; z-index: 2; margin: 0; }
          </style>
        </head>
        <body>${printRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 1000);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-heading font-bold text-teal-800">Nota & Invoice</h1>
            <p className="text-muted-foreground">Manajemen transaksi otomatis Fazma Stone</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transaksi.map((t) => {
            const status = getPaymentStatus(t.total, t.jumlah_bayar);
            return (
              <div key={t.id} className="bg-white border rounded-xl p-5 hover:border-teal-500 transition-all cursor-pointer shadow-sm group" onClick={() => viewNota(t)}>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded">{t.nomor_invoice}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold group-hover:text-teal-700 transition-colors">{formatCurrency(t.total)}</p>
                  <p className="text-[11px] text-muted-foreground italic">
                    {new Date(t.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
            <div className="p-12 bg-white" ref={printRef}>
              <div className="header">
                <div className="company-info">
                  <div className="company-name">Fazma Batu Alam</div>
                  <div>Office : Jl. Alternatif Cibubur - Cileungsi (Depan Dealer Mitsubishi)</div>
                  <div>Factory : Desa Lengkong Wetan blok I Sindang Wangi - Majalengka</div>
                  <div>Mobile: 081221131150 | Email: zia.ulhaq@fazmastone.com</div>
                  <div>www.fazmastone.com</div>
                </div>
                <div className="logo-section">
                  <img src={LOGO_URL} alt="Logo Fazma Stone" className="logo-img" />
                </div>
              </div>

              <div className="invoice-title">INVOICE</div>

              <div className="bill-section">
                <div>
                  <div className="bill-to-label">Bill To</div>
                  <div className="font-bold text-sm uppercase">Pelanggan</div>
                </div>
                <div className="text-right space-y-1 text-[11px]">
                  <div><span className="text-teal-700 font-bold">Invoice No :</span> {selectedNota?.nomor_invoice}</div>
                  <div><span className="text-teal-700 font-bold">Date :</span> {selectedNota && new Date(selectedNota.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th className="w-10">Sl.</th>
                    <th>Description</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {selectedNota?.items.map((item, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{item.nama_barang}</td>
                      <td className="text-right">{item.jumlah}</td>
                      <td className="text-right">{formatCurrency(item.harga)}</td>
                      <td className="text-right">{formatCurrency(item.harga * item.jumlah)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="footer-section">
                <div className="payment-info">
                  <p className="font-bold underline mb-1">Payment Instructions</p>
                  <p>Transfer Bank:</p>
                  <p>BCA : 5680 5186 47</p>
                  <p>Mandiri : 90000 2341 1318</p>
                  <p>A/n Zia Ulhaq</p>
                </div>
                <div className="totals text-[11px] space-y-1">
                  <div className="total-row"><span>Subtotal</span><span>{formatCurrency(selectedNota?.subtotal || 0)}</span></div>
                  <div className="total-row font-bold text-sm border-t-2 border-teal-700 pt-1 mt-1"><span>Total</span><span>{formatCurrency(selectedNota?.total || 0)}</span></div>
                  <div className="total-row"><span>Paid</span><span>{formatCurrency(selectedNota?.jumlah_bayar || 0)}</span></div>
                  <div className="total-row font-bold text-teal-700"><span>Balance Due</span><span>{formatCurrency((selectedNota?.total || 0) - (selectedNota?.jumlah_bayar || 0))}</span></div>
                </div>
              </div>

              <div className="signature-area">
                <div className="signature-wrapper">
                  <p className="font-bold mb-16">Terimakasih</p>
                  <img src={SIGNATURE_URL} alt="Tanda Tangan" className="signature-img" />
                  <p className="border-t border-gray-400 px-8 pt-1 font-bold">( Zia Ulhaq )</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-3">
              <Button onClick={handlePrint} className="flex-1 bg-teal-700 hover:bg-teal-800 transition-colors">
                <Printer className="w-4 h-4 mr-2" /> Cetak Nota
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Tutup</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}