import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getHistoryItem, downloadCV, downloadCoverLetter, triggerDownload } from "../../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DownloadIcon, ArrowLeftIcon } from "lucide-react";

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("cv");

  useEffect(() => {
    if (id) getHistoryItem(id).then((r) => setItem(r.data));
  }, [id]);

  if (!item) return <div className="text-slate-500 text-sm">Loading...</div>;

  return (
    <div>
      <Link to="/history" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeftIcon size={14} /> Back to History
      </Link>

      <div className="card p-5 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{item.job_data?.title}</h1>
          <p className="text-slate-500 text-sm">{item.job_data?.company} · {item.job_url}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={async () => { const r = await downloadCV(id!); triggerDownload(r.data, "CV.docx"); }} className="btn-secondary flex items-center gap-1.5 text-sm">
            <DownloadIcon size={14} /> CV
          </button>
          <button onClick={async () => { const r = await downloadCoverLetter(id!); triggerDownload(r.data, "CoverLetter.txt"); }} className="btn-secondary flex items-center gap-1.5 text-sm">
            <DownloadIcon size={14} /> Cover Letter
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
        {["cv", "cover", "strategy", "ideal"].map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? "bg-white shadow-sm" : "text-slate-500"}`}>
            {t === "cv" ? "CV" : t === "cover" ? "Cover Letter" : t === "strategy" ? "Strategy" : "Ideal Candidate"}
          </button>
        ))}
      </div>

      <div className="card p-6 prose prose-slate prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {activeTab === "cv" ? item.outputs?.optimised_cv : activeTab === "cover" ? item.outputs?.cover_letter : activeTab === "strategy" ? item.outputs?.strategy_plan : item.outputs?.ideal_candidate_profile}
        </ReactMarkdown>
      </div>
    </div>
  );
}
