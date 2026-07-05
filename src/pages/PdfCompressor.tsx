import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileDown, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

async function compressPdfToTarget(
  file: File,
  targetSizeKB: number,
  onProgress: (msg: string) => void
): Promise<Blob> {
  const pdfjsLib = await import("pdfjs-dist");
  const { PDFDocument } = await import("pdf-lib");

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const numPages = pdfDoc.numPages;

  // Binary search on quality to hit target size
  let lo = 0.1;
  let hi = 0.95;
  let bestBlob: Blob | null = null;
  const targetBytes = targetSizeKB * 1024;

  // Try a few quality levels to converge on target
  for (let attempt = 0; attempt < 6; attempt++) {
    const quality = (lo + hi) / 2;
    onProgress(`Trying quality ${Math.round(quality * 100)}% (attempt ${attempt + 1})…`);

    const newPdf = await PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const imgBytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
      const img = await newPdf.embedJpg(imgBytes);

      const newPage = newPdf.addPage([viewport.width, viewport.height]);
      newPage.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height });
    }

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });

    if (!bestBlob || blob.size < bestBlob.size) {
      bestBlob = blob;
    }

    if (blob.size <= targetBytes) {
      // Under target — try higher quality
      lo = quality;
    } else {
      // Over target — try lower quality
      hi = quality;
    }

    // Close enough (within 5%)
    if (Math.abs(blob.size - targetBytes) / targetBytes < 0.05) break;
  }

  // If still over target after binary search, try with lower scale
  if (bestBlob && bestBlob.size > targetBytes * 1.1) {
    onProgress("Reducing resolution for smaller size…");
    const quality = 0.3;
    const scale = Math.max(0.5, targetBytes / bestBlob.size);

    const newPdf = await PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const origViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: scale * 1.5 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const imgBytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
      const img = await newPdf.embedJpg(imgBytes);

      const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
      newPage.drawImage(img, { x: 0, y: 0, width: origViewport.width, height: origViewport.height });
    }

    const pdfBytes = await newPdf.save();
    const fallbackBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    if (!bestBlob || fallbackBlob.size < bestBlob.size) {
      bestBlob = fallbackBlob;
    }
  }

  return bestBlob!;
}

const TARGET_PRESETS = [
  { label: "500 KB", value: "500" },
  { label: "1 MB", value: "1024" },
  { label: "2 MB", value: "2048" },
  { label: "5 MB", value: "5120" },
  { label: "Custom", value: "custom" },
];

const PdfCompressor = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState("1024");
  const [customSizeKB, setCustomSizeKB] = useState("1024");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ blob: Blob; size: number; unchanged?: boolean } | null>(null);
  const { toast } = useToast();

  const targetKB = preset === "custom" ? Number(customSizeKB) || 1024 : Number(preset);

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

    if (file.size <= targetKB * 1024) {
      toast({ title: "Already small enough", description: `File is already under ${formatSize(targetKB * 1024)}.` });
      return;
    }

    setProcessing(true);
    setProgress("Starting compression…");
    try {
      const blob = await compressPdfToTarget(file, targetKB, setProgress);
      if (blob.size >= file.size) {
        // Rasterization made the file bigger (common for text/vector PDFs).
        // Keep the original file rather than offering a larger, degraded, non-searchable one.
        setResult({ blob: new Blob([await file.arrayBuffer()], { type: "application/pdf" }), size: file.size, unchanged: true });
        toast({
          title: "Cannot compress further",
          description: "This PDF is mostly text or vector graphics — compression would make it larger and blurry. The original file has been kept.",
          variant: "destructive",
        });
      } else {
        setResult({ blob, size: blob.size, unchanged: false });
        toast({ title: "Compressed!", description: `Reduced to ${formatSize(blob.size)}` });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Compression failed", description: "The PDF may be corrupted or password-protected.", variant: "destructive" });
    } finally {
      setProcessing(false);
      setProgress("");
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
          <p className="mt-2 text-muted-foreground">Compress PDFs to your target file size — fast, free, and private.</p>
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

              {/* Target size selector */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Target File Size</Label>
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select target size" />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {preset === "custom" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={customSizeKB}
                      onChange={(e) => setCustomSizeKB(e.target.value)}
                      className="rounded-xl"
                      min={50}
                      placeholder="Size in KB"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">KB</span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Current: {formatSize(file.size)} → Target: ≤ {formatSize(targetKB * 1024)}
                </p>
              </div>

              {/* Compress button */}
              <Button onClick={compress} disabled={processing} className="w-full gap-2 text-base font-semibold h-12 rounded-xl" size="lg">
                {processing ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> {progress || "Compressing…"}</>
                ) : (
                  <><FileDown className="h-5 w-5" /> Compress to {formatSize(targetKB * 1024)}</>
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
                  {result.size > targetKB * 1024 && (
                    <p className="text-xs text-destructive">
                      ⚠ Could not reach target size. This is the best compression achievable.
                    </p>
                  )}
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
