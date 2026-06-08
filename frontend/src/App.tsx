import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "./store/authStore";
import Layout from "./components/layout/Layout";
import LoginPage from "./components/pages/LoginPage";
import PersonaPage from "./components/pages/PersonaPage";
import DashboardPage from "./components/pages/DashboardPage";
import HistoryPage from "./components/pages/HistoryPage";
import HistoryDetailPage from "./components/pages/HistoryDetailPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/persona" element={<PersonaPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/history/:id" element={<HistoryDetailPage />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
