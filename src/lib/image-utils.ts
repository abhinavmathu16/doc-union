export interface ImagePreset {
  label: string;
  width: number;
  height: number;
  description: string;
}

export const IMAGE_PRESETS: ImagePreset[] = [
  { label: "Visa / Passport (630×810)", width: 630, height: 810, description: "Common for visa & passport applications" },
  { label: "US Passport (600×600)", width: 600, height: 600, description: "2×2 inches at 300 DPI" },
  { label: "Schengen Visa (413×531)", width: 413, height: 531, description: "35×45mm at 300 DPI" },
  { label: "Indian Passport (413×531)", width: 413, height: 531, description: "3.5×4.5cm at 300 DPI" },
  { label: "UK Passport (350×450)", width: 350, height: 450, description: "35×45mm standard" },
  { label: "Custom", width: 0, height: 0, description: "Enter your own dimensions" },
];

export function resizeImage(
  file: File,
  targetWidth: number,
  targetHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      // Draw with cover-fit (crop to fill)
      const srcRatio = img.width / img.height;
      const dstRatio = targetWidth / targetHeight;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (srcRatio > dstRatio) {
        sw = img.height * dstRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / dstRatio;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create blob"))),
        "image/jpeg",
        0.95
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

export const SIZE_PRESETS = [
  { label: "50 KB", bytes: 50 * 1024 },
  { label: "100 KB", bytes: 100 * 1024 },
  { label: "200 KB", bytes: 200 * 1024 },
  { label: "250 KB", bytes: 250 * 1024 },
  { label: "500 KB", bytes: 500 * 1024 },
  { label: "1 MB", bytes: 1024 * 1024 },
  { label: "Custom", bytes: 0 },
];

export function compressImageToSize(
  file: File,
  targetBytes: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0);

      // Binary search for the right quality
      let lo = 0.05, hi = 0.95, bestBlob: Blob | null = null;
      for (let i = 0; i < 15; i++) {
        const mid = (lo + hi) / 2;
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob((b) => res(b), "image/jpeg", mid)
        );
        if (!blob) continue;
        if (blob.size <= targetBytes) {
          bestBlob = blob;
          lo = mid;
        } else {
          hi = mid;
        }
      }

      // If still too large, scale down dimensions
      if (!bestBlob || bestBlob.size > targetBytes) {
        let scale = 0.9;
        while (scale > 0.1) {
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          const blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob((b) => res(b), "image/jpeg", 0.5)
          );
          if (blob && blob.size <= targetBytes) {
            bestBlob = blob;
            break;
          }
          scale -= 0.1;
        }
      }

      bestBlob ? resolve(bestBlob) : reject(new Error("Cannot compress to target size"));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
