"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mt-20 min-h-screen bg-bg">
      <AdminSidebar />
      <div className="lg:pl-64">
        <main className="px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}