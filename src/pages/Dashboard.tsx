import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockEstadisticas } from '../services/mockData';
import { StatsCard } from '.././components/StatsCard';
import { BarChart } from '.././components/BarChart';
import type { EstadisticasGeneral } from '../types';
import '../styles/Dashboard.css';

export const Dashboard = () => {
  const { usuario } = useAuth();
  const [estadisticas, setEstadisticas] = useState<EstadisticasGeneral | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    // Simular carga de datos
    setIsLoading(true);
    setTimeout(() => {
      setEstadisticas(mockEstadisticas);
      setIsLoading(false);
    }, 500);
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
          value={estadisticas?.total_registros || 0}
          icon="📋"
          color="blue"
        />
        <StatsCard
          title="Registros Hoy"
          value={estadisticas?.registros_hoy || 0}
          icon="📅"
          color="green"
        />
        <StatsCard
          title="Registros Este Mes"
          value={estadisticas?.registros_mes || 0}
          icon="📊"
          color="orange"
        />
        <StatsCard
          title="Números Activos"
          value={estadisticas?.registros_por_numero.length || 0}
          icon="📱"
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
