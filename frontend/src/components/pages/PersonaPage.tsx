import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { uploadCV, savePersona, getPersona } from "../../services/api";
import { UploadIcon, CheckCircleIcon, UserIcon } from "lucide-react";

const STORAGE_KEY = "persona_review_state";

export default function PersonaPage() {
  const savedReview = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  })();

  const [step, setStep] = useState<"upload" | "review" | "saved">(
    savedReview?.step === "review" ? "review" : "upload"
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [persona, setPersona] = useState<any>(savedReview?.step === "review" ? savedReview.persona : {});
  const [initialLoading, setInitialLoading] = useState(savedReview?.step !== "review");

  useEffect(() => {
    if (savedReview?.step === "review") return;
    getPersona()
      .then((r) => { setPersona(r.data); setStep("saved"); })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => {
    if (step === "review") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, persona }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [step, persona]);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await uploadCV(file);
      setPersona(res.data.structured);
      setStep("review");
    } catch (e: any) {
      setError(e.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    maxFiles: 1,
  });

  async function handleSave() {
    setSaving(true);
    try {
      await savePersona(persona);
      setStep("saved");
    } catch (e: any) {
      setError(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (initialLoading) return <div className="text-slate-400 text-sm">Loading your profile...</div>;

  if (step === "upload" || step === "saved") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserIcon size={24} className="text-brand-600" /> My Persona
          </h1>
          <p className="text-slate-500 mt-1">Upload your CV — we'll extract and store your professional profile for all future applications.</p>
        </div>

        {step === "saved" && (
          <div className="card p-5 mb-6 border-green-200 bg-green-50">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <CheckCircleIcon size={18} /> Persona saved — {persona.full_name || "Your profile"}
            </div>
            <p className="text-green-600 text-sm mt-1">Upload a new CV to update your profile.</p>
          </div>
        )}

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-300"
          }`}
        >
          <input {...getInputProps()} />
          <UploadIcon size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="font-medium text-slate-700">{isDragActive ? "Drop it here" : "Drag & drop your CV"}</p>
          <p className="text-slate-400 text-sm mt-1">PDF or DOCX • max 10MB</p>
          {uploading && <p className="text-brand-600 mt-3 text-sm">Extracting your profile...</p>}
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      </div>
    );
  }

  // Review step
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Review Extracted Profile</h1>
        <p className="text-slate-500 mt-1">Edit anything that's incorrect before saving.</p>
      </div>

      <div className="space-y-4">
        {[
          { label: "Full Name", key: "full_name" },
          { label: "Email", key: "email" },
          { label: "Phone", key: "phone" },
          { label: "Location", key: "location" },
          { label: "LinkedIn URL", key: "linkedin_url" },
        ].map(({ label, key }) => (
          <div key={key}>
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <input
              className="input mt-1"
              value={persona[key] || ""}
              onChange={(e) => setPersona({ ...persona, [key]: e.target.value })}
            />
          </div>
        ))}

        <div>
          <label className="text-sm font-medium text-slate-700">Professional Summary</label>
          <textarea
            className="input mt-1 h-28 resize-none"
            value={persona.summary || ""}
            onChange={(e) => setPersona({ ...persona, summary: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Skills (comma-separated)</label>
          <input
            className="input mt-1"
            value={(persona.skills || []).join(", ")}
            onChange={(e) => setPersona({ ...persona, skills: e.target.value.split(",").map((s: string) => s.trim()) })}
          />
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
      <div className="flex gap-3 mt-6">
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Persona"}
        </button>
        <button onClick={() => setStep("upload")} className="btn-secondary">Back</button>
      </div>
    </div>
  );
}
