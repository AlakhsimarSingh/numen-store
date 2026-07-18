import type { Category } from "@/src/lib/categories";

export interface ImageGroup {
  id: string;
  images: (File | null)[]; // padded to 3 slots: [main, hover, third]
}

/**
 * Slices a flat, ordered list of image files into groups of `perProduct`,
 * in the order the files were selected — no filename parsing needed. The
 * OS/browser file picker returns files in a consistent order (typically
 * alphabetical), which is exactly the "arranged sequentially" assumption.
 * The final group may have fewer than `perProduct` images if the total
 * doesn't divide evenly; that's fine, it just means a shorter row.
 */
export function chunkImages(files: File[], perProduct: 1 | 2 | 3): ImageGroup[] {
  const groups: ImageGroup[] = [];
  for (let i = 0; i < files.length; i += perProduct) {
    const slice = files.slice(i, i + perProduct);
    groups.push({
      id: `group-${i}`,
      images: [slice[0] ?? null, slice[1] ?? null, slice[2] ?? null],
    });
  }
  return groups;
}

/**
 * Best-effort guess at which existing category a dropped folder belongs to,
 * by comparing the folder's name against category names/slugs. Falls back
 * to null (admin picks manually) rather than guessing wrong silently.
 */
export function guessCategoryFromFolderName(folderName: string, categories: Category[]): string | null {
  const normalized = folderName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const exact = categories.find(
    (c) => c.name.toLowerCase() === normalized || c.slug.replace(/-/g, " ") === normalized
  );
  if (exact) return exact.slug;

  const partial = categories.find(
    (c) => normalized.includes(c.name.toLowerCase()) || normalized.includes(c.slug.replace(/-/g, " "))
  );
  return partial?.slug ?? null;
}

/** Extracts the top-level folder name from a webkitdirectory FileList entry's relative path. */
export function extractFolderName(relativePath: string): string {
  return relativePath.split("/")[0] ?? "";
}