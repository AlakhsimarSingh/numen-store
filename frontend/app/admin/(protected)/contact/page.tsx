"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, MessageSquare, Send, X } from "lucide-react";
import { fetchContactMessages, replyToContactMessage, updateContactStatus, ContactMessage } from "@/src/lib/contact";
import { useToastStore } from "@/src/hooks/useToastStore";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const statusMeta: Record<ContactMessage["status"], string> = {
  OPEN: "text-accent2 bg-accent2/10",
  IN_PROGRESS: "text-accent bg-accent/10",
  RESOLVED: "text-muted bg-white/5",
};

export default function AdminContactPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"ALL" | ContactMessage["status"]>("ALL");
  const showToast = useToastStore((s) => s.show);

  function load() {
    setLoading(true);
    fetchContactMessages()
      .then(setMessages)
      .catch(() => showToast("Failed to load messages.", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [showToast]);

  function openMessage(msg: ContactMessage) {
    setSelected(msg);
    setReplyText(msg.reply ?? "");
    if (msg.status === "OPEN") {
      updateContactStatus(msg.id, "IN_PROGRESS")
        .then((updated) => {
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          setSelected(updated);
        })
        .catch(() => {});
    }
  }

  async function handleSendReply() {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      const updated = await replyToContactMessage(selected.id, replyText.trim());
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSelected(updated);
      showToast("Reply sent");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to send reply.", "error");
    }
    setSending(false);
  }

  const filtered = filter === "ALL" ? messages : messages.filter((m) => m.status === filter);
  const openCount = messages.filter((m) => m.status === "OPEN").length;

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
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Contact Inbox</h1>
          <p className="mt-1 font-body text-sm text-muted">
            {messages.length} message{messages.length !== 1 ? "s" : ""}{openCount > 0 && ` · ${openCount} open`}
          </p>
        </div>
        <div className="flex gap-2">
          {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
                filter === f ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-ink"
              )}
            >
              {f === "ALL" ? "All" : f.replace("_", " ").toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-surface">
        <div className="divide-y divide-white/5">
          {filtered.map((msg) => (
            <button
              key={msg.id}
              onClick={() => openMessage(msg)}
              className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-surface2"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-muted">
                <Mail size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-body text-sm text-ink">{msg.name} <span className="text-muted">· {msg.email}</span></p>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest", statusMeta[msg.status])}>
                    {msg.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-accent">{msg.topic}</p>
                <p className="mt-1 truncate font-body text-xs text-muted">{msg.message}</p>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  {new Date(msg.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-5 py-10 text-center font-body text-sm text-muted">No messages here.</p>
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4" onClick={() => setSelected(null)}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-surface p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">{selected.name}</h3>
                <p className="font-mono text-xs text-muted">{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full bg-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-accent">
                {selected.topic}
              </span>
              <span className={cn("rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest", statusMeta[selected.status])}>
                {selected.status.replace("_", " ")}
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-white/5 bg-bg p-4">
              <p className="whitespace-pre-wrap font-body text-sm text-ink">{selected.message}</p>
              <p className="mt-2 font-mono text-[10px] text-muted">
                {new Date(selected.createdAt).toLocaleString()}
              </p>
            </div>

            {selected.reply && (
              <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
                  Replied {selected.repliedAt && new Date(selected.repliedAt).toLocaleString()}
                </p>
                <p className="mt-2 whitespace-pre-wrap font-body text-sm text-ink">{selected.reply}</p>
              </div>
            )}

            <div className="mt-4">
              <label className="mb-1.5 flex items-center gap-1.5 font-body text-xs text-muted">
                <MessageSquare size={12} /> {selected.reply ? "Send another reply" : "Write a reply"}
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                placeholder="Type your reply — this gets emailed to the customer."
                className="w-full resize-none rounded-xl border border-white/10 bg-bg px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
              />
              <button
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-body text-sm font-semibold text-bg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                {sending ? "Sending…" : "Send Reply"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}