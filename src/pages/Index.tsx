import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Merge, Loader2, FileStack } from "lucide-react";
import DropZone from "@/components/DropZone";
import FileItem from "@/components/FileItem";
import { Button } from "@/components/ui/button";
import { mergePDFs, downloadBlob } from "@/lib/pdf-utils";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [merging, setMerging] = useState(false);
  const { toast } = useToast();

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveFile = useCallback((from: number, to: number) => {
    setFiles((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const handleMerge = async () => {
    if (files.length < 2) return;
    setMerging(true);
    try {
      const merged = await mergePDFs(files);
      downloadBlob(merged, "merged.pdf");
      toast({ title: "Done!", description: "Your merged PDF has been downloaded." });
    } catch {
      toast({
        title: "Merge failed",
        description: "One or more files may be corrupted or password-protected.",
        variant: "destructive",
      });
    } finally {
      setMerging(false);
    }
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
            <FileStack className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            PDF Merger
          </h1>
          <p className="mt-2 text-muted-foreground">
            Combine multiple PDFs into one — fast, free, and private.
          </p>
        </div>

        {/* Drop zone */}
        <DropZone onFilesAdded={addFiles} />

        {/* File list */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 space-y-2 overflow-hidden"
            >
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {files.length} file{files.length !== 1 && "s"} selected
                </p>
                <button
                  onClick={() => setFiles([])}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all
                </button>
              </div>

              <AnimatePresence mode="popLayout">
                {files.map((file, i) => (
                  <FileItem
                    key={file.name + file.size + i}
                    file={file}
                    index={i}
                    total={files.length}
                    onRemove={() => removeFile(i)}
                    onMoveUp={() => moveFile(i, i - 1)}
                    onMoveDown={() => moveFile(i, i + 1)}
                  />
                ))}
              </AnimatePresence>

              <motion.div layout className="pt-4">
                <Button
                  onClick={handleMerge}
                  disabled={files.length < 2 || merging}
                  className="w-full gap-2 text-base font-semibold h-12 rounded-xl"
                  size="lg"
                >
                  {merging ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Merging…
                    </>
                  ) : (
                    <>
                      <Merge className="h-5 w-5" />
                      Merge {files.length} PDF{files.length !== 1 && "s"}
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Index;
