import type { Area } from "react-easy-crop";

// Caps the long edge of the output so a crop/pad from a huge source photo
// doesn't turn into an oversized upload — this is a display image, not a
// print asset.
const MAX_DIMENSION = 1600;

/**
 * Renders the cropped region of `imageSrc` onto a canvas and returns it as
 * a File. Only shows what's inside `crop` — if the product touches the
 * edge of the ORIGINAL photo, this can still cut it off, because a crop
 * can only select from pixels that already exist. Use
 * getPaddedImageFile() instead when the source photo itself doesn't have
 * enough margin to crop from.
 */
export async function getCroppedImageFile(
  imageSrc: string,
  crop: Area,
  fileName: string,
  mimeType: string = "image/jpeg"
): Promise<File> {
  const image = await loadImage(imageSrc);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(crop.width, crop.height));
  const outWidth = Math.round(crop.width * scale);
  const outHeight = Math.round(crop.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outWidth, outHeight);

  return canvasToFile(canvas, fileName, mimeType);
}

/**
 * Renders the FULL, uncropped `imageSrc` onto a canvas sized to `aspect`,
 * scaling it down to fit entirely inside (never cutting anything) and
 * filling the leftover space with a blurred, darkened extension of the
 * same image so the padding doesn't read as empty bars. Use this whenever
 * the source photo's framing leaves no room to crop without losing part
 * of the product.
 */
export async function getPaddedImageFile(
  imageSrc: string,
  fileName: string,
  mimeType: string = "image/jpeg",
  aspect: number = 3 / 4
): Promise<File> {
  const image = await loadImage(imageSrc);
  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;

  const canvasW = aspect >= 1 ? MAX_DIMENSION : Math.round(MAX_DIMENSION * aspect);
  const canvasH = aspect >= 1 ? Math.round(MAX_DIMENSION / aspect) : MAX_DIMENSION;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");

  // Backdrop: the image cover-scaled to fill the whole canvas, blurred and
  // dimmed — fills the letterbox space without looking like dead space.
  ctx.save();
  ctx.filter = "blur(28px) brightness(0.72)";
  const coverScale = Math.max(canvasW / srcW, canvasH / srcH);
  const coverW = srcW * coverScale;
  const coverH = srcH * coverScale;
  ctx.drawImage(image, (canvasW - coverW) / 2, (canvasH - coverH) / 2, coverW, coverH);
  ctx.restore();

  // Foreground: the ENTIRE source image, scaled down to fit inside the
  // canvas untouched — this is what guarantees nothing gets cut off.
  const containScale = Math.min(canvasW / srcW, canvasH / srcH);
  const containW = srcW * containScale;
  const containH = srcH * containScale;
  ctx.drawImage(image, (canvasW - containW) / 2, (canvasH - containH) / 2, containW, containH);

  return canvasToFile(canvas, fileName, mimeType);
}

function canvasToFile(canvas: HTMLCanvasElement, fileName: string, mimeType: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(new File([b], fileName, { type: mimeType })) : reject(new Error("Failed to encode image."))),
      mimeType,
      0.92
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Could not load this image — it may be blocked by CORS."));
    img.src = src;
  });
}