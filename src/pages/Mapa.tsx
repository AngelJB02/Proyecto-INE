import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import type { RegistroINE } from '../types';
import 'leaflet/dist/leaflet.css';
import '../styles/Mapa.css';

export const Mapa = () => {
  const [registros, setRegistros] = useState<RegistroINE[]>([]);
  const [geoData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    // TODO: Implementar llamada a API real
    setIsLoading(true);
    setTimeout(() => {
      setRegistros([]); // Sin datos por ahora
      setIsLoading(false);
    }, 500);
  };

  const getColorByDensity = (_feature: any) => {
    // Lógica para colorear según densidad de registros
    const registrosPorEstado = registros.filter(_r => 
      // Aquí relacionarías el registro con el estado del feature
      true
    ).length;
    
    return registrosPorEstado > 100 ? '#d73027' :
           registrosPorEstado > 50  ? '#fc8d59' :
           registrosPorEstado > 20  ? '#fee08b' :
           registrosPorEstado > 0   ? '#d9ef8b' :
                                       '#91bfdb';
  };

  const onEachFeature = (feature: any, layer: any) => {
    if (feature.properties && feature.properties.name) {
      layer.bindPopup(`
        <strong>${feature.properties.name}</strong><br/>
        Registros: ${feature.properties.count || 0}
      `);
    }
  };

  if (isLoading) {
    return <div className="loading">Cargando mapa...</div>;
  }

  return (
    <div className="mapa-page">
      <h1>Mapa de Registros</h1>
      
      <div className="mapa-info">
        <p>Total de registros visualizados: <strong>{registros.length}</strong></p>
        <div className="leyenda">
          <h4>Densidad de registros:</h4>
          <div className="leyenda-item">
            <span className="color-box" style={{backgroundColor: '#d73027'}}></span>
            <span>&gt; 100</span>
          </div>
          <div className="leyenda-item">
            <span className="color-box" style={{backgroundColor: '#fc8d59'}}></span>
            <span>50 - 100</span>
          </div>
          <div className="leyenda-item">
            <span className="color-box" style={{backgroundColor: '#fee08b'}}></span>
            <span>20 - 50</span>
          </div>
          <div className="leyenda-item">
            <span className="color-box" style={{backgroundColor: '#d9ef8b'}}></span>
            <span>1 - 20</span>
          </div>
          <div className="leyenda-item">
            <span className="color-box" style={{backgroundColor: '#91bfdb'}}></span>
            <span>0</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={[23.6345, -102.5528]} // Centro de México
        zoom={5}
        style={{ height: '600px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {geoData && (
          <GeoJSON
            data={geoData}
            style={(feature) => ({
              fillColor: getColorByDensity(feature),
              weight: 2,
              opacity: 1,
              color: 'white',
              fillOpacity: 0.7
            })}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      <div className="mapa-note">
        <p>
          <strong>Nota:</strong> Para activar la visualización completa del mapa, 
          necesitas agregar el archivo TopoJSON de México en la carpeta 
          <code>/public/data/mexico.topojson</code>
        </p>
      </div>
    </div>
  );
};
