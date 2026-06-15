import { useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { generateDocuments, downloadCV, downloadCoverLetter, triggerDownload } from "../../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BriefcaseIcon, SparklesIcon, DownloadIcon, AlertCircleIcon,
  CheckCircleIcon, TrendingUpIcon, MessageSquareIcon, MapIcon, UserSearchIcon,
} from "lucide-react";

type Tab = "cv" | "cover" | "match" | "strategy" | "questions" | "ideal";

const STORAGE_KEY = "dashboard_state";

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const prefillDescription = (location.state as { description?: string } | null)?.description;

  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  })();

  const [jobUrl, setJobUrl] = useState(searchParams.get("jobUrl") || saved?.jobUrl || "");
  const [manualDesc, setManualDesc] = useState(prefillDescription || saved?.manualDesc || "");
  const [showManual, setShowManual] = useState(!!prefillDescription || !!saved?.showManual);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(saved?.result || null);
  const [activeTab, setActiveTab] = useState<Tab>(saved?.activeTab || "cv");

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ jobUrl, manualDesc, showManual, result, activeTab })
    );
  }, [jobUrl, manualDesc, showManual, result, activeTab]);

  function handleCancel() {
    setJobUrl("");
    setManualDesc("");
    setShowManual(false);
    setResult(null);
    setError("");
    setActiveTab("cv");
    localStorage.removeItem(STORAGE_KEY);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!jobUrl && !manualDesc) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await generateDocuments({
        persona_id: "current",
        job_url: jobUrl,
        manual_description: manualDesc || undefined,
        generate_cv: true,
        generate_cover_letter: true,
        generate_strategy: true,
      });
      setResult(res.data);
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Generation failed. Check your persona and try again.");
      if (detail?.includes("scraping") || detail?.includes("manually")) setShowManual(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadCV() {
    const res = await downloadCV(result.job_id);
    triggerDownload(res.data, `${result.job_data.title}_CV.docx`);
  }

  async function handleDownloadCover() {
    const res = await downloadCoverLetter(result.job_id);
    triggerDownload(res.data, `${result.job_data.title}_CoverLetter.txt`);
  }

  const match = result?.match_score;
  const scoreColor = (s: number) => s >= 75 ? "text-green-600" : s >= 50 ? "text-amber-600" : "text-red-600";
  const scoreBar = (s: number) => s >= 75 ? "bg-green-500" : s >= 50 ? "bg-amber-500" : "bg-red-500";

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "cv", label: "Optimised CV", icon: BriefcaseIcon },
    { key: "cover", label: "Cover Letter", icon: MessageSquareIcon },
    { key: "match", label: "Match Score", icon: TrendingUpIcon },
    { key: "strategy", label: "Strategy", icon: MapIcon },
    { key: "questions", label: "Interview Prep", icon: SparklesIcon },
    { key: "ideal", label: "Ideal Candidate", icon: UserSearchIcon },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <SparklesIcon size={24} className="text-brand-600" /> Generate Application
        </h1>
        <p className="text-slate-500 mt-1">Paste a job URL to generate a tailored CV, cover letter and interview strategy.</p>
      </div>

      <form onSubmit={handleGenerate} className="card p-6 mb-8">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Job URL</label>
            <input
              className="input mt-1"
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://linkedin.com/jobs/view/... or Indeed, company sites"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className="text-sm text-brand-600 hover:underline"
          >
            {showManual ? "Hide" : "Can't scrape?"} — paste job description manually
          </button>

          {showManual && (
            <div>
              <label className="text-sm font-medium text-slate-700">Job Description (manual)</label>
              <textarea
                className="input mt-1 h-40 resize-none"
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                placeholder="Paste the full job description here..."
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary w-full text-base py-3"
              disabled={loading || (!jobUrl && !manualDesc)}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Generating — this takes 30-60s...
                </span>
              ) : (
                "Generate Application Package"
              )}
            </button>
            {(jobUrl || manualDesc || result) && (
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary text-base py-3 px-6"
                disabled={loading}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      {result && (
        <div>
          {/* Job header */}
          <div className="card p-5 mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{result.job_data.title}</h2>
              <p className="text-slate-500 text-sm">{result.job_data.company} · {result.job_data.location}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleDownloadCV} className="btn-secondary flex items-center gap-1.5 text-sm">
                <DownloadIcon size={14} /> CV
              </button>
              <button onClick={handleDownloadCover} className="btn-secondary flex items-center gap-1.5 text-sm">
                <DownloadIcon size={14} /> Cover Letter
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === key ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="card p-6">
            {(activeTab === "cv" || activeTab === "cover") && (
              <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activeTab === "cv" ? result.optimised_cv : result.cover_letter}
                </ReactMarkdown>
              </div>
            )}

            {activeTab === "match" && match && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Overall", value: match.overall_score },
                    { label: "Skills", value: match.skill_match },
                    { label: "Experience", value: match.experience_match },
                    { label: "Education", value: match.education_match },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center p-4 bg-slate-50 rounded-xl">
                      <div className={`text-3xl font-bold ${scoreColor(value)}`}>{value}%</div>
                      <div className="text-slate-500 text-sm mt-1">{label}</div>
                      <div className="mt-2 h-1.5 bg-slate-200 rounded-full">
                        <div className={`h-full rounded-full ${scoreBar(value)}`} style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <CheckCircleIcon size={16} className="text-green-500" /> Matching Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {match.matching_skills?.map((s: string) => (
                        <span key={s} className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full border border-green-200">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <AlertCircleIcon size={16} className="text-amber-500" /> Skill Gaps
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {match.skill_gaps?.map((s: string) => (
                        <span key={s} className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-full border border-amber-200">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">Recommendations</h3>
                  <ul className="space-y-2">
                    {match.recommendations?.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-brand-500 font-bold mt-0.5">→</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "strategy" && (
              <div className="space-y-6">
                <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.strategy_plan}</ReactMarkdown>
                </div>
                {result.interview_stages?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-3">Predicted Interview Stages</h3>
                    <div className="space-y-3">
                      {result.interview_stages.map((stage: any, i: number) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-6 h-6 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center font-bold">{i + 1}</span>
                            <span className="font-semibold text-slate-800">{stage.stage}</span>
                            <span className="text-xs text-slate-400 ml-auto">{stage.format} · {stage.duration}</span>
                          </div>
                          <p className="text-slate-600 text-sm ml-8">{stage.focus}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "questions" && result.interview_questions?.length > 0 && (
              <div className="space-y-4">
                {result.interview_questions.map((q: any, i: number) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium text-slate-800 text-sm">{i + 1}. {q.question}</p>
                      <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full shrink-0">{q.category}</span>
                    </div>
                    <p className="text-slate-500 text-xs mb-2">Why asked: {q.why_asked}</p>
                    <p className="text-slate-600 text-xs">Framework: <span className="font-medium">{q.suggested_answer_framework}</span></p>
                    {q.key_points?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {q.key_points.map((pt: string, j: number) => (
                          <li key={j} className="text-xs text-slate-500 flex items-start gap-1">
                            <span className="text-brand-500">•</span> {pt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "ideal" && (
              <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.ideal_candidate_profile}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
