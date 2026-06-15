import { Link, useLocation } from "react-router-dom";
import { BriefcaseIcon, UserIcon, HistoryIcon, SparklesIcon, SettingsIcon, MessageSquareIcon, SearchIcon } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navItem = (to: string, label: string, Icon: React.ElementType) => (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        location.pathname === to
          ? "bg-brand-50 text-brand-700"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon size={16} />
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-brand-700 text-lg">
            <SparklesIcon size={20} />
            AI Job Engine
          </Link>
          <nav className="flex items-center gap-1">
            {navItem("/dashboard", "Generate", BriefcaseIcon)}
            {navItem("/search", "Search Jobs", SearchIcon)}
            {navItem("/persona", "My Persona", UserIcon)}
            {navItem("/history", "History", HistoryIcon)}
            {navItem("/chat", "Career Advisor", MessageSquareIcon)}
            {navItem("/settings", "Settings", SettingsIcon)}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  );
}
