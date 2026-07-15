export async function uploadMedia(file: File): Promise<{ url: string; path: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to upload file.");
  return data;
}

/**
 * Best-effort delete of a file that was uploaded but never got attached to a
 * saved product (e.g. the admin closed the modal without saving). Fire-and
 * -forget from the UI's perspective — a failure here shouldn't block or
 * alarm the admin, it just means the file lingers until a manual cleanup.
 */
export async function deleteMedia(path: string): Promise<void> {
  try {
    await fetch("/api/upload", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  } catch (err) {
    console.error("Failed to clean up unused upload:", path, err);
  }
}