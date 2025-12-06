import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { estadisticasService } from '../services/api';
import { StatsCard } from '.././components/StatsCard';
import { BarChart } from '.././components/BarChart';
import type { EstadisticasGeneral } from '../types';
import { FiClipboard, FiCalendar, FiBarChart2, FiSmartphone } from 'react-icons/fi';
import '../styles/Dashboard.css';

export const Dashboard = () => {
  const { usuario } = useAuth();
  const [estadisticas, setEstadisticas] = useState<EstadisticasGeneral | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoaded = useRef(false); // Flag para evitar doble carga

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      cargarEstadisticas();
    }
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setIsLoading(true);
      // Si el usuario es admin, usar endpoint exclusivo de admin
      const data = usuario?.rol === 'admin' 
        ? await estadisticasService.getGeneralAdmin()
        : await estadisticasService.getGeneral({ userId: usuario?.id });
      setEstadisticas(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      // Mantener valores por defecto en caso de error
      setEstadisticas({
        totalRegistros: 0,
        registrosHoy: 0,
        registrosMes: 0,
        numerosActivos: 0,
        registros_por_numero: [],
        registros_por_estado: [],
        registros_por_seccion: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Cargando estadísticas...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Bienvenido, {usuario?.nombre}</p>
      </div>

      <div className="stats-grid">
        <StatsCard
          title="Total de Registros"
          value={estadisticas?.totalRegistros || 0}
          icon={<FiClipboard />}
          color="blue"
        />
        <StatsCard
          title="Registros Hoy"
          value={estadisticas?.registrosHoy || 0}
          icon={<FiCalendar />}
          color="green"
        />
        <StatsCard
          title="Registros Este Mes"
          value={estadisticas?.registrosMes || 0}
          icon={<FiBarChart2 />}
          color="orange"
        />
        <StatsCard
          title="Números Activos"
          value={estadisticas?.numerosActivos || 0}
          icon={<FiSmartphone />}
          color="purple"
        />
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h3>Registros por Número de WhatsApp</h3>
          <BarChart
            data={estadisticas?.registros_por_numero || []}
            dataKey="cantidad"
            categoryKey="numero"
            color="#4f46e5"
          />
        </div>

        <div className="chart-card">
          <h3>Registros por Estado</h3>
          <BarChart
            data={estadisticas?.registros_por_estado.slice(0, 10) || []}
            dataKey="cantidad"
            categoryKey="estado"
            color="#10b981"
          />
        </div>
      </div>

      {usuario?.rol === 'admin' && (
        <div className="admin-section">
          <h3>Números Asignados por Usuario</h3>
          <p className="info-text">
            Esta sección mostraría la distribución de números por usuario
          </p>
        </div>
      )}
    </div>
  );
};
