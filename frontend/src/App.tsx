import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import PersonaPage from "./components/pages/PersonaPage";
import DashboardPage from "./components/pages/DashboardPage";
import HistoryPage from "./components/pages/HistoryPage";
import HistoryDetailPage from "./components/pages/HistoryDetailPage";
import SettingsPage from "./components/pages/SettingsPage";
import ChatPage from "./components/pages/ChatPage";
import JobSearchPage from "./components/pages/JobSearchPage";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/persona" element={<PersonaPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<HistoryDetailPage />} />
          <Route path="/search" element={<JobSearchPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
