export interface SizeProfile {
  top: string;
  bottom: string;
  shoe: string;
}

export interface NotificationPrefs {
  emailDeals: boolean;
  smsDeals: boolean;
  orderUpdates: boolean;
  newDrops: boolean;
}

export interface Profile {
  phone: string;
  gender: string;
  dob: string;
  sizes: SizeProfile;
  favoriteCategories: string[];
  styleTags: string[];
  notifications: NotificationPrefs;
}

export async function fetchProfile(): Promise<Profile> {
  const res = await fetch("/api/profile", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load profile.");
  return res.json();
}

export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to save profile.");
  return res.json();
}