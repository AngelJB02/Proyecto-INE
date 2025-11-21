import { useState, useEffect } from 'react';
import type { EstadisticasGeneral, FiltrosEstadisticas, Usuario, RegistroINE } from '../types';
import { estadisticasService, registrosService } from '../services/api';
import { StatsCard } from '../components/StatsCard';
import { BarChart } from '../components/BarChart';
import { format } from 'date-fns';
import { FiBarChart2, FiUser, FiMail, FiSmartphone, FiCalendar, FiArrowUp, FiStar, FiMapPin, FiFileText } from 'react-icons/fi';
import '../styles/Estadisticas.css';

export const Estadisticas = () => {
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | null>(null);
  const [empleados, setEmpleados] = useState<Usuario[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasGeneral | null>(null);
  const [registrosRecientes, setRegistrosRecientes] = useState<RegistroINE[]>([]);
  const [filtros, setFiltros] = useState<FiltrosEstadisticas>({});
  const [isLoading, setIsLoading] = useState(true);

  // Datos dummy para empleados
  const empleadosDummy: Usuario[] = [
    { id: 1, username: 'juan.perez', nombre: 'Juan', apellido: 'Pérez', email: 'juan@ine.com', nombres_asignados: ['+52551234567'], rol: 'usuario' },
    { id: 2, username: 'maria.lopez', nombre: 'María', apellido: 'López', email: 'maria@ine.com', nombres_asignados: ['+52559876543'], rol: 'usuario' },
    { id: 3, username: 'carlos.martinez', nombre: 'Carlos', apellido: 'Martínez', email: 'carlos@ine.com', nombres_asignados: ['+52553334455'], rol: 'usuario' },
  ];

  // Datos dummy para registros recientes
  const getRegistrosDummy = (empleadoId: number): RegistroINE[] => {
    const baseRegistros = [
      { id: 1, from_number: '+52551234567', Nombre: 'María González López', Domicilio: 'Calle Reforma 123, CDMX', ClaveDeElector: 'GOLM850101', CURP: 'GOLM850101HDFNPR01', AnioRegistro: '2024', FechaNacimiento: new Date('1985-01-01'), Seccion: '0123', Vigencia: 'Vigente', fecha_registro: new Date('2024-11-18'), nombre_contacto: 'Juan Pérez' },
      { id: 2, from_number: '+52559876543', Nombre: 'José Hernández Silva', Domicilio: 'Calle Juárez 147, CDMX', ClaveDeElector: 'HEMJ880912', CURP: 'HEMJ880912HDFNSL06', AnioRegistro: '2024', FechaNacimiento: new Date('1988-09-12'), Seccion: '0147', Vigencia: 'Vigente', fecha_registro: new Date('2024-11-17'), nombre_contacto: 'María López' },
      { id: 3, from_number: '+52553334455', Nombre: 'Isabel Ramírez Soto', Domicilio: 'Calle Londres 963, CDMX', ClaveDeElector: 'RAII940108', CURP: 'RAII940108HDFNST11', AnioRegistro: '2024', FechaNacimiento: new Date('1994-01-08'), Seccion: '0963', Vigencia: 'Vigente', fecha_registro: new Date('2024-11-16'), nombre_contacto: 'Carlos Martínez' },
    ];
    return baseRegistros.filter((_, index) => index === empleadoId - 1);
  };

  // Datos dummy para estadísticas individuales
  const getEstadisticasDummy = (empleadoId: number): EstadisticasGeneral => {
    const bases = {
      1: { total: 12, hoy: 2, mes: 8 },
      2: { total: 10, hoy: 1, mes: 6 },
      3: { total: 6, hoy: 0, mes: 2 }
    };
    
    const base = bases[empleadoId as keyof typeof bases] || { total: 0, hoy: 0, mes: 0 };
    
    return {
      totalRegistros: base.total,
      registrosHoy: base.hoy,
      registrosMes: base.mes,
      numerosActivos: 1,
      registros_por_numero: [
        { numero: empleados.find(e => e.id === empleadoId)?.nombres_asignados[0] || '', cantidad: base.total }
      ],
      registros_por_estado: [
        { estado: 'Ciudad de México', cantidad: Math.floor(base.total * 0.7) },
        { estado: 'Estado de México', cantidad: Math.floor(base.total * 0.2) },
        { estado: 'Jalisco', cantidad: Math.floor(base.total * 0.1) },
      ],
      registros_por_seccion: [
        { seccion: '0123', cantidad: Math.floor(base.total * 0.3) },
        { seccion: '0456', cantidad: Math.floor(base.total * 0.25) },
        { seccion: '0789', cantidad: Math.floor(base.total * 0.2) },
        { seccion: '0321', cantidad: Math.floor(base.total * 0.15) },
        { seccion: '0654', cantidad: Math.floor(base.total * 0.1) },
      ],
    };
  };

  useEffect(() => {
    cargarEmpleados();
  }, []);

  useEffect(() => {
    if (empleadoSeleccionado) {
      cargarEstadisticas();
      cargarRegistrosRecientes();
    } else {
      setEstadisticas(null);
      setRegistrosRecientes([]);
    }
  }, [empleadoSeleccionado, filtros]);

  const cargarEmpleados = async () => {
    try {
      // TODO: Implementar llamada real a API para obtener usuarios
      setEmpleados(empleadosDummy);
      setIsLoading(false);
    } catch (error) {
      console.error('Error cargando empleados:', error);
      setEmpleados(empleadosDummy);
      setIsLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    if (!empleadoSeleccionado) return;
    
    try {
      setIsLoading(true);
      const data = await estadisticasService.getGeneral({ 
        ...filtros, 
        userId: empleadoSeleccionado 
      });
      setEstadisticas(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      // Usar datos dummy si falla la API
      setEstadisticas(getEstadisticasDummy(empleadoSeleccionado));
    } finally {
      setIsLoading(false);
    }
  };

  const cargarRegistrosRecientes = async () => {
    if (!empleadoSeleccionado) return;
    
    try {
      // TODO: Implementar llamada real para registros por usuario
      setRegistrosRecientes(getRegistrosDummy(empleadoSeleccionado));
    } catch (error) {
      console.error('Error cargando registros recientes:', error);
      setRegistrosRecientes(getRegistrosDummy(empleadoSeleccionado));
    }
  };

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor || undefined
    }));
  };

  const handleEmpleadoChange = (empleadoId: string) => {
    setEmpleadoSeleccionado(empleadoId ? parseInt(empleadoId) : null);
    setFiltros({}); // Limpiar filtros al cambiar empleado
  };

  const empleadoActual = empleados.find(e => e.id === empleadoSeleccionado);

  return (
    <div className="estadisticas-page">
      <h1>
        <FiBarChart2 style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
        Estadísticas por Empleado
      </h1>
      
      {/* Selector de empleado */}
      <div className="empleado-selector">
        <label htmlFor="empleado-select">Seleccionar Empleado:</label>
        <select
          id="empleado-select"
          value={empleadoSeleccionado || ''}
          onChange={(e) => handleEmpleadoChange(e.target.value)}
          className="empleado-dropdown"
        >
          <option value="">-- Selecciona un empleado --</option>
          {empleados.map(empleado => (
            <option key={empleado.id} value={empleado.id}>
              {empleado.nombre} {empleado.apellido} ({empleado.username})
            </option>
          ))}
        </select>
      </div>

      {!empleadoSeleccionado ? (
        <div className="empty-state">
          <p>
            <FiUser style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Selecciona un empleado para ver sus estadísticas detalladas
          </p>
        </div>
      ) : isLoading ? (
        <div className="loading">Cargando estadísticas del empleado...</div>
      ) : (
        <>
          {/* Información del empleado */}
          <div className="empleado-info">
            <h2>
              <FiUser style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              {empleadoActual?.nombre} {empleadoActual?.apellido}
            </h2>
            <p className="empleado-details">
              <span>
                <FiMail style={{ display: 'inline-block', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                {empleadoActual?.email}
              </span>
              <span>
                <FiSmartphone style={{ display: 'inline-block', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                {empleadoActual?.nombres_asignados.join(', ')}
              </span>
            </p>
          </div>
          
          <div className="filtros-container">
            <div className="filtro-group">
              <label>Fecha Inicio</label>
              <input
                type="date"
                onChange={(e) => handleFiltroChange('fecha_inicio', e.target.value)}
              />
            </div>
            
            <div className="filtro-group">
              <label>Fecha Fin</label>
              <input
                type="date"
                onChange={(e) => handleFiltroChange('fecha_fin', e.target.value)}
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
                <StatsCard 
                  title="Promedio Diario" 
                  value={Math.round(estadisticas.registrosMes / 30)} 
                  icon={<FiStar />} 
                  color="purple" 
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
