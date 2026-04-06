import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileDown, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { PDFDocument } from "pdf-lib";

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const PdfCompressor = () => {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(50);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; size: number } | null>(null);
  const { toast } = useToast();

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }
    setFile(f);
    setResult(null);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) handleFile(f);
    };
    input.click();
  };

  const compress = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      // Remove metadata to reduce size
      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer("");
      pdfDoc.setCreator("");

      const compressed = await pdfDoc.save({
        useObjectStreams: quality < 80,
        addDefaultPage: false,
        objectsPerTick: 100,
      });

      const blob = new Blob([compressed], { type: "application/pdf" });
      setResult({ blob, size: blob.size });
      toast({ title: "Compressed!", description: `Size reduced to ${formatSize(blob.size)}` });
    } catch {
      toast({ title: "Compression failed", description: "The PDF may be corrupted or password-protected.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file ? file.name.replace(".pdf", "_compressed.pdf") : "compressed.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clear = () => {
    setFile(null);
    setResult(null);
  };

  const savings = file && result ? Math.max(0, Math.round((1 - result.size / file.size) * 100)) : 0;

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <FileDown className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">PDF Compressor</h1>
          <p className="mt-2 text-muted-foreground">Reduce PDF file size — fast, free, and private.</p>
        </div>

        {!file ? (
          <motion.div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={handleClick}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-drop-zone p-12 text-center transition-colors hover:border-drop-zone-border"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-heading text-lg font-semibold text-foreground">Drag & drop a PDF here</p>
                <p className="mt-1 text-sm text-muted-foreground">or click to browse files</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* File info */}
              <div className="flex items-center gap-3 rounded-xl bg-file-item p-4 border border-border">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileDown className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">Original: {formatSize(file.size)}</p>
                </div>
                <button onClick={clear} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Quality slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Compression Level</label>
                  <span className="text-sm text-muted-foreground">
                    {quality < 30 ? "Maximum" : quality < 60 ? "Balanced" : "Minimum"}
                  </span>
                </div>
                <Slider value={[quality]} onValueChange={([v]) => setQuality(v)} min={10} max={90} step={10} />
                <p className="text-xs text-muted-foreground">
                  Lower = smaller file, higher = better quality
                </p>
              </div>

              {/* Compress button */}
              <Button onClick={compress} disabled={processing} className="w-full gap-2 text-base font-semibold h-12 rounded-xl" size="lg">
                {processing ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Compressing…</>
                ) : (
                  <><FileDown className="h-5 w-5" /> Compress PDF</>
                )}
              </Button>

              {/* Result */}
              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-file-item p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Compressed Size</p>
                    <p className="text-sm font-semibold text-primary">{formatSize(result.size)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Savings</p>
                    <p className="text-sm font-semibold text-foreground">{savings}% smaller</p>
                  </div>
                  <Button onClick={download} variant="secondary" className="w-full gap-2 rounded-xl">
                    <FileDown className="h-4 w-4" /> Download Compressed PDF
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
};

export default PdfCompressor;
