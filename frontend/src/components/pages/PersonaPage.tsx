import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { uploadCV, savePersona, getPersona } from "../../services/api";
import {
  UploadIcon, UserIcon, PencilIcon, CheckIcon, XIcon,
  PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon,
} from "lucide-react";

const STORAGE_KEY = "persona_review_state";

type ExperienceEntry = { job_title: string; company: string; dates: string; responsibilities: string[] };
type EducationEntry = { degree: string; institution: string; dates: string; grade?: string };

export default function PersonaPage() {
  const [step, setStep] = useState<"loading" | "upload" | "review" | "profile">("loading");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [persona, setPersona] = useState<any>({});
  const [editMode, setEditMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basics: true, summary: true, skills: true, experience: true, education: true, achievements: true,
  });

  // Load persona from Supabase on mount; restore in-progress review from localStorage
  useEffect(() => {
    const savedReview = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
    })();

    if (savedReview?.step === "review") {
      setPersona(savedReview.persona);
      setStep("review");
      return;
    }

    getPersona()
      .then((r) => { setPersona(r.data); setStep("profile"); })
      .catch(() => setStep("upload"));
  }, []);

  // Persist in-progress review to localStorage
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
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
  });

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await savePersona(persona);
      setPersona(res.data);
      setStep("profile");
      setEditMode(false);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (step === "loading") {
    return <div className="text-slate-400 text-sm">Loading your profile...</div>;
  }

  // ── Upload prompt ──────────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserIcon size={24} className="text-brand-600" /> My Persona
          </h1>
          <p className="text-slate-500 mt-1">
            Upload your CV — we'll extract and store your professional profile for all future applications.
          </p>
        </div>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-300"
          }`}
        >
          <input {...getInputProps()} />
          <UploadIcon size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {isDragActive ? "Drop it here" : "Drag & drop your CV"}
          </p>
          <p className="text-slate-400 text-sm mt-1">PDF or DOCX • max 10MB</p>
          {uploading && <p className="text-brand-600 mt-3 text-sm">Extracting your profile...</p>}
        </div>
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      </div>
    );
  }

  // ── Review (post-upload, before save) ─────────────────────────────────────
  if (step === "review") {
    return (
      <PersonaForm
        persona={persona}
        setPersona={setPersona}
        saving={saving}
        error={error}
        onSave={handleSave}
        onBack={() => { setStep("upload"); localStorage.removeItem(STORAGE_KEY); }}
        title="Review Extracted Profile"
        subtitle="Edit anything that looks wrong before saving."
        saveLabel="Save Persona"
      />
    );
  }

  // ── Saved profile view ─────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserIcon size={24} className="text-brand-600" />
            {persona.full_name || "My Persona"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {editMode ? "Make your changes below and hit Save." : "Your stored professional profile."}
          </p>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3"
              >
                <CheckIcon size={15} /> {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  getPersona().then((r) => setPersona(r.data)).catch(() => {});
                }}
                className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3"
              >
                <XIcon size={15} /> Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3"
            >
              <PencilIcon size={14} /> Edit
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {editMode ? (
        <PersonaForm
          persona={persona}
          setPersona={setPersona}
          saving={saving}
          error={error}
          onSave={handleSave}
          onBack={() => {
            setEditMode(false);
            getPersona().then((r) => setPersona(r.data)).catch(() => {});
          }}
          title=""
          subtitle=""
          saveLabel="Save"
          inlineMode
        />
      ) : (
        <div className="space-y-4">
          {/* Basic info */}
          <Section title="Basic Information" sectionKey="basics" expanded={expandedSections.basics} onToggle={toggleSection}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ["Email", persona.email],
                ["Phone", persona.phone],
                ["Location", persona.location],
                ["LinkedIn", persona.linkedin_url],
              ].map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <dt className="text-slate-500 text-xs uppercase tracking-wide">{label}</dt>
                    <dd className="text-slate-800 dark:text-slate-200 mt-0.5 break-all">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
          </Section>

          {/* Summary */}
          {persona.summary && (
            <Section title="Professional Summary" sectionKey="summary" expanded={expandedSections.summary} onToggle={toggleSection}>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{persona.summary}</p>
            </Section>
          )}

          {/* Skills */}
          {persona.skills?.length > 0 && (
            <Section title="Skills" sectionKey="skills" expanded={expandedSections.skills} onToggle={toggleSection}>
              <div className="flex flex-wrap gap-1.5">
                {persona.skills.map((s: string, i: number) => (
                  <span key={i} className="text-xs bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 px-2.5 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Experience */}
          {persona.experience?.length > 0 && (
            <Section title="Work Experience" sectionKey="experience" expanded={expandedSections.experience} onToggle={toggleSection}>
              <div className="space-y-4">
                {persona.experience.map((exp: ExperienceEntry, i: number) => (
                  <div key={i} className="border-l-2 border-brand-200 pl-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{exp.job_title}</p>
                    <p className="text-slate-500 text-xs">{exp.company}{exp.dates ? ` · ${exp.dates}` : ""}</p>
                    {exp.responsibilities?.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {exp.responsibilities.map((r: string, j: number) => (
                          <li key={j} className="text-slate-600 dark:text-slate-300 text-xs flex gap-1.5">
                            <span className="mt-1 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Education */}
          {persona.education?.length > 0 && (
            <Section title="Education" sectionKey="education" expanded={expandedSections.education} onToggle={toggleSection}>
              <div className="space-y-3">
                {persona.education.map((edu: EducationEntry, i: number) => (
                  <div key={i} className="border-l-2 border-slate-200 pl-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{edu.degree}</p>
                    <p className="text-slate-500 text-xs">
                      {edu.institution}{edu.dates ? ` · ${edu.dates}` : ""}{edu.grade ? ` · ${edu.grade}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Achievements */}
          {persona.achievements?.length > 0 && (
            <Section title="Achievements" sectionKey="achievements" expanded={expandedSections.achievements} onToggle={toggleSection}>
              <ul className="space-y-1">
                {persona.achievements.map((a: string, i: number) => (
                  <li key={i} className="text-slate-600 dark:text-slate-300 text-sm flex gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Certifications */}
          {persona.certifications?.length > 0 && (
            <Section title="Certifications" sectionKey="certs" expanded={expandedSections.certs ?? true} onToggle={toggleSection}>
              <ul className="space-y-1">
                {persona.certifications.map((c: string, i: number) => (
                  <li key={i} className="text-slate-600 dark:text-slate-300 text-sm flex gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Re-upload zone */}
          <div className="pt-2">
            <p className="text-xs text-slate-400 mb-2">Upload a new CV to replace this profile:</p>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-300"
              }`}
            >
              <input {...getInputProps()} />
              <UploadIcon size={20} className="mx-auto text-slate-400 mb-1" />
              <p className="text-slate-500 text-sm">{isDragActive ? "Drop it here" : "Drag & drop a new CV"}</p>
              {uploading && <p className="text-brand-600 mt-2 text-sm">Extracting…</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Collapsible section wrapper ──────────────────────────────────────────────
function Section({
  title, sectionKey, expanded, onToggle, children,
}: {
  title: string; sectionKey: string; expanded: boolean; onToggle: (k: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between text-left mb-0"
      >
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</h2>
        {expanded ? <ChevronUpIcon size={15} className="text-slate-400" /> : <ChevronDownIcon size={15} className="text-slate-400" />}
      </button>
      {expanded && <div className="mt-3">{children}</div>}
    </div>
  );
}

// ── Persona edit form (shared by review and edit-in-place) ───────────────────
function PersonaForm({
  persona, setPersona, saving, error, onSave, onBack, title, subtitle, saveLabel, inlineMode = false,
}: {
  persona: any;
  setPersona: (p: any) => void;
  saving: boolean;
  error: string;
  onSave: () => void;
  onBack: () => void;
  title: string;
  subtitle: string;
  saveLabel: string;
  inlineMode?: boolean;
}) {
  function set(key: string, value: any) {
    setPersona((p: any) => ({ ...p, [key]: value }));
  }

  function updateExp(i: number, field: string, value: any) {
    const updated = [...(persona.experience || [])];
    updated[i] = { ...updated[i], [field]: value };
    set("experience", updated);
  }

  function updateEdu(i: number, field: string, value: any) {
    const updated = [...(persona.education || [])];
    updated[i] = { ...updated[i], [field]: value };
    set("education", updated);
  }

  return (
    <div className={inlineMode ? "" : "max-w-2xl mx-auto"}>
      {title && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
        </div>
      )}

      <div className="space-y-6">
        {/* Basic fields */}
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Basic Information</h2>
          {[
            { label: "Full Name", key: "full_name" },
            { label: "Email", key: "email" },
            { label: "Phone", key: "phone" },
            { label: "Location", key: "location" },
            { label: "LinkedIn URL", key: "linkedin_url" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
              <input
                className="input mt-1 text-sm"
                value={persona[key] || ""}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="card p-4">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm mb-2">Professional Summary</h2>
          <textarea
            className="input h-28 resize-none text-sm"
            value={persona.summary || ""}
            onChange={(e) => set("summary", e.target.value)}
          />
        </div>

        {/* Skills */}
        <div className="card p-4">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm mb-2">Skills</h2>
          <input
            className="input text-sm"
            value={(persona.skills || []).join(", ")}
            onChange={(e) =>
              set("skills", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))
            }
            placeholder="Comma-separated list of skills"
          />
        </div>

        {/* Experience */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Work Experience</h2>
            <button
              type="button"
              onClick={() =>
                set("experience", [
                  ...(persona.experience || []),
                  { job_title: "", company: "", dates: "", responsibilities: [] },
                ])
              }
              className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <PlusIcon size={12} /> Add
            </button>
          </div>
          <div className="space-y-4">
            {(persona.experience || []).map((exp: ExperienceEntry, i: number) => (
              <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Job Title</label>
                      <input className="input text-sm mt-0.5" value={exp.job_title || ""} onChange={(e) => updateExp(i, "job_title", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Company</label>
                      <input className="input text-sm mt-0.5" value={exp.company || ""} onChange={(e) => updateExp(i, "company", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-slate-500">Dates</label>
                      <input className="input text-sm mt-0.5" value={exp.dates || ""} onChange={(e) => updateExp(i, "dates", e.target.value)} placeholder="e.g. Jan 2022 – Present" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("experience", (persona.experience || []).filter((_: any, j: number) => j !== i))}
                    className="mt-4 text-red-400 hover:text-red-600"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Responsibilities (one per line)</label>
                  <textarea
                    className="input text-sm mt-0.5 h-24 resize-none"
                    value={(exp.responsibilities || []).join("\n")}
                    onChange={(e) => updateExp(i, "responsibilities", e.target.value.split("\n"))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Education</h2>
            <button
              type="button"
              onClick={() =>
                set("education", [
                  ...(persona.education || []),
                  { degree: "", institution: "", dates: "", grade: "" },
                ])
              }
              className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <PlusIcon size={12} /> Add
            </button>
          </div>
          <div className="space-y-3">
            {(persona.education || []).map((edu: EducationEntry, i: number) => (
              <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Degree / Qualification</label>
                      <input className="input text-sm mt-0.5" value={edu.degree || ""} onChange={(e) => updateEdu(i, "degree", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Institution</label>
                      <input className="input text-sm mt-0.5" value={edu.institution || ""} onChange={(e) => updateEdu(i, "institution", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Dates</label>
                      <input className="input text-sm mt-0.5" value={edu.dates || ""} onChange={(e) => updateEdu(i, "dates", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Grade (optional)</label>
                      <input className="input text-sm mt-0.5" value={edu.grade || ""} onChange={(e) => updateEdu(i, "grade", e.target.value)} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("education", (persona.education || []).filter((_: any, j: number) => j !== i))}
                    className="mt-4 text-red-400 hover:text-red-600"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Achievements</h2>
            <button
              type="button"
              onClick={() => set("achievements", [...(persona.achievements || []), ""])}
              className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <PlusIcon size={12} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {(persona.achievements || []).map((a: string, i: number) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input text-sm flex-1"
                  value={a}
                  onChange={(e) => {
                    const updated = [...(persona.achievements || [])];
                    updated[i] = e.target.value;
                    set("achievements", updated);
                  }}
                />
                <button
                  type="button"
                  onClick={() => set("achievements", (persona.achievements || []).filter((_: any, j: number) => j !== i))}
                  className="text-red-400 hover:text-red-600"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Certifications</h2>
            <button
              type="button"
              onClick={() => set("certifications", [...(persona.certifications || []), ""])}
              className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <PlusIcon size={12} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {(persona.certifications || []).map((c: string, i: number) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input text-sm flex-1"
                  value={c}
                  onChange={(e) => {
                    const updated = [...(persona.certifications || [])];
                    updated[i] = e.target.value;
                    set("certifications", updated);
                  }}
                />
                <button
                  type="button"
                  onClick={() => set("certifications", (persona.certifications || []).filter((_: any, j: number) => j !== i))}
                  className="text-red-400 hover:text-red-600"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {!inlineMode && (
        <div className="flex gap-3 mt-6">
          <button onClick={onSave} className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : saveLabel}
          </button>
          <button onClick={onBack} className="btn-secondary">Back</button>
        </div>
      )}
    </div>
  );
}
