"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Mic, X, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";
import type { Role } from "@/lib/constants";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function suggestionsFor(role: Role, dict: Dictionary): string[] {
  return dict.ai.suggestions[role] ?? [];
}

export function AiAssistant({
  role,
  dict,
  locale,
}: {
  role: Role;
  dict: Dictionary;
  locale: "ko" | "en";
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    const next = [...messages, { role: "user" as const, content: msg }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: messages.slice(-6) }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        {
          role: "assistant",
          content: res.ok ? data.answer : data.error || dict.common.error,
        },
      ]);
    } catch {
      setMessages([...next, { role: "assistant", content: dict.common.error }]);
    } finally {
      setBusy(false);
    }
  }

  function toggleVoice() {
    type SR = {
      lang: string;
      interimResults: boolean;
      onresult: (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };
    const w = window as unknown as {
      SpeechRecognition?: new () => SR;
      webkitSpeechRecognition?: new () => SR;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      alert(dict.ai.noVoice);
      return;
    }
    if (listening && recognitionRef.current) {
      (recognitionRef.current as SR).stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = locale === "ko" ? "ko-KR" : "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      void send(transcript);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={dict.ai.title}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0f1e4a] text-[#F7C905] shadow-lg transition-transform hover:scale-105 print:hidden",
          open && "scale-0"
        )}
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-5 right-5 z-50 flex w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl transition-all sm:w-96 print:hidden",
          open
            ? "pointer-events-auto h-[32rem] max-h-[80vh] opacity-100"
            : "pointer-events-none h-0 opacity-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0f1e4a] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7C905] text-[#0f1e4a]">
              <Plane className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{dict.ai.title}</p>
              <p className="text-[11px] text-white/50">{dict.ai.subtitle}</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} aria-label={dict.common.cancel}>
            <X className="h-5 w-5 text-white/70 hover:text-white" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{dict.ai.greeting}</p>
              <div className="flex flex-wrap gap-2">
                {suggestionsFor(role, dict).map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-[#0f1e4a]/20 bg-muted px-3 py-1.5 text-xs font-medium text-[#0f1e4a] transition-colors hover:bg-[#F7C905]/30"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                m.role === "user"
                  ? "ml-auto bg-[#0f1e4a] text-white"
                  : "bg-muted text-foreground"
              )}
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="flex w-16 items-center gap-1 rounded-2xl bg-muted px-3.5 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 border-t p-3">
          <button
            onClick={toggleVoice}
            aria-label={dict.ai.voice}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
              listening
                ? "border-rose-300 bg-rose-100 text-rose-600"
                : "hover:bg-muted"
            )}
          >
            <Mic className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder={dict.ai.placeholder}
            className="h-9 flex-1 rounded-full border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-[#0f1e4a]/20"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            disabled={busy || !input.trim()}
            onClick={() => send(input)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
