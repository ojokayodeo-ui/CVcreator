import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSearchCountries, searchJobs } from "../../services/api";
import { SearchIcon, AlertCircleIcon, MapPinIcon, BuildingIcon, SparklesIcon, ExternalLinkIcon, ClockIcon } from "lucide-react";

type Country = { code: string; name: string };
type JobResult = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary_min: number | null;
  salary_max: number | null;
  url: string;
  created: string;
};

export default function JobSearchPage() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState<Country[]>([]);
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("gb");
  const [location, setLocation] = useState("");
  const [maxDaysOld, setMaxDaysOld] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<JobResult[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    getSearchCountries().then((r) => setCountries(r.data)).catch(() => {});
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await searchJobs(
        keyword.trim(),
        country,
        location.trim(),
        1,
        maxDaysOld ? Number(maxDaysOld) : undefined,
        sortBy
      );
      setResults(res.data.results);
      setCount(res.data.count);
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Job search failed. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate(job: JobResult) {
    // Pass the description we already have from the search API — Adzuna's
    // redirect links are often blocked from direct scraping.
    navigate(`/dashboard?jobUrl=${encodeURIComponent(job.url)}`, {
      state: { description: job.description },
    });
  }

  function formatPostedDate(created: string) {
    if (!created) return "";
    const date = new Date(created);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Posted today";
    if (days === 1) return "Posted yesterday";
    if (days < 30) return `Posted ${days} days ago`;
    const months = Math.floor(days / 30);
    return `Posted ${months} month${months > 1 ? "s" : ""} ago`;
  }

  function formatSalary(min: number | null, max: number | null) {
    if (!min && !max) return null;
    const fmt = (n: number) => `${Math.round(n).toLocaleString()}`;
    if (min && max && min !== max) return `${fmt(min)} - ${fmt(max)}`;
    return fmt(min || max || 0);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <SearchIcon size={24} className="text-brand-600" /> Search Jobs
        </h1>
        <p className="text-slate-500 mt-1">Find live vacancies by keyword, country and location.</p>
      </div>

      <form onSubmit={handleSearch} className="card p-6 mb-8">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Job Keyword</label>
            <input
              className="input mt-1"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. Product Manager"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Country</label>
            <select className="input mt-1" value={country} onChange={(e) => setCountry(e.target.value)}>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Location</label>
            <input
              className="input mt-1"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. London"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Posted Within</label>
            <select className="input mt-1" value={maxDaysOld} onChange={(e) => setMaxDaysOld(e.target.value)}>
              <option value="">Any time</option>
              <option value="1">Last 24 hours</option>
              <option value="3">Last 3 days</option>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Sort By</label>
            <select className="input mt-1" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Most recent</option>
              <option value="relevance">Relevance</option>
              <option value="salary">Salary</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg mt-4">
            <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full text-base py-3 mt-4" disabled={loading || !keyword.trim()}>
          {loading ? "Searching..." : "Search Jobs"}
        </button>
      </form>

      {results.length > 0 && (
        <div>
          <p className="text-slate-500 text-sm mb-4">{count.toLocaleString()} vacancies found, showing top {results.length}</p>
          <div className="space-y-4">
            {results.map((job) => (
              <div key={job.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{job.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1"><BuildingIcon size={14} /> {job.company}</span>
                      {job.location && <span className="flex items-center gap-1"><MapPinIcon size={14} /> {job.location}</span>}
                      {job.created && <span className="flex items-center gap-1"><ClockIcon size={14} /> {formatPostedDate(job.created)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => handleGenerate(job)} className="btn-primary flex items-center gap-1.5 text-sm">
                      <SparklesIcon size={14} /> Generate
                    </button>
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center justify-center gap-1.5 text-sm">
                      <ExternalLinkIcon size={14} /> View
                    </a>
                  </div>
                </div>
                {formatSalary(job.salary_min, job.salary_max) && (
                  <p className="text-sm text-green-700 mt-2">£/$ {formatSalary(job.salary_min, job.salary_max)}</p>
                )}
                <p className="text-sm text-slate-600 mt-2 line-clamp-3">{job.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && count === 0 && keyword && !error && (
        <p className="text-slate-500 text-sm text-center py-8">No results yet. Try a search above.</p>
      )}
    </div>
  );
}
