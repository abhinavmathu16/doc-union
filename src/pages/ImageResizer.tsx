import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Download, Upload, X, Loader2, Maximize, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IMAGE_PRESETS, SIZE_PRESETS, resizeImage, compressImageToSize, downloadBlob } from "@/lib/image-utils";
import { useToast } from "@/hooks/use-toast";

const ImageResizer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resizedPreview, setResizedPreview] = useState<string | null>(null);
  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null);
  const [selectedPreset, setSelectedPreset] = useState("0");
  const [customWidth, setCustomWidth] = useState(630);
  const [customHeight, setCustomHeight] = useState(810);
  const [processing, setProcessing] = useState(false);
  const [mode, setMode] = useState<"dimensions" | "filesize">("dimensions");
  const [selectedSizePreset, setSelectedSizePreset] = useState("1"); // 100KB default
  const [customSizeKB, setCustomSizeKB] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const preset = IMAGE_PRESETS[parseInt(selectedPreset)];
  const isCustom = preset.label === "Custom";
  const targetW = isCustom ? customWidth : preset.width;
  const targetH = isCustom ? customHeight : preset.height;

  const sizePreset = SIZE_PRESETS[parseInt(selectedSizePreset)];
  const isCustomSize = sizePreset.label === "Custom";
  const targetBytes = isCustomSize ? customSizeKB * 1024 : sizePreset.bytes;

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    setFile(f);
    setResizedPreview(null);
    setResizedBlob(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResizedPreview(null);
    setResizedBlob(null);
  };

  const handleResize = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      let blob: Blob;
      if (mode === "dimensions") {
        if (targetW < 1 || targetH < 1) return;
        blob = await resizeImage(file, targetW, targetH);
        toast({ title: "Resized!", description: `Image resized to ${targetW}×${targetH} pixels.` });
      } else {
        blob = await compressImageToSize(file, targetBytes);
        const sizeKB = (blob.size / 1024).toFixed(0);
        toast({ title: "Compressed!", description: `Image compressed to ${sizeKB} KB.` });
      }
      setResizedBlob(blob);
      setResizedPreview(URL.createObjectURL(blob));
    } catch {
      toast({ title: "Processing failed", description: "Could not process this image.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resizedBlob || !file) return;
    const name = mode === "dimensions"
      ? file.name.replace(/\.[^.]+$/, "") + `_${targetW}x${targetH}.jpg`
      : file.name.replace(/\.[^.]+$/, "") + `_compressed.jpg`;
    downloadBlob(resizedBlob, name);
  };

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <ImageIcon className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Image Resizer
          </h1>
          <p className="mt-2 text-muted-foreground">
            Resize or compress photos for visa, passport & ID applications.
          </p>
        </div>

        {/* Mode tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as "dimensions" | "filesize")} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="dimensions" className="gap-2 rounded-xl">
              <Maximize className="h-4 w-4" />
              By Dimensions
            </TabsTrigger>
            <TabsTrigger value="filesize" className="gap-2 rounded-xl">
              <HardDrive className="h-4 w-4" />
              By File Size
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Upload area */}
        {!file ? (
          <motion.div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="relative cursor-pointer rounded-2xl border-2 border-dashed border-border bg-drop-zone p-12 text-center transition-colors hover:border-drop-zone-border"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-heading text-lg font-semibold text-foreground">
                  Drag & drop an image here
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or click to browse files
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-5"
            >
              {/* Original preview */}
              <div className="relative overflow-hidden rounded-xl border border-border bg-card">
                <button
                  onClick={clearFile}
                  className="absolute right-2 top-2 z-10 rounded-lg bg-background/80 p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center justify-center p-4 bg-muted/30">
                  <img
                    src={preview!}
                    alt="Original"
                    className="max-h-48 rounded-lg object-contain"
                  />
                </div>
                <div className="px-4 py-3 border-t border-border">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">Original image</p>
                </div>
              </div>

              {/* Preset selector */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Target Size</label>
                <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_PRESETS.map((p, i) => (
                      <SelectItem key={i} value={String(i)}>
                        <span className="font-medium">{p.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{p.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isCustom && (
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-muted-foreground">Width (px)</label>
                      <Input
                        type="number"
                        min={1}
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number(e.target.value))}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-muted-foreground">Height (px)</label>
                      <Input
                        type="number"
                        min={1}
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Number(e.target.value))}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Resize button */}
              <Button
                onClick={handleResize}
                disabled={processing}
                className="w-full gap-2 text-base font-semibold h-12 rounded-xl"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Resizing…
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5" />
                    Resize to {targetW}×{targetH}
                  </>
                )}
              </Button>

              {/* Resized preview */}
              {resizedPreview && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <div className="flex items-center justify-center p-4 bg-success/5">
                    <img
                      src={resizedPreview}
                      alt="Resized"
                      className="max-h-48 rounded-lg object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">{targetW}×{targetH} px</p>
                      <p className="text-xs text-muted-foreground">Resized image ready</p>
                    </div>
                    <Button onClick={handleDownload} size="sm" className="gap-2 rounded-xl">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
};

export default ImageResizer;
