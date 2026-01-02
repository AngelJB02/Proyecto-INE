import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { estadisticasService, adminService } from '../../services/api';
import { StatsCard } from '../../components/StatsCard';
import { BarChart } from '../../components/BarChart';
import type { EstadisticasGeneral, NumeroAsignado, UsuarioCompleto } from '../../types';
import { FiClipboard, FiCalendar, FiBarChart2, FiSmartphone } from 'react-icons/fi';
import '../../styles/Dashboard.css';

export const AdminDashboard = () => {
  const { usuario } = useAuth();
  const [estadisticas, setEstadisticas] = useState<EstadisticasGeneral | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoaded = useRef(false);
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [numerosPorUsuario, setNumerosPorUsuario] = useState<Record<number, NumeroAsignado[]>>({});
  const [numerosSinCliente, setNumerosSinCliente] = useState<string[]>([]);
  const sinClienteSet = new Set(numerosSinCliente);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      cargarEstadisticasAdmin();
      cargarUsuariosYNumeros();
    }
  }, []);

  const cargarEstadisticasAdmin = async () => {
    try {
      setIsLoading(true);
      const data = await estadisticasService.getGeneralAdmin();
      setEstadisticas(data);
    } catch (error) {
      console.error('Error cargando estadísticas (admin):', error);
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

  const normalizarNumero = (n: any) => {
    if (!n) return '';
    return String(n).trim();
  };

  const cargarUsuariosYNumeros = async () => {
    try {
      const listaUsuarios = await adminService.getUsuarios();
      setUsuarios(listaUsuarios);
      const numerosPorUsuarioTemp: Record<number, NumeroAsignado[]> = {};
      await Promise.all(
        listaUsuarios.map(async (u) => {
          try {
            const nums = await adminService.getNumerosUsuario(u.id);
            numerosPorUsuarioTemp[u.id] = nums || [];
          } catch {
            numerosPorUsuarioTemp[u.id] = [];
          }
        })
      );
      setNumerosPorUsuario(numerosPorUsuarioTemp);

      const asignadosSet = new Set<string>();
      Object.values(numerosPorUsuarioTemp).forEach((arr) => {
        arr.forEach((num) => asignadosSet.add(normalizarNumero(num.numero_whatsapp)));
      });
      const observadosSet = new Set<string>();
      (estadisticas?.registros_por_numero || []).forEach((item: any) => {
        const obs = normalizarNumero(item.numero_whatsapp || item.numero);
        if (obs) observadosSet.add(obs);
      });
      const sinCliente: string[] = [];
      observadosSet.forEach((num) => {
        if (!asignadosSet.has(num)) sinCliente.push(num);
      });
      setNumerosSinCliente(sinCliente);
    } catch (e) {
      console.error('Error cargando usuarios/números:', e);
      setUsuarios([]);
      setNumerosPorUsuario({});
      setNumerosSinCliente([]);
    }
  };

  useEffect(() => {
    const asignadosSet = new Set<string>();
    Object.values(numerosPorUsuario).forEach((arr) => {
      arr.forEach((num) => asignadosSet.add(normalizarNumero(num.numero_whatsapp)));
    });
    const observadosSet = new Set<string>();
    (estadisticas?.registros_por_numero || []).forEach((item: any) => {
      const obs = normalizarNumero(item.numero_whatsapp || item.numero);
      if (obs) observadosSet.add(obs);
    });
    const sinCliente: string[] = [];
    observadosSet.forEach((num) => {
      if (!asignadosSet.has(num)) sinCliente.push(num);
    });
    setNumerosSinCliente(sinCliente);
  }, [estadisticas, numerosPorUsuario]);

  if (isLoading) {
    return <div className="loading">Cargando estadísticas...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard (Admin)</h1>
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
            isHighlighted={(item: any) => {
              const key = normalizarNumero(item?.numero_whatsapp ?? item?.numero);
              return key ? sinClienteSet.has(key) : false;
            }}
            highlightColor="#ef4444"
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

      <div className="admin-section" style={{ marginTop: '2rem' }}>
        <h3>Números Asignados por Usuario</h3>
        <p className="info-text">
          Distribución de números asignados por cada usuario. Los números observados en registros pero sin cliente se destacan como “Sin Cliente”.
        </p>
        
        {/* Vista Desktop (Tabla) */}
        <div className="tabla-container desktop-only" style={{ marginTop: '1rem' }}>
          <table className="tabla-registros">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Números Asignados</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => {
                const nums = numerosPorUsuario[u.id] || [];
                return (
                  <tr key={u.id}>
                    <td>
                      {u.username || u.nombre || `Usuario ${u.id}`}
                      <span
                        style={{
                          marginLeft: '8px',
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#e5e7eb',
                          color: '#374151',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        {nums.length}
                      </span>
                    </td>
                    <td>
                      {nums.length === 0 ? (
                        <span style={{ color: '#9ca3af' }}>Sin números asignados</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {nums.map(n => (
                            <span
                              key={n.id}
                              style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                backgroundColor: '#eef2ff',
                                color: '#3730a3',
                                fontSize: '0.85rem'
                              }}
                            >
                              {n.nombre_contacto || n.numero_whatsapp}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {numerosSinCliente.length > 0 && (
                <tr>
                  <td style={{ fontWeight: 600, color: '#b91c1c' }}>
                    Sin Cliente
                    <span
                      style={{
                        marginLeft: '8px',
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      {numerosSinCliente.length}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {numerosSinCliente.map(num => (
                        <span
                          key={num}
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            fontSize: '0.85rem'
                          }}
                        >
                          {num}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vista Mobile (Cards) */}
        <div className="mobile-cards-grid mobile-only">
          {usuarios.map(u => {
            const nums = numerosPorUsuario[u.id] || [];
            return (
              <div key={u.id} className="mobile-card">
                <div className="mobile-card-header">
                  <div className="mobile-card-title">
                    <span className="user-name">{u.username || u.nombre || `Usuario ${u.id}`}</span>
                    <span className="count-badge">{nums.length}</span>
                  </div>
                </div>
                <div className="mobile-card-content">
                  {nums.length === 0 ? (
                    <p className="empty-text">Sin números asignados</p>
                  ) : (
                    <div className="tags-container">
                      {nums.map(n => (
                        <span key={n.id} className="tag tag-blue">
                          {n.nombre_contacto || n.numero_whatsapp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {numerosSinCliente.length > 0 && (
            <div className="mobile-card warning-card">
              <div className="mobile-card-header">
                <div className="mobile-card-title">
                  <span className="user-name text-red">Sin Cliente</span>
                  <span className="count-badge badge-red">{numerosSinCliente.length}</span>
                </div>
              </div>
              <div className="mobile-card-content">
                <div className="tags-container">
                  {numerosSinCliente.map(num => (
                    <span key={num} className="tag tag-red">
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
