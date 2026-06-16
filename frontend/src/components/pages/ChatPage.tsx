import { useEffect, useRef, useState, useCallback } from "react";
import {
  getConversations, createConversation, deleteConversation,
  getChatHistory, sendChatMessage,
} from "../../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  SendIcon, MessageSquareIcon, AlertCircleIcon, PlusIcon,
  TrashIcon, ImageIcon, XIcon,
} from "lucide-react";

type Message = { role: string; content: string; image_data?: string };
type Conversation = { id: string; title: string; created_at: string; updated_at: string };

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<{ base64: string; mediaType: string; preview: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getConversations().then((r) => {
      setConversations(r.data);
      if (r.data.length > 0) selectConversation(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function selectConversation(id: string) {
    setActiveId(id);
    setMessages([]);
    setError("");
    setLoadingHistory(true);
    try {
      const r = await getChatHistory(id);
      setMessages(r.data);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleNewChat() {
    const r = await createConversation();
    const conv = r.data;
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
    setError("");
  }

  async function handleDeleteConv(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        selectConversation(remaining[0].id);
      } else {
        setActiveId(null);
        setMessages([]);
      }
    }
  }

  const handleImagePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, WebP or GIF images are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setImage({ base64, mediaType: file.type, preview: dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if ((!message && !image) || loading || !activeId) return;

    setError("");
    const optimisticMsg: Message = {
      role: "user",
      content: message,
      image_data: image?.preview,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");
    const sentImage = image;
    setImage(null);
    setLoading(true);

    try {
      const res = await sendChatMessage(
        activeId,
        message,
        sentImage?.base64,
        sentImage?.mediaType,
      );
      setMessages((prev) => [...prev, res.data]);

      // Update conversation title from first message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, title: c.title === "New conversation" ? (message.slice(0, 55) || "Image shared") : c.title }
            : c
        )
      );
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to send message. Try again.");
      setMessages((prev) => prev.slice(0, -1));
      setInput(message);
      setImage(sentImage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-0 -mx-4 -my-8">
      {/* Sidebar */}
      <div className="w-60 shrink-0 flex flex-col bg-slate-900 dark:bg-slate-950 rounded-l-xl overflow-hidden">
        <div className="p-3 border-b border-slate-700">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
          >
            <PlusIcon size={16} /> New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {conversations.length === 0 && (
            <p className="text-slate-500 text-xs text-center py-6 px-2">No conversations yet. Start one above.</p>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className={`w-full text-left flex items-start justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
                activeId === conv.id
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-start gap-2 min-w-0">
                <MessageSquareIcon size={13} className="mt-0.5 shrink-0 opacity-60" />
                <span className="truncate leading-snug">{conv.title}</span>
              </div>
              <TrashIcon
                size={13}
                className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-red-400 transition-opacity"
                onClick={(e) => handleDeleteConv(e, conv.id)}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-r-xl border border-l-0 border-slate-200 dark:border-slate-700 overflow-hidden">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquareIcon size={40} className="text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">No conversation selected</p>
            <p className="text-slate-400 text-sm mt-1 mb-5">Start a new one to ask about your career.</p>
            <button onClick={handleNewChat} className="btn-primary flex items-center gap-2">
              <PlusIcon size={15} /> New conversation
            </button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingHistory && (
                <div className="text-slate-400 text-sm text-center py-8">Loading...</div>
              )}

              {!loadingHistory && messages.length === 0 && (
                <div className="text-slate-400 text-sm text-center py-12">
                  Ask me anything — "Am I a good fit for this role?" or share a job screenshot.
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {m.image_data && (
                      <img
                        src={m.image_data.startsWith("data:") ? m.image_data : `data:image/jpeg;base64,${m.image_data}`}
                        alt="Attached"
                        className="rounded-xl mb-2 max-h-64 object-contain"
                      />
                    )}
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Image preview */}
            {image && (
              <div className="px-4 pb-2 flex items-center gap-2">
                <div className="relative">
                  <img src={image.preview} alt="Preview" className="h-16 w-16 rounded-xl object-cover border border-slate-200" />
                  <button
                    onClick={() => setImage(null)}
                    className="absolute -top-1.5 -right-1.5 bg-slate-700 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"
                  >
                    <XIcon size={10} />
                  </button>
                </div>
                <p className="text-xs text-slate-400">Image ready to send</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 mx-4 mb-2 rounded-lg">
                <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Input bar */}
            <form onSubmit={handleSend} className="border-t border-slate-200 dark:border-slate-700 p-3 flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImagePick}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={`p-2 rounded-lg transition-colors ${
                  image ? "text-brand-600 bg-brand-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                }`}
                title="Attach image"
              >
                <ImageIcon size={18} />
              </button>
              <input
                className="input flex-1 text-sm"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about job fit, skills, strategy — or share a screenshot..."
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as any);
                  }
                }}
              />
              <button
                type="submit"
                className="btn-primary px-3 py-2.5 flex items-center gap-1.5"
                disabled={loading || (!input.trim() && !image)}
              >
                <SendIcon size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
