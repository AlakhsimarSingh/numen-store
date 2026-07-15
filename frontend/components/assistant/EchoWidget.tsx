"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, MessageCircleMore, Sparkles, X } from "lucide-react";
import { useAssistantStore } from "@/src/hooks/useAssistantStore";
import { useAuthStore } from "@/src/hooks/useAuthStore";
import { streamAssistantReply } from "@/src/lib/assistant";
import { getInitialSuggestions } from "@/src/lib/assistantEngine";
import { cn } from "@/src/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;
const GREETING_DELAY = 1400;

export default function EchoWidget() {
  const user = useAuthStore((s) => s.user);

  const messages = useAssistantStore((s) => s.messages);
  const hasGreeted = useAssistantStore((s) => s.hasGreeted);
  const isOpen = useAssistantStore((s) => s.isOpen);
  const addMessage = useAssistantStore((s) => s.addMessage);
  const startStreamingMessage = useAssistantStore((s) => s.startStreamingMessage);
  const appendToMessage = useAssistantStore((s) => s.appendToMessage);
  const finishStreamingMessage = useAssistantStore((s) => s.finishStreamingMessage);
  const setGreeted = useAssistantStore((s) => s.setGreeted);
  const setOpen = useAssistantStore((s) => s.setOpen);

  const [showBubble, setShowBubble] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasGreeted) return;
    const timer = setTimeout(() => {
      const greeting = user?.name
        ? `Hey ${user.name.split(" ")[0]}, I'm ECHO — NUMEN's drop concierge. Need help finding something, or want to hear about today's deals?`
        : "Hey, I'm ECHO — NUMEN's drop concierge. Ask me about sizing, orders, shipping, or what's new.";
      addMessage("assistant", greeting);
      setGreeted();
      setShowBubble(true);
    }, GREETING_DELAY);
    return () => clearTimeout(timer);
  }, [hasGreeted, user, addMessage, setGreeted]);

  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isOpen, typing]);

  async function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value) return;

    const history = [...messages, { role: "user" as const, text: value }].map((m) => ({
      role: m.role,
      text: m.text,
    }));

    addMessage("user", value);
    setInput("");
    setTyping(true);

    let streamId: string | null = null;
    try {
      await streamAssistantReply(history, (chunk) => {
        if (!streamId) {
          streamId = startStreamingMessage();
          setTyping(false);
        }
        appendToMessage(streamId, chunk);
      });
      if (streamId) finishStreamingMessage(streamId);
    } catch {
      setTyping(false);
      if (streamId) {
        finishStreamingMessage(streamId);
      } else {
        addMessage(
          "assistant",
          "Sorry, I'm having trouble connecting right now — try again in a moment, or reach the team via Contact Us."
        );
      }
    }
  }

  const pathname = usePathname();
  const suggestions = getInitialSuggestions();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      {/* Proactive greeting bubble */}
      <AnimatePresence>
        {showBubble && !isOpen && (
          <motion.button
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.35, ease }}
            onClick={() => {
              setOpen(true);
              setShowBubble(false);
            }}
            className="max-w-[240px] rounded-2xl rounded-br-md border border-white/10 bg-surface p-4 text-left shadow-2xl"
          >
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-accent">
              <Sparkles size={11} /> ECHO
            </div>
            <p className="mt-1.5 font-body text-xs leading-relaxed text-ink">
              {messages[messages.length - 1]?.text}
            </p>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.3, ease }}
            className="flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 bg-bg/60 px-5 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Sparkles size={15} />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-ink">ECHO</p>
                  <p className="font-mono text-[10px] text-muted">Drop concierge · online</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 font-body text-sm leading-relaxed",
                      m.role === "user" ? "rounded-br-sm bg-accent text-bg" : "rounded-bl-sm bg-surface2 text-ink"
                    )}
                  >
                    {m.text}
                    {m.streaming && (
                      <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-middle" />
                    )}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-surface2 px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-muted"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {messages.length <= 1 && !typing && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="rounded-full border border-white/10 px-3 py-1.5 font-body text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 border-t border-white/5 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask ECHO anything…"
                className="w-full rounded-full border border-white/10 bg-bg px-4 py-2.5 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent/50"
              />
              <button
                type="submit"
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-bg transition-transform hover:scale-105"
              >
                <ArrowUp size={16} />
              </button>
            </form>

            <div className="border-t border-white/5 px-4 py-2 text-center">
              <Link href="/contact" className="font-mono text-[10px] text-muted hover:text-accent">
                Prefer a human? Contact the team →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4, ease }}
          onClick={() => {
            setOpen(true);
            setShowBubble(false);
          }}
          aria-label="Open ECHO chat"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-bg shadow-2xl transition-transform hover:scale-105"
        >
          <MessageCircleMore size={24} />
        </motion.button>
      )}
    </div>
  );
}