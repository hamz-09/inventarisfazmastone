ALTER TABLE public.transaksi ADD COLUMN IF NOT EXISTS jumlah_bayar numeric NOT NULL DEFAULT 0;
ALTER TABLE public.transaksi ALTER COLUMN status SET DEFAULT 'belum_bayar';