import { useState, useEffect } from 'react';
import type { EstadisticasGeneral, FiltrosEstadisticas, RegistroINE } from '../../types';
import { estadisticasService, registrosService } from '../../services/api';
import { StatsCard } from '../../components/StatsCard';
import { BarChart } from '../../components/BarChart';
import { format } from 'date-fns';
import { FiBarChart2, FiSmartphone, FiCalendar, FiArrowUp, FiMapPin, FiFileText } from 'react-icons/fi';
import '../../styles/Estadisticas.css';

export const AdminEstadisticas = () => {
  const [selectorValor, setSelectorValor] = useState<string | null>(null);
  const [todosLosNumeros, setTodosLosNumeros] = useState<{ numero: string; nombre: string }[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasGeneral | null>(null);
  const [registrosRecientes, setRegistrosRecientes] = useState<RegistroINE[]>([]);
  const [filtros, setFiltros] = useState<FiltrosEstadisticas>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodoTiempo, setPeriodoTiempo] = useState<string>('todo');

  useEffect(() => {
    cargarEstadisticasGenerales();
  }, []);

  useEffect(() => {
    cargarEstadisticas();
    cargarRegistrosRecientes();
  }, [selectorValor, filtros]);

  const cargarEstadisticasGenerales = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stats = await estadisticasService.getGeneralAdmin();
      setEstadisticas(stats);
      if (stats.registros_por_numero && stats.registros_por_numero.length > 0) {
        const numeros = (stats.registros_por_numero as any[]).map((item: any) => ({
          numero: item.numero_whatsapp || item.numero,
          nombre: item.numero
        }));
        setTodosLosNumeros(numeros);
      }
    } catch (error: any) {
      setError('Error al cargar las estadísticas generales.');
    } finally {
      setIsLoading(false);
    }
  };

  const esNumero = (valor: string | null) => {
    if (!valor) return false;
    return /^\+?\d{8,}$/.test(valor);
  };

  const cargarEstadisticas = async () => {
    try {
      setIsLoading(true);
      setError(null);
      let filtro: any = { ...filtros };
      if (selectorValor) {
        if (esNumero(selectorValor)) {
          filtro.from_number = selectorValor;
        } else {
          filtro.nombre_contacto = selectorValor;
        }
      }
      const data = await estadisticasService.getGeneralAdmin(filtro);
      setEstadisticas(data || null);
    } catch (error) {
      setError('Error al cargar las estadísticas');
      setEstadisticas(null);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarRegistrosRecientes = async () => {
    try {
      setError(null);
      let filtro: any = { page: 1 };
      if (selectorValor) {
        if (esNumero(selectorValor)) {
          filtro.from_number = selectorValor;
        } else {
          filtro.nombre_contacto = selectorValor;
        }
      }
      const response = await registrosService.getAllAdmin(filtro);
      const registros = response.data.slice(0, 10);
      setRegistrosRecientes(registros || []);
    } catch (error) {
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

  const handleSelectorChange = (valor: string) => {
    setSelectorValor(valor || null);
    setFiltros({});
    setPeriodoTiempo('todo');
  };

  const numeroMostrado = todosLosNumeros.find(n => n.numero === selectorValor);

  return (
    <div className="estadisticas-page">
      <h1>
        <FiBarChart2 style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
        Estadísticas Generales
      </h1>

      {todosLosNumeros.length > 0 && (
        <div className="empleado-selector">
          <label htmlFor="numero-select">Filtrar por Número/Empleado (Opcional):</label>
          <select
            id="numero-select"
            value={selectorValor || ''}
            onChange={(e) => handleSelectorChange(e.target.value)}
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

      {isLoading ? (
        <div className="loading">Cargando estadísticas...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          {(selectorValor || numeroMostrado) && (
            <div className="empleado-info">
              <h2>
                {numeroMostrado ? numeroMostrado.nombre : 'Empleado/Número'}
              </h2>
              <p className="empleado-details">
                <span>
                  <FiSmartphone style={{ display: 'inline-block', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                  {selectorValor || 'N/A'}
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
                  setPeriodoTiempo('');
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
                  setPeriodoTiempo('');
                }}
              />
            </div>
          </div>

          {estadisticas && (
            <>
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

