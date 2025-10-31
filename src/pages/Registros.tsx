import { useState, useEffect } from 'react';
import type { RegistroINE } from '../types';
import { format } from 'date-fns';
import '../styles/Registros.css';
import { registrosService } from '../services/api';

export const Registros = () => {
  const [registros, setRegistros] = useState<RegistroINE[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [currentPage, setCurrentPage] = useState(1); // Estado para la página actual
  const [totalPages, setTotalPages] = useState(1); // Estado para el total de páginas

  useEffect(() => {
    cargarRegistros();
  }, [currentPage]); // Agregar currentPage como dependencia

  const cargarRegistros = async () => {
    setIsLoading(true);
    try {
      const response = await registrosService.getAll({ page: currentPage });
      setRegistros(response.data); // Usar la propiedad `data` de la respuesta
      setTotalPages(response.totalPages); // Actualizar el total de páginas
    } catch (error) {
      console.error('Error cargando registros:', error);
      setRegistros([]);
    } finally {
      setIsLoading(false);
    }
  };

  const registrosFiltrados = registros.filter(registro =>
    registro.Nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    registro.CURP?.toLowerCase().includes(busqueda.toLowerCase()) ||
    registro.ClaveDeElector?.toLowerCase().includes(busqueda.toLowerCase()) ||
    registro.from_number.includes(busqueda)
  );

  const cambiarPagina = (pagina: number) => {
    if (pagina >= 1 && pagina <= totalPages) {
      setCurrentPage(pagina);
    }
  };

  return (
    <div className="registros-page">
      <div className="registros-header">
        <h1>Todos los Registros</h1>
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por nombre, CURP, clave o número..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Cargando registros...</div>
      ) : (
        <>
          <div className="registros-count">
            Mostrando {registrosFiltrados.length} de {registros.length} registros
          </div>

          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => cambiarPagina(currentPage - 1)}
            >
              Anterior
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => cambiarPagina(currentPage + 1)}
            >
              Siguiente
            </button>
          </div>
          
          <div className="tabla-container">
            <table className="tabla-registros">
              <thead>
                <tr>
                  <th>N°</th>
                  <th className="operador-column">Operador</th>
                  <th>CURP</th>
                  <th>Nombre</th>
                  <th>Clave Elector</th>
                  <th>Domicilio</th>
                  <th>Sección</th>
                  <th>Vigencia</th>
                  <th>Fecha Registro</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((registro, index) => (
                  <tr key={registro.id}>
                    <td>{index + 1}</td>
                    <td className="operador-column">{registro.nombre_contacto}</td>
                    <td>{registro.CURP || 'N/A'}</td>
                    <td>{registro.Nombre || 'N/A'}</td>
                    <td>{registro.ClaveDeElector || 'N/A'}</td>
                    <td>{registro.Domicilio || 'N/A'}</td>
                    <td>{registro.Seccion || 'N/A'}</td>
                    <td>{registro.Vigencia || 'N/A'}</td>
                    <td>{format(new Date(registro.fecha_registro), 'dd/MM/yyyy HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {registrosFiltrados.length === 0 && (
              <p className="no-data">No se encontraron registros</p>
            )}
          </div>

          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => cambiarPagina(currentPage - 1)}
            >
              Anterior
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => cambiarPagina(currentPage + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  );
};
