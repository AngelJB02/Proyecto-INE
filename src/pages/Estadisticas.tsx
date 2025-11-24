import { useState, useEffect } from 'react';
import type { EstadisticasGeneral, FiltrosEstadisticas, RegistroINE, NumeroAsignado } from '../types';
import { estadisticasService, registrosService } from '../services/api';
import { StatsCard } from '../components/StatsCard';
import { BarChart } from '../components/BarChart';
import { format } from 'date-fns';
import { FiBarChart2, FiUser, FiSmartphone, FiCalendar, FiArrowUp, FiMapPin, FiFileText } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import '../styles/Estadisticas.css';

export const Estadisticas = () => {
  const { usuario: usuarioActual } = useAuth();
  const [numeroSeleccionado, setNumeroSeleccionado] = useState<string | null>(null);
  const [misNumeros, setMisNumeros] = useState<NumeroAsignado[]>([]); // Números del cliente
  const [todosLosNumeros, setTodosLosNumeros] = useState<{ numero: string; nombre: string }[]>([]); // Para admin
  const [estadisticas, setEstadisticas] = useState<EstadisticasGeneral | null>(null);
  const [registrosRecientes, setRegistrosRecientes] = useState<RegistroINE[]>([]);
  const [filtros, setFiltros] = useState<FiltrosEstadisticas>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoTiempo, setPeriodoTiempo] = useState<string>('todo');

  const esAdmin = usuarioActual?.rol === 'admin';

  useEffect(() => {
    if (esAdmin) {
      // Si es admin, cargar estadísticas generales
      cargarEstadisticasGenerales();
    } else {
      // Si es usuario normal (cliente), cargar sus números/empleados
      cargarMisNumeros();
    }
  }, [esAdmin, usuarioActual]);

  useEffect(() => {
    if (numeroSeleccionado) {
      cargarEstadisticas();
      cargarRegistrosRecientes();
    } else if (esAdmin) {
      // Admin sin filtro ve todo
      cargarEstadisticas();
      cargarRegistrosRecientes();
    } else {
      setEstadisticas(null);
      setRegistrosRecientes([]);
    }
  }, [numeroSeleccionado, filtros]);

  const cargarEstadisticasGenerales = async () => {
    try {
      console.log('🔄 Iniciando carga de estadísticas generales (admin)...');
      setIsLoading(true);
      setError(null);
      
      // Cargar estadísticas generales sin filtro
      const stats = await estadisticasService.getGeneral();
      setEstadisticas(stats);
      
      // Obtener lista de números únicos para el filtro
      if (stats.registros_por_numero && stats.registros_por_numero.length > 0) {
        const numeros = stats.registros_por_numero.map(item => ({
          numero: item.numero,
          nombre: item.numero
        }));
        setTodosLosNumeros(numeros);
      }
      
      console.log('✅ Estadísticas generales cargadas');
    } catch (error: any) {
      console.error('❌ Error cargando estadísticas generales:', error);
      setError('Error al cargar las estadísticas generales.');
    } finally {
      setIsLoading(false);
    }
  };

  const cargarMisNumeros = async () => {
    try {
      console.log('🔄 Iniciando carga de mis números...');
      setIsLoading(true);
      setError(null);
      const numeros = await registrosService.getMisNumeros();
      console.log('✅ Números cargados:', numeros);
      setMisNumeros(numeros);
    } catch (error: any) {
      console.error('❌ Error cargando números:', error);
      console.error('Error completo:', error.response?.data || error.message);
      setError('Error al cargar tus empleados/números.');
    } finally {
      setIsLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let data: EstadisticasGeneral | undefined;
      if (esAdmin) {
        // Admin puede ver todo o filtrar por número específico
        data = await estadisticasService.getGeneral({ 
          ...filtros,
          ...(numeroSeleccionado ? { from_number: numeroSeleccionado } : {})
        });
      } else if (numeroSeleccionado) {
        // Cliente ve estadísticas de un número específico
        data = await estadisticasService.getGeneral({ 
          ...filtros,
          from_number: numeroSeleccionado
        });
      }
      
      setEstadisticas(data || null);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setError('Error al cargar las estadísticas');
      setEstadisticas(null);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarRegistrosRecientes = async () => {
    try {
      setError(null);
      
      let registros;
      if (esAdmin) {
        // Admin puede ver todos los registros o filtrar por número
        const response = await registrosService.getAll({ 
          page: 1,
          ...(numeroSeleccionado ? { from_number: numeroSeleccionado } : {})
        });
        registros = response.data.slice(0, 10);
      } else if (numeroSeleccionado) {
        // Cliente ve registros de un número específico
        const response = await registrosService.getAll({ page: 1, from_number: numeroSeleccionado });
        registros = response.data.slice(0, 10);
      }
      
      setRegistrosRecientes(registros || []);
    } catch (error) {
      console.error('Error cargando registros recientes:', error);
      setError('Error al cargar los registros recientes');
      setRegistrosRecientes([]);
    }
  };

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor || undefined
    }));
  };

  const handlePeriodoTiempoChange = (periodo: string) => {
    setPeriodoTiempo(periodo);
    
    const hoy = new Date();
    let fechaInicio: string | undefined;
    let fechaFin: string | undefined;

    switch (periodo) {
      case 'hoy':
        fechaInicio = hoy.toISOString().split('T')[0];
        fechaFin = hoy.toISOString().split('T')[0];
        break;
      
      case 'ayer':
        const ayer = new Date(hoy);
        ayer.setDate(ayer.getDate() - 1);
        fechaInicio = ayer.toISOString().split('T')[0];
        fechaFin = ayer.toISOString().split('T')[0];
        break;
      
      case 'ultimos7':
        const hace7dias = new Date(hoy);
        hace7dias.setDate(hace7dias.getDate() - 7);
        fechaInicio = hace7dias.toISOString().split('T')[0];
        fechaFin = hoy.toISOString().split('T')[0];
        break;
      
      case 'ultimos30':
        const hace30dias = new Date(hoy);
        hace30dias.setDate(hace30dias.getDate() - 30);
        fechaInicio = hace30dias.toISOString().split('T')[0];
        fechaFin = hoy.toISOString().split('T')[0];
        break;
      
      case 'estaSemana':
        const inicioSemana = new Date(hoy);
        const diaSemana = inicioSemana.getDay();
        const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
        inicioSemana.setDate(inicioSemana.getDate() - diasHastaLunes);
        fechaInicio = inicioSemana.toISOString().split('T')[0];
        fechaFin = hoy.toISOString().split('T')[0];
        break;
      
      case 'esteMes':
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fechaInicio = inicioMes.toISOString().split('T')[0];
        fechaFin = hoy.toISOString().split('T')[0];
        break;
      
      case 'mesAnterior':
        const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        fechaInicio = inicioMesAnterior.toISOString().split('T')[0];
        fechaFin = finMesAnterior.toISOString().split('T')[0];
        break;
      
      case 'todo':
      default:
        fechaInicio = undefined;
        fechaFin = undefined;
        break;
    }

    setFiltros(prev => ({
      ...prev,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin
    }));
  };

  const handleNumeroChange = (numero: string) => {
    setNumeroSeleccionado(numero || null);
    setFiltros({}); // Limpiar filtros
    setPeriodoTiempo('todo'); // Resetear período de tiempo
  };

  const numeroMostrado = esAdmin 
    ? todosLosNumeros.find(n => n.numero === numeroSeleccionado)
    : misNumeros.find(n => n.numero_whatsapp === numeroSeleccionado);

  return (
    <div className="estadisticas-page">
      <h1>
        <FiBarChart2 style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
        {esAdmin ? 'Estadísticas Generales' : 'Mis Estadísticas'}
      </h1>
      
      {/* Selector de número/empleado - para admins (opcional, para filtrar) */}
      {esAdmin && todosLosNumeros.length > 0 && (
        <div className="empleado-selector">
          <label htmlFor="numero-select">Filtrar por Número/Empleado (Opcional):</label>
          <select
            id="numero-select"
            value={numeroSeleccionado || ''}
            onChange={(e) => handleNumeroChange(e.target.value)}
            className="empleado-dropdown"
          >
            <option value="">-- Todos los registros --</option>
            {todosLosNumeros.map((numero, index) => (
              <option key={index} value={numero.numero}>
                {numero.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selector de número/empleado - solo para clientes (requerido) */}
      {!esAdmin && (
        <div className="empleado-selector">
          <label htmlFor="numero-select">Seleccionar Empleado/Número:</label>
          {isLoading && misNumeros.length === 0 ? (
            <div className="loading-empleados">Cargando empleados...</div>
          ) : error && misNumeros.length === 0 ? (
            <div className="error-empleados">
              {error}
              <button onClick={cargarMisNumeros} className="btn-reintentar">Reintentar</button>
            </div>
          ) : (
            <>
              <select
                id="numero-select"
                value={numeroSeleccionado || ''}
                onChange={(e) => handleNumeroChange(e.target.value)}
                className="empleado-dropdown"
                disabled={misNumeros.length === 0}
              >
                <option value="">-- Selecciona un empleado --</option>
                {misNumeros.map(numero => (
                  <option key={numero.id} value={numero.numero_whatsapp}>
                    {numero.nombre_contacto || numero.numero_whatsapp}
                  </option>
                ))}
              </select>
              {misNumeros.length === 0 && (
                <p className="no-empleados">No tienes empleados asignados</p>
              )}
            </>
          )}
        </div>
      )}

      {!numeroSeleccionado && !esAdmin ? (
        <div className="empty-state">
          <p>
            <FiUser style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Selecciona un empleado para ver sus estadísticas detalladas
          </p>
        </div>
      ) : isLoading ? (
        <div className="loading">Cargando estadísticas...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          {/* Información del empleado/número */}
          {(numeroSeleccionado || !esAdmin) && (
            <div className="empleado-info">
              <h2>
                <FiUser style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                {esAdmin 
                  ? (numeroMostrado ? (numeroMostrado as any).nombre : 'Empleado/Número')
                  : (numeroMostrado ? (numeroMostrado as NumeroAsignado).nombre_contacto || (numeroMostrado as NumeroAsignado).numero_whatsapp : 'Empleado')
                }
              </h2>
              <p className="empleado-details">
                <span>
                  <FiSmartphone style={{ display: 'inline-block', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                  {numeroSeleccionado || 'N/A'}
                </span>
              </p>
            </div>
          )}
          
          <div className="filtros-container">
            <div className="filtro-group filtro-periodo">
              <label>Período de Tiempo</label>
              <select
                value={periodoTiempo}
                onChange={(e) => handlePeriodoTiempoChange(e.target.value)}
                className="select-periodo"
              >
                <option value="todo">Todo el tiempo</option>
                <option value="hoy">Hoy</option>
                <option value="ayer">Ayer</option>
                <option value="ultimos7">Últimos 7 días</option>
                <option value="ultimos30">Últimos 30 días</option>
                <option value="estaSemana">Esta semana</option>
                <option value="esteMes">Este mes</option>
                <option value="mesAnterior">Mes anterior</option>
              </select>
            </div>

            <div className="filtro-group">
              <label>Fecha Inicio</label>
              <input
                type="date"
                value={filtros.fecha_inicio || ''}
                onChange={(e) => {
                  handleFiltroChange('fecha_inicio', e.target.value);
                  setPeriodoTiempo(''); // Limpiar período predefinido
                }}
              />
            </div>
            
            <div className="filtro-group">
              <label>Fecha Fin</label>
              <input
                type="date"
                value={filtros.fecha_fin || ''}
                onChange={(e) => {
                  handleFiltroChange('fecha_fin', e.target.value);
                  setPeriodoTiempo(''); // Limpiar período predefinido
                }}
              />
            </div>
          </div>

          {estadisticas && (
            <>
              {/* Tarjetas de estadísticas del empleado */}
              <div className="stats-cards-container">
                <StatsCard 
                  title="Total Registros" 
                  value={estadisticas.totalRegistros} 
                  icon={<FiBarChart2 />} 
                  color="blue" 
                />
                <StatsCard 
                  title="Registros Hoy" 
                  value={estadisticas.registrosHoy} 
                  icon={<FiCalendar />} 
                  color="green" 
                />
                <StatsCard 
                  title="Este Mes" 
                  value={estadisticas.registrosMes} 
                  icon={<FiArrowUp />} 
                  color="orange" 
                />
              </div>

              {/* Gráficos del empleado */}
              <div className="charts-container">
                <div className="chart-section">
                  <h2>
                    <FiMapPin style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Distribución por Estado
                  </h2>
                  <BarChart 
                    data={estadisticas.registros_por_estado} 
                    dataKey="cantidad" 
                    categoryKey="estado" 
                    color="#8884d8" 
                  />
                  
                  {/* Tabla de porcentajes por estado */}
                  <div className="porcentajes-tabla" style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                      Porcentaje por Estado
                    </h3>
                    <table className="tabla-porcentajes">
                      <thead>
                        <tr>
                          <th>Estado</th>
                          <th>Cantidad</th>
                          <th>Porcentaje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estadisticas.registros_por_estado.map((item, index) => {
                          const porcentaje = estadisticas.totalRegistros > 0 
                            ? ((item.cantidad / estadisticas.totalRegistros) * 100).toFixed(1)
                            : '0.0';
                          return (
                            <tr key={index}>
                              <td>{item.estado}</td>
                              <td>{item.cantidad}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ 
                                    flex: 1, 
                                    height: '8px', 
                                    backgroundColor: '#e5e7eb', 
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{ 
                                      width: `${porcentaje}%`, 
                                      height: '100%', 
                                      backgroundColor: '#8884d8',
                                      transition: 'width 0.3s ease'
                                    }}></div>
                                  </div>
                                  <span style={{ fontWeight: '600', minWidth: '50px' }}>
                                    {porcentaje}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="chart-section">
                  <h2>
                    <FiFileText style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Registros por Sección
                  </h2>
                  <BarChart 
                    data={estadisticas.registros_por_seccion.slice(0, 8)} 
                    dataKey="cantidad" 
                    categoryKey="seccion" 
                    color="#82ca9d" 
                  />
                </div>
              </div>

              {/* Registros recientes */}
              <div className="registros-recientes">
                <h2>
                  <FiFileText style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Registros Recientes
                </h2>
                <div className="tabla-container">
                  <table className="tabla-registros">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>CURP</th>
                        <th>Sección</th>
                        <th>Fecha Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrosRecientes.map((registro) => (
                        <tr key={registro.id}>
                          <td>{registro.Nombre || 'N/A'}</td>
                          <td>{registro.CURP || 'N/A'}</td>
                          <td>{registro.Seccion || 'N/A'}</td>
                          <td>{format(new Date(registro.fecha_registro), 'dd/MM/yyyy HH:mm')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {registrosRecientes.length === 0 && (
                    <p className="no-data">No se encontraron registros recientes</p>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
