"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import ProfileHeader from "@/components/profile/ProfileHeader";
import AccountNav, { AccountTab } from "@/components/profile/AccountNav";
import PersonalInfoSection from "@/components/profile/sections/PersonalInfoSection";
import AddressesSection from "@/components/profile/sections/AddressesSection";
import PaymentMethodsSection from "@/components/profile/sections/PaymentMethodsSection";
import OrderHistorySection from "@/components/profile/sections/OrderHistorySection";
import WishlistSection from "@/components/profile/sections/WishlistSection";
import NotificationsSection from "@/components/profile/sections/NotificationsSection";

const sectionMap: Record<AccountTab, React.ComponentType> = {
  profile: PersonalInfoSection,
  addresses: AddressesSection,
  payment: PaymentMethodsSection,
  orders: OrderHistorySection,
  wishlist: WishlistSection,
  notifications: NotificationsSection,
};

export default function AccountPage() {
  const { ready } = useRequireAuth();
  const [tab, setTab] = useState<AccountTab>("profile");

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={28} />
      </div>
    );
  }

  const ActiveSection = sectionMap[tab];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <ProfileHeader />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <AccountNav active={tab} onChange={setTab} />
        <ActiveSection />
      </div>
    </div>
  );
}