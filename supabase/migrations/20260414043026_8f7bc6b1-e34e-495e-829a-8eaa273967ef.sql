
-- Create updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Barang table
CREATE TABLE public.barang (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_barang TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT '',
  stok INTEGER NOT NULL DEFAULT 0,
  harga_beli INTEGER NOT NULL DEFAULT 0,
  harga_jual INTEGER NOT NULL DEFAULT 0,
  supplier TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.barang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view barang" ON public.barang FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert barang" ON public.barang FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update barang" ON public.barang FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete barang" ON public.barang FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_barang_updated_at BEFORE UPDATE ON public.barang FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transaksi table
CREATE TABLE public.transaksi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor_invoice TEXT NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  diskon NUMERIC NOT NULL DEFAULT 0,
  pajak NUMERIC NOT NULL DEFAULT 0,
  metode_pembayaran TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'pending',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transaksi" ON public.transaksi FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transaksi" ON public.transaksi FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transaksi" ON public.transaksi FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_transaksi_updated_at BEFORE UPDATE ON public.transaksi FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Detail Transaksi table
CREATE TABLE public.detail_transaksi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaksi_id UUID NOT NULL REFERENCES public.transaksi(id) ON DELETE CASCADE,
  barang_id UUID NOT NULL REFERENCES public.barang(id) ON DELETE CASCADE,
  jumlah INTEGER NOT NULL DEFAULT 0,
  harga NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.detail_transaksi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view detail of their transaksi" ON public.detail_transaksi FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.transaksi WHERE transaksi.id = detail_transaksi.transaksi_id AND transaksi.user_id = auth.uid())
);
CREATE POLICY "Users can insert detail transaksi" ON public.detail_transaksi FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.transaksi WHERE transaksi.id = detail_transaksi.transaksi_id AND transaksi.user_id = auth.uid())
);

-- Dokumentasi table
CREATE TABLE public.dokumentasi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_file TEXT NOT NULL,
  file_url TEXT NOT NULL,
  tipe_file TEXT NOT NULL DEFAULT 'file',
  deskripsi TEXT DEFAULT '',
  kategori TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  relasi_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dokumentasi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view dokumentasi" ON public.dokumentasi FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert dokumentasi" ON public.dokumentasi FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete dokumentasi" ON public.dokumentasi FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_dokumentasi_updated_at BEFORE UPDATE ON public.dokumentasi FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for dokumentasi
INSERT INTO storage.buckets (id, name, public) VALUES ('dokumentasi', 'dokumentasi', true);

CREATE POLICY "Authenticated users can upload dokumentasi files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dokumentasi');
CREATE POLICY "Anyone can view dokumentasi files" ON storage.objects FOR SELECT USING (bucket_id = 'dokumentasi');
CREATE POLICY "Authenticated users can delete dokumentasi files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dokumentasi');
