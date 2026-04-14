import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Image, Video, File, Trash2, ExternalLink } from "lucide-react";

interface Dokumen {
  id: string;
  nama_file: string;
  file_url: string;
  tipe_file: string;
  deskripsi: string;
  kategori: string;
  tags: string[];
  created_at: string;
}

export default function Dokumentasi() {
  const [dokumen, setDokumen] = useState<Dokumen[]>([]);
  const [open, setOpen] = useState(false);
  const [deskripsi, setDeskripsi] = useState("");
  const [kategori, setKategori] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadDokumen(); }, []);

  const loadDokumen = async () => {
    const { data } = await supabase.from("dokumentasi").select("*").order("created_at", { ascending: false });
    setDokumen(data || []);
  };

  const getFileType = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "image";
    if (["mp4", "webm", "avi", "mov"].includes(ext || "")) return "video";
    if (ext === "pdf") return "pdf";
    return "file";
  };

  const FileIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "image": return <Image className="h-8 w-8 text-primary" />;
      case "video": return <Video className="h-8 w-8 text-success" />;
      case "pdf": return <FileText className="h-8 w-8 text-destructive" />;
      default: return <File className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);

    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("dokumentasi").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("dokumentasi").getPublicUrl(fileName);

      const { error } = await supabase.from("dokumentasi").insert({
        nama_file: file.name,
        file_url: publicUrl,
        tipe_file: getFileType(file.name),
        deskripsi,
        kategori,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      if (error) throw error;

      toast({ title: "Berhasil", description: "File berhasil diupload" });
      setOpen(false);
      setFile(null);
      setDeskripsi("");
      setKategori("");
      setTags("");
      loadDokumen();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus dokumen ini?")) return;
    await supabase.from("dokumentasi").delete().eq("id", id);
    toast({ title: "Dihapus", description: "Dokumen berhasil dihapus" });
    loadDokumen();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Dokumentasi</h1>
            <p className="text-muted-foreground">Upload dan kelola file dokumentasi</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> Upload File
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading">Upload Dokumen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <Label>File</Label>
                  <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required className="bg-secondary border-border mt-1" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" />
                </div>
                <div>
                  <Label>Deskripsi</Label>
                  <Input value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Deskripsi file" className="bg-secondary border-border mt-1" />
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Input value={kategori} onChange={(e) => setKategori(e.target.value)} placeholder="Kategori dokumen" className="bg-secondary border-border mt-1" />
                </div>
                <div>
                  <Label>Tags (pisahkan dengan koma)</Label>
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2, tag3" className="bg-secondary border-border mt-1" />
                </div>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading || !file}>
                  {loading ? "Mengupload..." : "Upload"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dokumen.length === 0 ? (
            <div className="col-span-full glass-card rounded-lg p-8 text-center text-muted-foreground">
              Belum ada dokumen
            </div>
          ) : (
            dokumen.map((d) => (
              <div key={d.id} className="glass-card rounded-lg p-4 animate-fade-in group">
                <div className="flex items-center justify-center h-24 bg-secondary/50 rounded-lg mb-3">
                  {d.tipe_file === "image" ? (
                    <img src={d.file_url} alt={d.nama_file} className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <FileIcon type={d.tipe_file} />
                  )}
                </div>
                <p className="font-medium text-sm truncate">{d.nama_file}</p>
                {d.deskripsi && <p className="text-xs text-muted-foreground truncate">{d.deskripsi}</p>}
                {d.kategori && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-2">{d.kategori}</span>
                )}
                {d.tags && d.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {d.tags.map((tag, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">#{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" asChild className="flex-1 text-xs">
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3 w-3" /> Buka
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)} className="h-8 w-8 text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
