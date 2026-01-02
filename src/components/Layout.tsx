import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FiBarChart2, FiUser, FiLogOut, FiPieChart, FiMap, FiList } from 'react-icons/fi';
import '../styles/Layout.css';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <h2>
            <FiBarChart2 className="brand-icon" />
            Sistema INE
          </h2>
        </div>
        
        <ul className="navbar-menu">
          <li>
            <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/estadisticas" className={isActive('/estadisticas') ? 'active' : ''}>
              Estadísticas
            </Link>
          </li>
          <li>
            <Link to="/mapa" className={isActive('/mapa') ? 'active' : ''}>
              Mapa
            </Link>
          </li>
          <li>
            <Link to="/registros" className={isActive('/registros') ? 'active' : ''}>
              Registros
            </Link>
          </li>
        </ul>

        <div className="navbar-user">
          <div className="user-info-card">
            <div className="user-avatar">
              <FiUser />
            </div>
            <div className="user-details">
              <span className="username">{usuario?.username}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <FiLogOut />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
      
      <nav className="bottom-nav" aria-label="Navegación inferior">
        <ul>
          <li>
            <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
              <FiBarChart2 size={24} />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link to="/estadisticas" className={isActive('/estadisticas') ? 'active' : ''}>
              <FiPieChart size={24} />
              <span>Estadísticas</span>
            </Link>
          </li>
          <li>
            <Link to="/mapa" className={isActive('/mapa') ? 'active' : ''}>
              <FiMap size={24} />
              <span>Mapa</span>
            </Link>
          </li>
          <li>
            <Link to="/registros" className={isActive('/registros') ? 'active' : ''}>
              <FiList size={24} />
              <span>Registros</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};
