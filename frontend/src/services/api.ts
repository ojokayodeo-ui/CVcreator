import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({ baseURL: BASE_URL });

// CV / Persona
export const uploadCV = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/cv/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
};

export const savePersona = (data: object) => api.post("/cv/persona", data);
export const getPersona = () => api.get("/cv/persona");

// Jobs
export const analyzeJob = (jobUrl: string, manualDescription?: string) =>
  api.post("/jobs/analyze", { job_url: jobUrl, manual_description: manualDescription });

export const generateDocuments = (payload: {
  persona_id: string;
  job_url: string;
  manual_description?: string;
  generate_cv?: boolean;
  generate_cover_letter?: boolean;
  generate_strategy?: boolean;
  generate_application_helper?: boolean;
  save_to_drive?: boolean;
}) => api.post("/jobs/generate", payload);

export const getSearchCountries = () => api.get("/jobs/search/countries");
export const searchJobs = (
  keyword: string,
  country: string,
  location: string,
  page = 1,
  maxDaysOld?: number,
  sortBy: string = "relevance"
) =>
  api.get("/jobs/search", {
    params: { keyword, country, location, page, max_days_old: maxDaysOld, sort_by: sortBy },
  });

export const getHistory = () => api.get("/jobs/history");
export const getHistoryItem = (id: string) => api.get(`/jobs/history/${id}`);

// Downloads
export const downloadCV = (jobId: string) =>
  api.get(`/download/${jobId}/cv`, { responseType: "blob" });

export const downloadCoverLetter = (jobId: string) =>
  api.get(`/download/${jobId}/cover-letter`, { responseType: "blob" });

// Career Advisor Chat
export const getChatHistory = () => api.get("/chat/history");
export const sendChatMessage = (message: string) => api.post("/chat/message", { message });

// Job Application Tracker
export const getApplications = () => api.get("/tracker");
export const createApplication = (data: object) => api.post("/tracker", data);
export const updateApplication = (id: string, data: object) => api.patch(`/tracker/${id}`, data);
export const deleteApplication = (id: string) => api.delete(`/tracker/${id}`);

// Drive
export const getDriveAuthUrl = () => api.get("/drive/auth");
export const getDriveStatus = () => api.get("/drive/status");

// Helper: trigger file download in browser
export const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
