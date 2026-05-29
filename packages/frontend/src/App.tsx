import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import LinksPage from '@/pages/LinksPage';
import LinkDetailPage from '@/pages/LinkDetailPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SettingsPage from '@/pages/SettingsPage';
import AdminPage from '@/pages/AdminPage';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/links"
        element={
          <ProtectedRoute>
            <Layout>
              <LinksPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/links/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <LinkDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <AnalyticsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <AdminPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
