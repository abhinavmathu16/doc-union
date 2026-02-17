import { motion } from "framer-motion";
import { GripVertical, X, FileText } from "lucide-react";

interface FileItemProps {
  file: File;
  index: number;
  total: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const FileItem = ({ file, index, total, onRemove, onMoveUp, onMoveDown }: FileItemProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25 }}
      className="group flex items-center gap-3 rounded-xl bg-file-item p-3 shadow-sm border border-border hover:bg-file-item-hover transition-colors"
    >
      <div className="flex flex-col gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-opacity"
          aria-label="Move up"
        >
          <GripVertical className="h-3.5 w-3.5 rotate-90 scale-y-[-1]" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-opacity"
          aria-label="Move down"
        >
          <GripVertical className="h-3.5 w-3.5 rotate-90" />
        </button>
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <FileText className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
      </div>

      <span className="text-xs font-medium text-muted-foreground tabular-nums">
        #{index + 1}
      </span>

      <button
        onClick={onRemove}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        aria-label="Remove file"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

export default FileItem;
