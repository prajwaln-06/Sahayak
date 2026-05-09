"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

// ── Types ────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  spaces?: SpaceResult[];
}

interface SpaceResult {
  id: string;
  title?: string;
  space_type?: string;
  neighbourhood?: string;
  city?: string;
  price?: number;
  rating?: number;
  capacity?: number;
  thumbnail_url?: string;
}

const EXAMPLE_PROMPTS = [
  "Book a 20-person meeting room in Indiranagar tomorrow",
  "Rooftop venue for 50 people under ₹10,000",
  "Photography studio with natural lighting this weekend",
];

const LANGS = ["EN", "HI", "KN"];

// ── Helper: parse space info from AI response ────────────────
function parseSpacesFromResponse(text: string, spaceIds: string[]): SpaceResult[] {
  const spaces: SpaceResult[] = [];
  if (!text) return spaces;
  const primaryMatches = Array.from(text.matchAll(/ID:\s*([a-f0-9-]{36})/gi)).map((m) => m[1]);
  const fallbackMatches =
    primaryMatches.length === 0
      ? Array.from(text.matchAll(/id["\s:]+([a-f0-9-]{36})/gi)).map((m) => m[1])
      : [];
  const parsedIds = primaryMatches.length > 0 ? primaryMatches : fallbackMatches;
  const mergedIds = Array.from(new Set([...spaceIds, ...parsedIds]));
  console.debug("AI concierge parsed IDs", {
    apiSpaceIds: spaceIds,
    parsedIds,
    mergedIds,
  });

  for (const id of mergedIds) {
    // Try to extract info from the text around the ID
    const idIndex = text.indexOf(id);
    if (idIndex === -1) continue;

    // Look backwards for the title (between ** markers)
    const before = text.substring(Math.max(0, idIndex - 300), idIndex);
    const titleMatch = before.match(/\*\*(.+?)\*\*/);
    const priceMatch = before.match(/Rs\.?([\d,]+)/);
    const ratingMatch = before.match(/⭐\s*([\d.]+)/);
    const capacityMatch = before.match(/Capacity:\s*(\d+)/i);

    spaces.push({
      id,
      title: titleMatch?.[1] || `Space ${id.slice(0, 8)}`,
      price: priceMatch ? parseInt(priceMatch[1].replace(",", "")) : undefined,
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
      capacity: capacityMatch ? parseInt(capacityMatch[1]) : undefined,
    });
  }
  return spaces;
}

// ── Typing Indicator ─────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-1 px-4 py-2">
      <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "0ms" }} />
      <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "150ms" }} />
      <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

// ── Space Result Card ────────────────────────────────────────
function SpaceResultCard({ space }: { space: SpaceResult }) {
  const router = useRouter();
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 flex gap-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="w-[60px] h-[60px] rounded-lg bg-gradient-to-br from-teal-50 to-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {space.thumbnail_url ? (
          <img src={space.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <svg className="w-6 h-6 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold text-gray-900 truncate">{space.title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          {space.rating && (
            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
              <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {space.rating.toFixed(1)}
            </span>
          )}
          {space.capacity && (
            <span className="text-[10px] text-gray-400">👥 {space.capacity}</span>
          )}
        </div>
        {space.price && (
          <p className="text-xs font-bold text-[#0D1B2A] mt-1">₹{space.price.toLocaleString()}/hr</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 justify-center flex-shrink-0">
        <button
          onClick={() => router.push(`/spaces/${space.id}`)}
          className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors whitespace-nowrap"
        >
          View
        </button>
        <button
          onClick={() => router.push(`/book/${space.id}`)}
          className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors whitespace-nowrap"
        >
          Book
        </button>
      </div>
    </div>
  );
}

// ── Main Chat Component ──────────────────────────────────────
export default function AIConciergeChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lang, setLang] = useState("EN");
  const [sessionId, setSessionId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session ID
  useEffect(() => {
    let sid = localStorage.getItem("flexispace_concierge_session");
    if (!sid) {
      sid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);
      localStorage.setItem("flexispace_concierge_session", sid);
    }
    setSessionId(sid);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await api.post("/concierge/chat", {
        message: text,
        session_id: sessionId,
      });

      const { response, spaces: spaceRefs } = res.data;
      const spaceIds = spaceRefs?.map((s: { id: string }) => s.id) || [];
      const parsedSpaces = parseSpacesFromResponse(response, spaceIds);

      const aiMsg: Message = {
        role: "assistant",
        content: response,
        spaces: parsedSpaces.length > 0 ? parsedSpaces : undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [sessionId, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // ── Floating Button ────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-600/30 hover:shadow-xl hover:shadow-teal-600/40 hover:scale-105 transition-all flex items-center justify-center group"
        aria-label="Open AI Concierge"
      >
        {/* Sparkle icon */}
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-teal-400 animate-ping opacity-20" />
      </button>
    );
  }

  // ── Chat Drawer ────────────────────────────────────────────
  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[420px] h-full sm:h-[600px] sm:max-h-[85vh] flex flex-col bg-white sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0D1B2A] via-[#1B2D45] to-teal-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">FlexiSpace AI</h3>
            <p className="text-teal-300/70 text-[10px]">Find your perfect space</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">How can I help you?</h4>
            <p className="text-xs text-gray-400 mb-6 max-w-[240px] mx-auto">
              I can find spaces, check availability, and get price estimates for you.
            </p>

            {/* Example prompts */}
            <div className="space-y-2">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left px-4 py-2.5 rounded-xl bg-white border border-gray-100 text-xs text-gray-600 hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-700 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] space-y-2">
              <div
                className={`px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user"
                  ? "bg-[#0D1B2A] text-white rounded-2xl rounded-br-sm"
                  : "bg-white text-gray-700 rounded-2xl rounded-bl-sm border border-gray-100 shadow-sm"
                  }`}
              >
                {/* Render markdown-like bold text */}
                {msg.content.split("\n").map((line, j) => (
                  <p key={j} className={j > 0 ? "mt-1" : ""}>
                    {line.split(/(\*\*.+?\*\*)/).map((part, k) =>
                      part.startsWith("**") && part.endsWith("**") ? (
                        <strong key={k} className="font-semibold">{part.slice(2, -2)}</strong>
                      ) : (
                        <span key={k}>{part}</span>
                      )
                    )}
                  </p>
                ))}
              </div>

              {/* Space cards */}
              {msg.spaces && msg.spaces.length > 0 && (
                <div className="space-y-2 pl-1">
                  {msg.spaces.map((space) => (
                    <SpaceResultCard key={space.id} space={space} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm border border-gray-100 shadow-sm">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-100 bg-white px-4 py-3 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            type="button"
            onClick={() => {
              const idx = LANGS.indexOf(lang);
              setLang(LANGS[(idx + 1) % LANGS.length]);
            }}
            className="px-2 py-1.5 rounded-lg bg-gray-100 text-[10px] font-bold text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
            title="Toggle language"
          >
            🌐 {lang}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={lang === "HI" ? "अपना संदेश लिखें..." : lang === "KN" ? "ನಿಮ್ಮ ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ..." : "Type your message..."}
            disabled={isTyping}
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 transition-colors disabled:opacity-50 disabled:bg-gray-50"
          />

          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-40 transition-all active:scale-95 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
