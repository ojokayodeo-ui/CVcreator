import { useEffect, useRef, useState } from "react";
import { getChatHistory, sendChatMessage } from "../../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SendIcon, MessageSquareIcon, AlertCircleIcon } from "lucide-react";

type Message = { role: string; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getChatHistory()
      .then((r) => setMessages(r.data))
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    setError("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(message);
      setMessages((prev) => [...prev, res.data]);
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to send message. Try again.");
      setMessages((prev) => prev.slice(0, -1));
      setInput(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquareIcon size={24} className="text-brand-600" /> Career Advisor
        </h1>
        <p className="text-slate-500 mt-1">
          Chat about job fit, skill gaps, and how to approach your career and job search.
        </p>
      </div>

      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loadingHistory && <div className="text-slate-500 text-sm">Loading conversation...</div>}

          {!loadingHistory && messages.length === 0 && (
            <div className="text-slate-500 text-sm text-center py-12">
              Ask me anything, like "Am I a good fit for a senior product manager role?" or
              "What skills should I develop next?"
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="prose prose-slate prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-500 rounded-2xl px-4 py-2.5 text-sm">
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 mx-6 mb-2 rounded-lg">
            <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSend} className="border-t border-slate-200 p-4 flex gap-2">
          <input
            className="input flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about job fit, skills to develop, career strategy..."
            disabled={loading}
          />
          <button type="submit" className="btn-primary px-4 flex items-center gap-1.5" disabled={loading || !input.trim()}>
            <SendIcon size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
