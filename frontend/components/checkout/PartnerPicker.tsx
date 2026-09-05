"use client";

import { useEffect, useState } from "react";
import { Loader2, Store, X } from "lucide-react";
import { fetchPartners, PartnerListing } from "@/src/lib/promoCodes";
import { useCheckoutStore } from "@/src/hooks/useCheckoutStore";
import { useToastStore } from "@/src/hooks/useToastStore";

export default function PartnerPicker({ onClose }: { onClose: () => void }) {
  const [partners, setPartners] = useState<PartnerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const applyPromo = useCheckoutStore((s) => s.applyPromo);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    let cancelled = false;
    fetchPartners()
      .then((data) => {
        if (!cancelled) setPartners(data);
      })
      .catch(() => {
        if (!cancelled) showToast("Couldn't load partners right now.", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSelect(partner: PartnerListing) {
    setApplyingCode(partner.code);
    const ok = await applyPromo(partner.code);
    setApplyingCode(null);
    if (ok) {
      showToast(`Connected with ${partner.businessName}`);
      onClose();
    } else {
      showToast("That partner code isn't available right now — try another.", "error");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-surface p-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">Connect with a seller</h3>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <p className="mt-1.5 font-body text-xs text-muted">
          Shopping through a local store or rep? Pick them here so they get credit for your order.
        </p>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="animate-spin text-muted" size={22} />
          </div>
        ) : partners.length === 0 ? (
          <p className="py-10 text-center font-body text-sm text-muted">No partners listed right now.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {partners.map((p) => (
              <button
                key={p.code}
                onClick={() => handleSelect(p)}
                disabled={applyingCode !== null}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-bg p-3.5 text-left transition-colors hover:border-accent/40 disabled:opacity-60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-accent">
                  <Store size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm text-ink">{p.businessName}</p>
                  {p.description && <p className="truncate font-body text-xs text-muted">{p.description}</p>}
                </div>
                {p.percent > 0 && <span className="shrink-0 font-mono text-xs text-accent">{p.percent}% off</span>}
                {applyingCode === p.code && <Loader2 size={14} className="shrink-0 animate-spin text-muted" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}