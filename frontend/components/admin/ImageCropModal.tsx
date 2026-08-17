"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, X, ZoomIn } from "lucide-react";
import { getCroppedImageFile, getPaddedImageFile } from "@/src/lib/cropImage";
import { useToastStore } from "@/src/hooks/useToastStore";
import { cn } from "@/src/lib/utils";

interface Props {
  imageSrc: string;
  fileName: string;
  mimeType?: string;
  aspect?: number; // width / height — 3/4 is the site-wide canonical ratio
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

type Mode = "crop" | "fit";

export default function ImageCropModal({
  imageSrc,
  fileName,
  mimeType = "image/jpeg",
  aspect = 3 / 4,
  onCancel,
  onConfirm,
}: Props) {
  const [mode, setMode] = useState<Mode>("crop");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleConfirm() {
    setProcessing(true);
    try {
      const file =
        mode === "fit"
          ? await getPaddedImageFile(imageSrc, fileName, mimeType, aspect)
          : croppedAreaPixels
            ? await getCroppedImageFile(imageSrc, croppedAreaPixels, fileName, mimeType)
            : null;
      if (!file) return;
      onConfirm(file);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Couldn't process this image — try re-uploading it instead.",
        "error"
      );
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-bg/90 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-body text-sm font-semibold text-ink">Frame the product</h4>
          <button onClick={onCancel} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 flex gap-1.5 rounded-full border border-white/10 bg-bg p-1">
          <button
            type="button"
            onClick={() => setMode("crop")}
            className={cn(
              "flex-1 rounded-full py-1.5 font-body text-xs transition-colors",
              mode === "crop" ? "bg-accent text-bg" : "text-muted hover:text-ink"
            )}
          >
            Crop to Fill
          </button>
          <button
            type="button"
            onClick={() => setMode("fit")}
            className={cn(
              "flex-1 rounded-full py-1.5 font-body text-xs transition-colors",
              mode === "fit" ? "bg-accent text-bg" : "text-muted hover:text-ink"
            )}
          >
            Fit Whole Photo
          </button>
        </div>

        {mode === "crop" ? (
          <>
            <div className="relative mt-3 h-80 w-full overflow-hidden rounded-xl bg-bg">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <ZoomIn size={14} className="text-muted" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>
            <p className="mt-1.5 font-body text-[11px] text-muted">
              Drag to reposition, use the slider to zoom. If the product is already touching the edge of the
              original photo, cropping can&apos;t fix that — switch to &ldquo;Fit Whole Photo&rdquo; instead.
            </p>
          </>
        ) : (
          <>
            <div
              className="relative mt-3 w-full overflow-hidden rounded-xl bg-bg"
              style={{ aspectRatio: aspect }}
            >
              <div
                aria-hidden
                className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl brightness-75"
                style={{ backgroundImage: `url(${imageSrc})` }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- preview only, matches the canvas render exactly */}
              <img src={imageSrc} alt="" className="relative h-full w-full object-contain" />
            </div>
            <p className="mt-2 font-body text-[11px] text-muted">
              Shows the entire photo with no cropping — the whole product will always be visible, with a soft
              blurred fill on the sides where the shot doesn&apos;t match the frame.
            </p>
          </>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-white/10 py-2.5 font-body text-sm text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing || (mode === "crop" && !croppedAreaPixels)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent py-2.5 font-body text-sm font-semibold text-bg disabled:opacity-60"
          >
            {processing && <Loader2 size={14} className="animate-spin" />}
            {processing ? "Saving…" : "Use Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}