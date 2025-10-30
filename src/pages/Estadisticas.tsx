import { useState, useEffect } from 'react';
import { todosLosMockRegistros } from '../services/mockData';
import type { RegistroINE, FiltrosEstadisticas } from '../types';
import { format } from 'date-fns';
import '../styles/Estadisticas.css';

export const Estadisticas = () => {
  const [registros, setRegistros] = useState<RegistroINE[]>([]);
  const [filtros, setFiltros] = useState<FiltrosEstadisticas>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    cargarRegistros();
  }, [filtros]);

  const cargarRegistros = async () => {
    // Simular carga con datos mock
    setIsLoading(true);
    setTimeout(() => {
      let datosFiltrados = [...todosLosMockRegistros];
      
      // Aplicar filtros
      if (filtros.from_number) {
        datosFiltrados = datosFiltrados.filter(r => 
          r.from_number.includes(filtros.from_number!)
        );
      }
      if (filtros.seccion) {
        datosFiltrados = datosFiltrados.filter(r => 
          r.Seccion?.includes(filtros.seccion!)
        );
      }
      
      setRegistros(datosFiltrados);
      setIsLoading(false);
    }, 300);
  };

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor || undefined
    }));
  };

  return (
    <div className="estadisticas-page">
      <h1>Estadísticas Detalladas</h1>
      
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
        
        <div className="filtro-group">
          <label>Número WhatsApp</label>
          <input
            type="text"
            placeholder="Filtrar por número"
            onChange={(e) => handleFiltroChange('from_number', e.target.value)}
          />
        </div>
        
        <div className="filtro-group">
          <label>Sección Electoral</label>
          <input
            type="text"
            placeholder="Filtrar por sección"
            onChange={(e) => handleFiltroChange('seccion', e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Cargando registros...</div>
      ) : (
        <div className="tabla-container">
          <table className="tabla-registros">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>CURP</th>
                <th>Sección</th>
                <th>WhatsApp</th>
                <th>Fecha Nacimiento</th>
                <th>Fecha Registro</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((registro) => (
                <tr key={registro.id}>
                  <td>{registro.id}</td>
                  <td>{registro.Nombre || 'N/A'}</td>
                  <td>{registro.CURP || 'N/A'}</td>
                  <td>{registro.Seccion || 'N/A'}</td>
                  <td>{registro.from_number}</td>
                  <td>
                    {registro.FechaNacimiento 
                      ? format(new Date(registro.FechaNacimiento), 'dd/MM/yyyy')
                      : 'N/A'
                    }
                  </td>
                  <td>{format(new Date(registro.fecha_registro), 'dd/MM/yyyy HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {registros.length === 0 && (
            <p className="no-data">No se encontraron registros</p>
          )}
        </div>
      )}
    </div>
  );
};
