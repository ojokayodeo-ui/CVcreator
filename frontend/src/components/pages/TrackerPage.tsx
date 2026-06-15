import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  PlusIcon, XIcon, ExternalLinkIcon, CalendarIcon, BuildingIcon,
  MapPinIcon, StickyNoteIcon, TrashIcon, ChevronDownIcon, TrophyIcon,
  ClipboardCheckIcon, PhoneIcon, UsersIcon, FileSearchIcon,
  BookmarkIcon, SendIcon, AlertCircleIcon,
} from "lucide-react";
import { getApplications, createApplication, updateApplication, deleteApplication } from "../../services/api";

type Stage =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "assessment"
  | "offer"
  | "background_checks"
  | "hired"
  | "rejected";

type Application = {
  id: string;
  job_title: string;
  company: string;
  location: string;
  job_url: string;
  stage: Stage;
  notes: string;
  applied_date: string | null;
  next_action: string;
  next_date: string | null;
  salary: string;
  created_at: string;
};

const STAGES: { key: Stage; label: string; color: string; bg: string; border: string; icon: React.ElementType }[] = [
  { key: "saved",            label: "Saved",            color: "text-slate-600",  bg: "bg-slate-100",   border: "border-slate-300",  icon: BookmarkIcon },
  { key: "applied",          label: "Applied",          color: "text-blue-600",   bg: "bg-blue-50",     border: "border-blue-300",   icon: SendIcon },
  { key: "screening",        label: "Screening",        color: "text-purple-600", bg: "bg-purple-50",   border: "border-purple-300", icon: PhoneIcon },
  { key: "interview",        label: "Interview",        color: "text-amber-600",  bg: "bg-amber-50",    border: "border-amber-300",  icon: UsersIcon },
  { key: "assessment",       label: "Assessment",       color: "text-orange-600", bg: "bg-orange-50",   border: "border-orange-300", icon: FileSearchIcon },
  { key: "offer",            label: "Offer Received",   color: "text-green-600",  bg: "bg-green-50",    border: "border-green-300",  icon: ClipboardCheckIcon },
  { key: "background_checks",label: "Background Checks",color: "text-teal-600",   bg: "bg-teal-50",     border: "border-teal-300",   icon: FileSearchIcon },
  { key: "hired",            label: "Hired!",           color: "text-emerald-700",bg: "bg-emerald-50",  border: "border-emerald-400",icon: TrophyIcon },
  { key: "rejected",         label: "Rejected",         color: "text-red-500",    bg: "bg-red-50",      border: "border-red-300",    icon: AlertCircleIcon },
];

const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]));

const BLANK: Omit<Application, "id" | "created_at"> = {
  job_title: "", company: "", location: "", job_url: "",
  stage: "saved", notes: "", applied_date: null,
  next_action: "", next_date: null, salary: "",
};

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function TrackerPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<Stage | null>(null);
  const [draft, setDraft] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    getApplications()
      .then((r) => setApps(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStage = destination.droppableId as Stage;
    setApps((prev) => prev.map((a) => a.id === draggableId ? { ...a, stage: newStage } : a));
    try {
      await updateApplication(draggableId, { stage: newStage });
    } catch {
      setApps((prev) => prev.map((a) => a.id === draggableId ? { ...a, stage: source.droppableId as Stage } : a));
    }
  }

  async function handleAdd() {
    if (!draft.job_title || !draft.company) return;
    setSaving(true);
    try {
      const res = await createApplication({ ...draft, stage: addingTo });
      setApps((prev) => [res.data, ...prev]);
      setAddingTo(null);
      setDraft({ ...BLANK });
    } catch {}
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setApps((prev) => prev.filter((a) => a.id !== id));
    await deleteApplication(id);
  }

  async function handleSaveNote(id: string) {
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, notes: noteText } : a));
    setEditingNote(null);
    await updateApplication(id, { notes: noteText });
  }

  const stageApps = (stage: Stage) => apps.filter((a) => a.stage === stage);
  const totalActive = apps.filter((a) => a.stage !== "hired" && a.stage !== "rejected").length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheckIcon size={24} className="text-brand-600" /> Application Tracker
          </h1>
          <p className="text-slate-500 mt-1">
            Drag cards between columns to update your application status.
            {apps.length > 0 && ` ${totalActive} active application${totalActive !== 1 ? "s" : ""} in progress.`}
          </p>
        </div>
        <button
          onClick={() => { setAddingTo("saved"); setDraft({ ...BLANK }); }}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <PlusIcon size={16} /> Add Application
        </button>
      </div>

      {/* Summary pills */}
      {apps.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {STAGES.filter((s) => stageApps(s.key).length > 0).map(({ key, label, color, bg, icon: Icon }) => (
            <span key={key} className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium ${bg} ${color}`}>
              <Icon size={12} /> {label}: {stageApps(key).length}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm text-center py-16">Loading your applications...</div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "70vh" }}>
            {STAGES.map(({ key, label, color, bg, border, icon: Icon }) => {
              const colApps = stageApps(key);
              return (
                <div key={key} className="flex flex-col shrink-0 w-64">
                  {/* Column header */}
                  <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${bg} border ${border} border-b-0`}>
                    <div className={`flex items-center gap-2 font-semibold text-sm ${color}`}>
                      <Icon size={14} /> {label}
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${bg} ${color} border ${border}`}>
                      {colApps.length}
                    </span>
                  </div>

                  {/* Droppable area */}
                  <Droppable droppableId={key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 flex flex-col gap-3 p-2 rounded-b-xl border ${border} transition-colors min-h-32 ${
                          snapshot.isDraggingOver ? `${bg} border-2` : "bg-slate-50 dark:bg-slate-900"
                        }`}
                      >
                        {/* Add card inline */}
                        {addingTo === key && (
                          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-200 space-y-2">
                            <input
                              autoFocus
                              className="input text-sm py-1.5"
                              placeholder="Job title *"
                              value={draft.job_title}
                              onChange={(e) => setDraft({ ...draft, job_title: e.target.value })}
                            />
                            <input
                              className="input text-sm py-1.5"
                              placeholder="Company *"
                              value={draft.company}
                              onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                            />
                            <input
                              className="input text-sm py-1.5"
                              placeholder="Location"
                              value={draft.location}
                              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                            />
                            <input
                              className="input text-sm py-1.5"
                              placeholder="Salary (optional)"
                              value={draft.salary}
                              onChange={(e) => setDraft({ ...draft, salary: e.target.value })}
                            />
                            <input
                              className="input text-sm py-1.5"
                              placeholder="Job URL (optional)"
                              value={draft.job_url}
                              onChange={(e) => setDraft({ ...draft, job_url: e.target.value })}
                            />
                            <input
                              type="date"
                              className="input text-sm py-1.5"
                              value={draft.applied_date || ""}
                              onChange={(e) => setDraft({ ...draft, applied_date: e.target.value || null })}
                            />
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={handleAdd}
                                disabled={saving || !draft.job_title || !draft.company}
                                className="btn-primary text-xs py-1.5 flex-1"
                              >
                                {saving ? "Adding..." : "Add"}
                              </button>
                              <button onClick={() => setAddingTo(null)} className="btn-secondary text-xs py-1.5 px-3">
                                <XIcon size={12} />
                              </button>
                            </div>
                          </div>
                        )}

                        {colApps.map((app, index) => (
                          <Draggable key={app.id} draggableId={app.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 transition-shadow ${
                                  snapshot.isDragging ? "shadow-xl rotate-1 scale-105" : "hover:shadow-md"
                                }`}
                              >
                                {/* Card header */}
                                <div className="p-3">
                                  <div className="flex items-start justify-between gap-1 mb-1">
                                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug flex-1">
                                      {app.job_title}
                                    </p>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {app.job_url && (
                                        <a
                                          href={app.job_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-slate-400 hover:text-brand-500 transition-colors"
                                        >
                                          <ExternalLinkIcon size={13} />
                                        </a>
                                      )}
                                      <button
                                        onClick={() => handleDelete(app.id)}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                      >
                                        <TrashIcon size={13} />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs mb-2">
                                    <BuildingIcon size={11} /> {app.company}
                                    {app.location && <><MapPinIcon size={11} className="ml-1" /> {app.location}</>}
                                  </div>

                                  {app.salary && (
                                    <p className="text-xs text-green-600 font-medium mb-1">{app.salary}</p>
                                  )}

                                  {app.applied_date && (
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                      <CalendarIcon size={11} /> Applied {formatDate(app.applied_date)}
                                    </div>
                                  )}

                                  {app.next_action && (
                                    <div className="mt-2 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-lg flex items-start gap-1">
                                      <AlertCircleIcon size={11} className="mt-0.5 shrink-0" />
                                      <span>{app.next_action}{app.next_date ? ` · ${formatDate(app.next_date)}` : ""}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Expand toggle */}
                                <button
                                  onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                                  className="w-full flex items-center justify-between px-3 py-1.5 border-t border-slate-100 dark:border-slate-700 text-slate-400 hover:text-slate-600 text-xs transition-colors"
                                >
                                  <span className="flex items-center gap-1">
                                    <StickyNoteIcon size={11} />
                                    {app.notes ? "Notes" : "Add note"}
                                  </span>
                                  <ChevronDownIcon
                                    size={12}
                                    className={`transition-transform ${expanded === app.id ? "rotate-180" : ""}`}
                                  />
                                </button>

                                {expanded === app.id && (
                                  <div className="px-3 pb-3 space-y-2">
                                    {editingNote === app.id ? (
                                      <>
                                        <textarea
                                          autoFocus
                                          className="input text-xs h-24 resize-none"
                                          value={noteText}
                                          onChange={(e) => setNoteText(e.target.value)}
                                          placeholder="Add a note about this application..."
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleSaveNote(app.id)}
                                            className="btn-primary text-xs py-1 px-3"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={() => setEditingNote(null)}
                                            className="btn-secondary text-xs py-1 px-2"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <div
                                        onClick={() => { setEditingNote(app.id); setNoteText(app.notes); }}
                                        className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-800 min-h-8 whitespace-pre-wrap"
                                      >
                                        {app.notes || <span className="text-slate-400 italic">Click to add a note...</span>}
                                      </div>
                                    )}

                                    {/* Quick stage move */}
                                    <div>
                                      <p className="text-xs text-slate-400 mb-1">Move to stage:</p>
                                      <select
                                        className="input text-xs py-1"
                                        value={app.stage}
                                        onChange={async (e) => {
                                          const newStage = e.target.value as Stage;
                                          setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, stage: newStage } : a));
                                          await updateApplication(app.id, { stage: newStage });
                                        }}
                                      >
                                        {STAGES.map((s) => (
                                          <option key={s.key} value={s.key}>{s.label}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Next action */}
                                    <div className="space-y-1">
                                      <input
                                        className="input text-xs py-1"
                                        placeholder="Next action (e.g. Send thank-you email)"
                                        defaultValue={app.next_action}
                                        onBlur={async (e) => {
                                          if (e.target.value !== app.next_action) {
                                            setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, next_action: e.target.value } : a));
                                            await updateApplication(app.id, { next_action: e.target.value });
                                          }
                                        }}
                                      />
                                      <input
                                        type="date"
                                        className="input text-xs py-1"
                                        defaultValue={app.next_date || ""}
                                        onBlur={async (e) => {
                                          if (e.target.value !== app.next_date) {
                                            setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, next_date: e.target.value || null } : a));
                                            await updateApplication(app.id, { next_date: e.target.value || null });
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}

                        {provided.placeholder}

                        {/* Add to this column button */}
                        {addingTo !== key && (
                          <button
                            onClick={() => { setAddingTo(key); setDraft({ ...BLANK, stage: key }); }}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 py-2 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors w-full"
                          >
                            <PlusIcon size={13} /> Add here
                          </button>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {!loading && apps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardCheckIcon size={48} className="text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">No applications yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-6">Add your first application and track it all the way to hired.</p>
          <button
            onClick={() => { setAddingTo("saved"); setDraft({ ...BLANK }); }}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon size={16} /> Add Your First Application
          </button>
        </div>
      )}
    </div>
  );
}
