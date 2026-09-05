export interface Category {
  slug: string;
  name: string;
  iconName: string;
  productCount: number;
  // Representative image for this category — a product shot chosen
  // server-side (see backend/app/api/categories/route.ts), not admin-set.
  // Absent for a category with zero products; the mega menu falls back
  // to an icon tile in that case.
  previewImage?: string;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to load categories.");
  return res.json();
}

export async function createCategory(name: string, iconName: string): Promise<Category> {
  const res = await fetch("/api/categories", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, iconName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create category.");
  return data;
}

export async function updateCategory(
  slug: string,
  updates: { name?: string; iconName?: string }
): Promise<Category> {
  const res = await fetch(`/api/categories/${slug}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to update category.");
  return data;
}

export async function deleteCategory(slug: string): Promise<void> {
  const res = await fetch(`/api/categories/${slug}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to delete category.");
  }
}