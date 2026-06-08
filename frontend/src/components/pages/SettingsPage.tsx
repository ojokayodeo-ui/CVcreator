import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getDriveAuthUrl, getDriveStatus } from "../../services/api";
import { CheckCircleIcon, HardDriveIcon, ExternalLinkIcon } from "lucide-react";

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const [driveConnected, setDriveConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const justConnected = searchParams.get("drive") === "connected";

  useEffect(() => {
    getDriveStatus()
      .then((r) => setDriveConnected(r.data.connected))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [justConnected]);

  async function handleConnectDrive() {
    setConnecting(true);
    try {
      const res = await getDriveAuthUrl();
      window.location.href = res.data.auth_url;
    } catch {
      setConnecting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings</h1>

      {justConnected && (
        <div className="card p-4 mb-6 border-green-200 bg-green-50 flex items-center gap-2 text-green-700">
          <CheckCircleIcon size={18} />
          Google Drive connected successfully.
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
            <HardDriveIcon size={20} className="text-slate-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-800">Google Drive</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Auto-save generated CVs, cover letters and strategies to your Drive in organised folders.
            </p>
            {!loading && (
              <div className="mt-4">
                {driveConnected ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircleIcon size={16} /> Connected
                  </div>
                ) : (
                  <button
                    onClick={handleConnectDrive}
                    disabled={connecting}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <ExternalLinkIcon size={14} />
                    {connecting ? "Redirecting..." : "Connect Google Drive"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
