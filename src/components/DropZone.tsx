import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileUp } from "lucide-react";

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
}

const DropZone = ({ onFilesAdded }: DropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === "application/pdf"
      );
      if (files.length) onFilesAdded(files);
    },
    [onFilesAdded]
  );

  const handleClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".pdf";
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length) onFilesAdded(files);
    };
    input.click();
  };

  return (
    <motion.div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors duration-200 ${
        isDragging
          ? "border-drop-zone-border bg-drop-zone-active"
          : "border-border bg-drop-zone hover:border-drop-zone-border"
      }`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isDragging ? "drop" : "idle"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <FileUp className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-foreground">
              {isDragging ? "Drop your PDFs here" : "Drag & drop PDFs here"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              or click to browse files
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default DropZone;
