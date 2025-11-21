import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Estadisticas } from './pages/Estadisticas';
import { Mapa } from './pages/Mapa';
import { Registros } from './pages/Registros';
import { Admin } from './pages/Admin';
import './styles/App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/estadisticas"
            element={
              <ProtectedRoute>
                <Layout>
                  <Estadisticas />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/mapa"
            element={
              <ProtectedRoute>
                <Layout>
                  <Mapa />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/registros"
            element={
              <ProtectedRoute>
                <Layout>
                  <Registros />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
