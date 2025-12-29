import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Estadisticas } from './pages/Estadisticas';
import { Mapa } from './pages/Mapa';
import { Registros } from './pages/Registros';
import { Admin } from './pages/Admin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminEstadisticas } from './pages/admin/AdminEstadisticas';
import { AdminMapa } from './pages/admin/AdminMapa';
import { AdminRegistros } from './pages/admin/AdminRegistros';
import './styles/App.css';

function AppRoutes() {
  const { usuario } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {usuario?.rol === 'admin' ? (
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            ) : (
              <Layout>
                <Dashboard />
              </Layout>
            )}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/estadisticas"
        element={
          <ProtectedRoute>
            {usuario?.rol === 'admin' ? (
              <AdminLayout>
                <AdminEstadisticas />
              </AdminLayout>
            ) : (
              <Layout>
                <Estadisticas />
              </Layout>
            )}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/mapa"
        element={
          <ProtectedRoute>
            {usuario?.rol === 'admin' ? (
              <AdminLayout>
                <AdminMapa />
              </AdminLayout>
            ) : (
              <Layout>
                <Mapa />
              </Layout>
            )}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/registros"
        element={
          <ProtectedRoute>
            {usuario?.rol === 'admin' ? (
              <AdminLayout>
                <AdminRegistros />
              </AdminLayout>
            ) : (
              <Layout>
                <Registros />
              </Layout>
            )}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <Admin />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
