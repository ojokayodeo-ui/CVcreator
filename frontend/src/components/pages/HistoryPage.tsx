import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHistory } from "../../services/api";
import { BriefcaseIcon, ClockIcon } from "lucide-react";

export default function HistoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory().then((r) => setItems(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500 text-sm">Loading...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClockIcon size={24} className="text-brand-600" /> Application History
        </h1>
        <p className="text-slate-500 mt-1">Your last 20 generated application packages.</p>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <BriefcaseIcon size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No applications yet — generate your first one on the Dashboard.</p>
          <Link to="/dashboard" className="btn-primary inline-block mt-4">Go to Dashboard</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const score = item.match_score?.overall_score;
            return (
              <Link
                key={item.id}
                to={`/history/${item.id}`}
                className="card p-4 flex items-center gap-4 hover:border-brand-200 transition-colors block"
              >
                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                  <BriefcaseIcon size={18} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{item.job_data?.title || "Unknown role"}</p>
                  <p className="text-slate-500 text-sm truncate">{item.job_data?.company} · {item.job_url}</p>
                </div>
                {score != null && (
                  <div className={`text-sm font-bold shrink-0 ${score >= 75 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-500"}`}>
                    {score}% match
                  </div>
                )}
                <div className="text-xs text-slate-400 shrink-0">
                  {new Date(item.created_at).toLocaleDateString()}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
