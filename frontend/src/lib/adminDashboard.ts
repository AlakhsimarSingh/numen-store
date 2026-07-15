export interface DashboardProductRef {
  id: string;
  name: string;
  slug: string;
  image: string;
  stock: number;
}

export interface DashboardOrderRef {
  id: string;
  itemsCount: number;
  status: "processing" | "shipped" | "delivered" | "cancelled";
  total: number;
  placedAt: string;
}

export interface DashboardActivityRef {
  id: string;
  email: string;
  action: string;
  success: boolean;
  createdAt: string;
}

export interface DashboardData {
  revenue: number;
  ordersCount: number;
  ordersByStatus: { processing: number; shipped: number; delivered: number; cancelled: number };
  pendingReturnsCount: number;
  productsCount: number;
  lowStock: { count: number; products: DashboardProductRef[] };
  outOfStock: { count: number; products: DashboardProductRef[] };
  avgRating: number | null;
  reviewsCount: number;
  activePromoCount: number;
  newCustomersCount: number;
  pendingCheckoutsCount: number;
  activeFlashDealsCount: number;
  recentOrders: DashboardOrderRef[];
  recentActivity: DashboardActivityRef[];
}

export async function fetchAdminDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/admin/dashboard", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load dashboard.");
  return res.json();
}