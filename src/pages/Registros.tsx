import { useState, useEffect } from 'react';
import { todosLosMockRegistros } from '../services/mockData';
import type { RegistroINE } from '../types';
import { format } from 'date-fns';
import '../styles/Registros.css';

export const Registros = () => {
  const [registros, setRegistros] = useState<RegistroINE[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarRegistros();
  }, []);

  const cargarRegistros = async () => {
    // Simular carga con datos mock
    setIsLoading(true);
    setTimeout(() => {
      setRegistros(todosLosMockRegistros);
      setIsLoading(false);
    }, 300);
  };

  const registrosFiltrados = registros.filter(registro =>
    registro.Nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    registro.CURP?.toLowerCase().includes(busqueda.toLowerCase()) ||
    registro.ClaveDeElector?.toLowerCase().includes(busqueda.toLowerCase()) ||
    registro.from_number.includes(busqueda)
  );

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
          
          <div className="tabla-container">
            <table className="tabla-registros">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>CURP</th>
                  <th>Clave Elector</th>
                  <th>Domicilio</th>
                  <th>Sección</th>
                  <th>Vigencia</th>
                  <th>WhatsApp</th>
                  <th>Fecha Registro</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((registro) => (
                  <tr key={registro.id}>
                    <td>{registro.id}</td>
                    <td>{registro.Nombre || 'N/A'}</td>
                    <td>{registro.CURP || 'N/A'}</td>
                    <td>{registro.ClaveDeElector || 'N/A'}</td>
                    <td>{registro.Domicilio || 'N/A'}</td>
                    <td>{registro.Seccion || 'N/A'}</td>
                    <td>{registro.Vigencia || 'N/A'}</td>
                    <td>{registro.from_number}</td>
                    <td>{format(new Date(registro.fecha_registro), 'dd/MM/yyyy HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {registrosFiltrados.length === 0 && (
              <p className="no-data">No se encontraron registros</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
