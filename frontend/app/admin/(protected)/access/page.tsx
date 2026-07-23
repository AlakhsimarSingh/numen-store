"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, Plus, ShieldCheck, Trash2, UserX, X } from "lucide-react";
import { fetchAdmins, addAdmin, revokeAdmin, AdminEntry } from "@/src/lib/adminUsers";
import { useAuthStore } from "@/src/hooks/useAuthStore";
import { useToastStore } from "@/src/hooks/useToastStore";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

export default function AdminAccessPage() {
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  function load() {
    setLoading(true);
    fetchAdmins()
      .then(setAdmins)
      .catch(() => showToast("Failed to load admins.", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [showToast]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      const created = await addAdmin(email.trim(), note.trim() || undefined);
      setAdmins((prev) => [created, ...prev]);
      showToast("Admin access granted");
      setModalOpen(false);
      setEmail("");
      setNote("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add admin.", "error");
    }
    setSaving(false);
  }

  async function handleRevoke(entry: AdminEntry) {
    if (!confirm(`Revoke admin access for ${entry.email}? They'll be logged out immediately.`)) return;
    try {
      await revokeAdmin(entry.email);
      setAdmins((prev) => prev.filter((a) => a.email !== entry.email));
      showToast("Admin access revoked", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to revoke admin.", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={28} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Admin Access</h1>
          <p className="mt-1 font-body text-sm text-muted">
            {admins.length} admin{admins.length !== 1 ? "s" : ""} with panel access
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.02]"
        >
          <Plus size={16} /> Grant Access
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {admins.map((a) => {
          const isSelf = a.email === currentUser?.email;
          return (
            <div key={a.email} className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-surface p-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", a.roleMismatch ? "bg-accent2/15 text-accent2" : "bg-accent/10 text-accent")}>
                  {a.roleMismatch ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-body text-sm text-ink">
                    {a.name ?? a.email}
                    {isSelf && <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-accent">You</span>}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted">
                    {a.email} · added {new Date(a.addedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    {a.addedBy && ` by ${a.addedBy}`}
                  </p>
                  {a.note && <p className="mt-0.5 font-body text-[11px] text-muted">{a.note}</p>}
                  {a.roleMismatch && (
                    <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-accent2">
                      <AlertTriangle size={10} /> Account exists but role isn&apos;t ADMIN — this admin can&apos;t sign in
                    </p>
                  )}
                  {!a.hasAccount && (
                    <p className="mt-1 font-mono text-[10px] text-muted">No account yet — will be created on first sign-in link request</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRevoke(a)}
                disabled={isSelf}
                title={isSelf ? "You can't revoke your own access" : "Revoke access"}
                className="flex items-center gap-1.5 self-end rounded-full border border-white/10 px-3.5 py-1.5 font-body text-xs text-ink transition-colors hover:border-accent2/50 hover:text-accent2 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
              >
                <UserX size={13} /> Revoke
              </button>
            </div>
          );
        })}
        {admins.length === 0 && (
          <p className="rounded-2xl border border-white/5 bg-surface px-5 py-10 text-center font-body text-sm text-muted">
            No admins yet.
          </p>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4" onClick={() => setModalOpen(false)}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink">Grant Admin Access</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>

            <form onSubmit={handleAdd} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted">Note (optional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Operations lead"
                  className="w-full rounded-xl border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
                />
              </div>
              <p className="rounded-lg border border-white/10 bg-bg px-3 py-2.5 font-body text-[11px] text-muted">
                They&apos;ll sign in via a magic link sent to this email — no password. They can request it from the admin login page once added.
              </p>
              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Granting…" : "Grant Access"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}