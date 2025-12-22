import { useState, useEffect } from 'react';
import type { UsuarioCompleto, EstadisticasGeneral, RegistroINE, NumeroAsignado, CrearUsuarioData, AsignarNumeroData } from '../types';
import { adminService } from '../services/api';
import { StatsCard } from '../components/StatsCard';
import { BarChart } from '../components/BarChart';
import { format } from 'date-fns';
import { 
  FiBarChart2, 
  FiUser, 
  FiMail, 
  FiSmartphone, 
  FiCalendar, 
  FiArrowUp, 
  FiStar, 
  FiMapPin, 
  FiFileText,
  FiPlus,
  FiTrash2,
  FiX,
  FiUsers,
  FiSettings
} from 'react-icons/fi';
import '../styles/Admin.css';

export const Admin = () => {
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UsuarioCompleto | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasGeneral | null>(null);
  const [registrosRecientes, setRegistrosRecientes] = useState<RegistroINE[]>([]);
  const [numerosAsignados, setNumerosAsignados] = useState<NumeroAsignado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCrearUsuario, setShowCrearUsuario] = useState(false);
  const [showGestionarNumeros, setShowGestionarNumeros] = useState(false);
  const [usuarioGestionando, setUsuarioGestionando] = useState<UsuarioCompleto | null>(null);

  // Formulario crear usuario
  const [formUsuario, setFormUsuario] = useState<CrearUsuarioData>({
    username: '',
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    rol: 'usuario'
  });

  // Formulario asignar número
  const [formNumero, setFormNumero] = useState<AsignarNumeroData>({
    numero_whatsapp: '',
    nombre_contacto: ''
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  useEffect(() => {
    if (usuarioSeleccionado) {
      cargarEstadisticas();
      cargarRegistrosRecientes();
    } else {
      setEstadisticas(null);
      setRegistrosRecientes([]);
    }
  }, [usuarioSeleccionado]);

  useEffect(() => {
    if (usuarioGestionando) {
      cargarNumerosAsignados();
    }
  }, [usuarioGestionando]);

  const cargarUsuarios = async () => {
    try {
      setIsLoading(true);
      const data = await adminService.getUsuarios();
      setUsuarios(data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      alert('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    if (!usuarioSeleccionado) return;
    
    try {
      const data = await adminService.getEstadisticasUsuario(usuarioSeleccionado.id);
      setEstadisticas(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      alert('Error al cargar estadísticas');
    }
  };

  const cargarRegistrosRecientes = async () => {
    if (!usuarioSeleccionado) return;
    
    try {
      const data = await adminService.getRegistrosUsuario(usuarioSeleccionado.id, 10);
      setRegistrosRecientes(data);
    } catch (error) {
      console.error('Error cargando registros recientes:', error);
    }
  };

  const cargarNumerosAsignados = async () => {
    if (!usuarioGestionando) return;
    
    try {
      const data = await adminService.getNumerosUsuario(usuarioGestionando.id);
      setNumerosAsignados(data);
    } catch (error) {
      console.error('Error cargando números asignados:', error);
      alert('Error al cargar números asignados');
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.crearUsuario(formUsuario);
      alert('Usuario creado exitosamente');
      setShowCrearUsuario(false);
      setFormUsuario({
        username: '',
        email: '',
        password: '',
        nombre: '',
        apellido: '',
        rol: 'usuario'
      });
      cargarUsuarios();
    } catch (error: any) {
      console.error('Error creando usuario:', error);
      alert(error.response?.data?.msg || 'Error al crear usuario');
    }
  };

  const handleAsignarNumero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioGestionando) return;

    try {
      await adminService.asignarNumero(usuarioGestionando.id, formNumero);
      alert('Número asignado exitosamente');
      setFormNumero({ numero_whatsapp: '', nombre_contacto: '' });
      cargarNumerosAsignados();
      cargarUsuarios(); // Actualizar lista de usuarios
    } catch (error: any) {
      console.error('Error asignando número:', error);
      alert(error.response?.data?.msg || 'Error al asignar número');
    }
  };

  const handleEliminarNumero = async (numeroId: number) => {
    if (!usuarioGestionando) return;
    if (!confirm('¿Estás seguro de eliminar este número?')) return;

    try {
      await adminService.eliminarNumero(usuarioGestionando.id, numeroId);
      alert('Número eliminado exitosamente');
      cargarNumerosAsignados();
      cargarUsuarios();
    } catch (error: any) {
      console.error('Error eliminando número:', error);
      alert(error.response?.data?.msg || 'Error al eliminar número');
    }
  };

  const handleVerEstadisticas = (usuario: UsuarioCompleto) => {
    setUsuarioSeleccionado(usuario);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGestionarNumeros = (usuario: UsuarioCompleto) => {
    setUsuarioGestionando(usuario);
    setShowGestionarNumeros(true);
  };

  const handleToggleUsuario = async (usuario: UsuarioCompleto) => {
    try {
      await adminService.actualizarUsuario(usuario.id, { activo: !usuario.activo });
      alert(`Usuario ${usuario.activo ? 'desactivado' : 'activado'} exitosamente`);
      cargarUsuarios();
    } catch (error: any) {
      console.error('Error actualizando usuario:', error);
      alert(error.response?.data?.msg || 'Error al actualizar usuario');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>
          <FiSettings style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Administración de Usuarios
        </h1>
        <button 
          className="btn-crear-usuario"
          onClick={() => setShowCrearUsuario(true)}
        >
          <FiPlus /> Crear Usuario
        </button>
      </div>

      {/* Lista de Usuarios */}
      <div className="usuarios-section">
        <h2>
          <FiUsers style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Lista de Empleados
        </h2>
        
        {isLoading ? (
          <div className="loading">Cargando usuarios...</div>
        ) : (
          <div className="usuarios-table-container">
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Números Asignados</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className={usuarioSeleccionado?.id === usuario.id ? 'selected' : ''}>
                    <td>{usuario.username}</td>
                    <td>{usuario.nombre} {usuario.apellido}</td>
                    <td>{usuario.email}</td>
                    <td>
                      <span className={`badge badge-${usuario.rol}`}>
                        {usuario.rol}
                      </span>
                    </td>
                    <td>{usuario.nombres_asignados?.length || 0}</td>
                    <td>
                      <span className={`badge badge-${usuario.activo ? 'activo' : 'inactivo'}`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="acciones-buttons">
                        <button
                          className="btn-accion btn-ver"
                          onClick={() => handleVerEstadisticas(usuario)}
                          title="Ver estadísticas"
                        >
                          <FiBarChart2 />
                        </button>
                        <button
                          className="btn-accion btn-gestionar"
                          onClick={() => handleGestionarNumeros(usuario)}
                          title="Gestionar números"
                        >
                          <FiSmartphone />
                        </button>
                        <button
                          className="btn-accion btn-toggle"
                          onClick={() => handleToggleUsuario(usuario)}
                          title={usuario.activo ? 'Desactivar' : 'Activar'}
                        >
                          {usuario.activo ? <FiX /> : <FiPlus />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Estadísticas del Usuario Seleccionado */}
      {usuarioSeleccionado && estadisticas && (
        <div className="estadisticas-section">
          <div className="usuario-info-header">
            <h2>
              <FiUser style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Estadísticas de {usuarioSeleccionado.nombre} {usuarioSeleccionado.apellido}
            </h2>
            <button 
              className="btn-cerrar"
              onClick={() => setUsuarioSeleccionado(null)}
            >
              <FiX /> Cerrar
            </button>
          </div>

          <div className="usuario-details">
            <p>
              <FiMail style={{ display: 'inline-block', marginRight: '0.25rem', verticalAlign: 'middle' }} />
              {usuarioSeleccionado.email}
            </p>
            <p>
              <FiSmartphone style={{ display: 'inline-block', marginRight: '0.25rem', verticalAlign: 'middle' }} />
              {usuarioSeleccionado.nombres_asignados?.join(', ') || 'Sin números asignados'}
            </p>
          </div>

          {/* Tarjetas de estadísticas */}
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

          {/* Gráficos */}
          <div className="charts-container">
            <div className="chart-section">
              <h3>
                <FiMapPin style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Distribución por Estado
              </h3>
              <BarChart 
                data={estadisticas.registros_por_estado} 
                dataKey="cantidad" 
                categoryKey="estado" 
                color="#8884d8" 
              />
            </div>

            <div className="chart-section">
              <h3>
                <FiFileText style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Registros por Sección
              </h3>
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
            <h3>
              <FiFileText style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Registros Recientes
            </h3>
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
        </div>
      )}

      {/* Modal Crear Usuario */}
      {showCrearUsuario && (
        <div className="modal-overlay" onClick={() => setShowCrearUsuario(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Crear Nuevo Usuario</h2>
              <button className="btn-cerrar-modal" onClick={() => setShowCrearUsuario(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleCrearUsuario} className="form-crear-usuario">
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={formUsuario.username}
                  onChange={(e) => setFormUsuario({ ...formUsuario, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formUsuario.email}
                  onChange={(e) => setFormUsuario({ ...formUsuario, email: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div className="form-group">
                <label>Contraseña *</label>
                <input
                  type="password"
                  value={formUsuario.password}
                  onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={formUsuario.nombre}
                    onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    value={formUsuario.apellido}
                    onChange={(e) => setFormUsuario({ ...formUsuario, apellido: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select
                  value={formUsuario.rol}
                  onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value as 'admin' | 'usuario' })}
                >
                  <option value="usuario">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancelar" onClick={() => setShowCrearUsuario(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-guardar">
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gestionar Números */}
      {showGestionarNumeros && usuarioGestionando && (
        <div className="modal-overlay" onClick={() => setShowGestionarNumeros(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Gestionar Números - {usuarioGestionando.username}</h2>
              <button className="btn-cerrar-modal" onClick={() => setShowGestionarNumeros(false)}>
                <FiX />
              </button>
            </div>
            
            <div className="gestionar-numeros-content">
              {/* Formulario para asignar número */}
              <div className="form-asignar-numero">
                <h3>Asignar Nuevo Número</h3>
                <form onSubmit={handleAsignarNumero}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Número de WhatsApp *</label>
                      <input
                        type="text"
                        placeholder="+52551234567"
                        value={formNumero.numero_whatsapp}
                        onChange={(e) => setFormNumero({ ...formNumero, numero_whatsapp: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Nombre de Contacto</label>
                      <input
                        type="text"
                        placeholder="Ej: Operador 1"
                        value={formNumero.nombre_contacto}
                        onChange={(e) => setFormNumero({ ...formNumero, nombre_contacto: e.target.value })}
                      />
                    </div>
                    <div className="form-group form-group-button">
                      <label>&nbsp;</label>
                      <button type="submit" className="btn-asignar">
                        <FiPlus /> Asignar
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Lista de números asignados */}
              <div className="numeros-asignados-list">
                <h3>Números Asignados ({numerosAsignados.length})</h3>
                {numerosAsignados.length === 0 ? (
                  <p className="no-data">No hay números asignados</p>
                ) : (
                  <table className="numeros-table">
                    <thead>
                      <tr>
                        <th>Número</th>
                        <th>Nombre Contacto</th>
                        <th>Estado</th>
                        <th>Fecha Asignación</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {numerosAsignados.map((numero) => (
                        <tr key={numero.id}>
                          <td>{numero.numero_whatsapp}</td>
                          <td>{numero.nombre_contacto || 'N/A'}</td>
                          <td>
                            <span className={`badge badge-${numero.activo ? 'activo' : 'inactivo'}`}>
                              {numero.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td>{format(new Date(numero.fecha_asignacion), 'dd/MM/yyyy')}</td>
                          <td>
                            {numero.activo && (
                              <button
                                className="btn-eliminar-numero"
                                onClick={() => handleEliminarNumero(numero.id)}
                                title="Eliminar número"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

