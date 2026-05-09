"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ChatMsg { id: string; sender_id: string; content: string; type: string; is_read: boolean; sent_at: string; warnings?: string[]; }

interface ChatDrawerProps { bookingId: string; currentUserId: string; token: string; isOpen: boolean; onClose: () => void; }

export default function ChatDrawer({ bookingId, currentUserId, token, isOpen, onClose }: ChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Load history
  useEffect(() => {
    if (!isOpen || !bookingId) return;
    const loadHistory = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/chat/${bookingId}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) { const data = await res.json(); setMessages(data); }
      } catch { /* ignore */ }
    };
    loadHistory();
  }, [isOpen, bookingId, token]);

  // WebSocket connect
  useEffect(() => {
    if (!isOpen || !bookingId || !token) return;
    const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace("http", "ws");
    const ws = new WebSocket(`${base}/chat/ws/chat/${bookingId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "typing") { setTyping(true); setTimeout(() => setTyping(false), 2000); return; }
        setMessages(prev => [...prev, msg]);
      } catch { /* ignore */ }
    };

    return () => { ws.close(); wsRef.current = null; setConnected(false); };
  }, [isOpen, bookingId, token]);

  // Auto-scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const send = useCallback(() => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content: input, type: "TEXT" }));
    setInput("");
  }, [input]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200">
      {/* Header */}
      <div className="bg-[#0D1B2A] px-5 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-400" : "bg-red-400"} flex-shrink-0`} />
          <h3 className="text-white font-semibold text-sm">Message Host</h3>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p className="text-xs text-gray-400">Start a conversation about your booking</p>
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <div className={`px-3.5 py-2 text-sm leading-relaxed ${isMe ? "bg-[#0D1B2A] text-white rounded-2xl rounded-br-sm" : "bg-white text-gray-700 rounded-2xl rounded-bl-sm border border-gray-100 shadow-sm"}`}>
                  {m.content}
                </div>
                <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : ""}`}>
                  <span className="text-[10px] text-gray-400">{new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {isMe && m.is_read && <span className="text-[10px] text-teal-500">✓✓</span>}
                </div>
                {m.warnings && m.warnings.length > 0 && (
                  <div className="mt-1">{m.warnings.map((w, i) => <p key={i} className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{w}</p>)}</div>
                )}
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex justify-start"><div className="bg-white rounded-2xl rounded-bl-sm border border-gray-100 px-4 py-2 shadow-sm flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div></div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white px-4 py-3 flex-shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." disabled={!connected}
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 disabled:opacity-50 disabled:bg-gray-50" />
          <button type="submit" disabled={!input.trim() || !connected}
            className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-40 active:scale-95 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
          </button>
        </form>
        {!connected && <p className="text-[10px] text-red-400 mt-1 text-center">Reconnecting...</p>}
      </div>
    </div>
  );
}
