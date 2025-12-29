import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { EstadoStats, RegistroGeo } from '../types';
import { mapaService } from '../services/api';
import { 
  agruparRegistrosPorMunicipio,
  type MunicipioConRegistros 
} from '../utils/municipioMatcher';
import { FiBarChart2, FiMapPin, FiHome, FiInfo, FiMap } from 'react-icons/fi';
import 'leaflet/dist/leaflet.css';
import '../styles/Mapa.css';
import L from 'leaflet';

// Importar el GeoJSON de estados
import mexicoGeoJSON from './lib/mx.json';

interface EstadoConMunicipios {
  estado: string;
  codigo_estado: string;
  cantidad: number;
  municipios: Set<string>;
}

// Componente para capturar la referencia del mapa
function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  
  return null;
}

export const Mapa = () => {
  const [estadosData, setEstadosData] = useState<EstadoStats[]>([]);
  const [estadosDetectados, setEstadosDetectados] = useState<Map<string, EstadoConMunicipios>>(new Map());
  const [registrosGeo, setRegistrosGeo] = useState<RegistroGeo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para la vista de municipios
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string | null>(null);
  const [municipiosDelEstado, setMunicipiosDelEstado] = useState<MunicipioConRegistros[]>([]);
  const [mostrarMunicipios, setMostrarMunicipios] = useState(false);
  
  // GeoJSON de municipios (cargado dinámicamente)
  const [municipiosGeoJSON, setMunicipiosGeoJSON] = useState<any>(null);
  const [datosCargados, setDatosCargados] = useState(false);
  
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Cargar el GeoJSON de municipios al montar el componente
  useEffect(() => {
    const cargarMunicipiosGeoJSON = async () => {
      try {
        const response = await fetch('/municipalities.geojson');
        const data = await response.json();
        setMunicipiosGeoJSON(data);
        console.log('GeoJSON de municipios cargado:', data.features?.length, 'features');
      } catch (error) {
        console.error('Error cargando municipalities.geojson:', error);
      }
    };
    
    cargarMunicipiosGeoJSON();
  }, []);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await mapaService.getRegistrosGeoreferenciados({ limit: 10000 });
      
      if (response.success) {
        const registros = response.data as RegistroGeo[];
        setRegistrosGeo(registros);
        
        // Detectar estados y municipios presentes en los datos
        const estadosMap = detectarEstadosYMunicipios(registros);
        setEstadosDetectados(estadosMap);
        
        // Convertir a formato para visualización
        const estadosArray: EstadoStats[] = Array.from(estadosMap.values()).map(estado => ({
          estado: estado.estado,
          codigo_estado: estado.codigo_estado,
          cantidad: estado.cantidad
        }));
        
        setEstadosData(estadosArray);
        
        console.log('Estados detectados:', estadosArray);
        console.log('Municipios por estado:', Array.from(estadosMap.entries()).map(([key, val]) => ({
          estado: key,
          municipios: Array.from(val.municipios)
        })));
        
        // Marcar que los datos están cargados para forzar re-render del mapa
        setDatosCargados(true);
      } else {
        setError('No se pudieron cargar los datos');
      }
    } catch (err) {
      console.error('Error cargando datos del mapa:', err);
      setError('Error al cargar los datos del mapa');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Carga los municipios de un estado específico cuando se hace clic
   */
  const cargarMunicipiosDeEstado = (estadoNombre: string) => {
    if (!municipiosGeoJSON) {
      console.log('GeoJSON de municipios aún no cargado');
      return;
    }
    
    console.log('Cargando municipios de:', estadoNombre);
    
    // Agrupar registros del estado seleccionado
    const registrosDelEstado = registrosGeo.filter(r => r.estado === estadoNombre);
    
    const municipiosAgrupados = agruparRegistrosPorMunicipio(
      registrosDelEstado.map(r => ({ estado: r.estado, municipio: r.municipio })),
      municipiosGeoJSON
    );
    
    setMunicipiosDelEstado(municipiosAgrupados);
    setEstadoSeleccionado(estadoNombre);
    setMostrarMunicipios(true);
    
    console.log('Municipios cargados:', municipiosAgrupados.length);
    
    // Hacer zoom al estado seleccionado
    if (mapRef.current && municipiosAgrupados.length > 0) {
      const bounds = new L.LatLngBounds([]);
      
      municipiosAgrupados.forEach(mun => {
        if (mun.feature && mun.feature.geometry) {
          const geom = mun.feature.geometry;
          if (geom.type === 'Polygon') {
            geom.coordinates[0].forEach((coord: number[]) => {
              bounds.extend([coord[1], coord[0]]);
            });
          } else if (geom.type === 'MultiPolygon') {
            geom.coordinates.forEach((polygon: number[][][]) => {
              polygon[0].forEach((coord: number[]) => {
                bounds.extend([coord[1], coord[0]]);
              });
            });
          }
        }
      });
      
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 9,
          animate: true,
          duration: 0.5
        });
      }
    }
  };

  /**
   * Vuelve a la vista de estados (oculta municipios)
   */
  const volverAEstados = () => {
    setEstadoSeleccionado(null);
    setMostrarMunicipios(false);
    setMunicipiosDelEstado([]);
    
    // Volver al zoom inicial de México
    if (mapRef.current) {
      mapRef.current.setView([23.6345, -102.5528], 5, {
        animate: true,
        duration: 0.5
      });
    }
  };

  /**
   * Detecta los estados y municipios presentes en los registros
   */
  const detectarEstadosYMunicipios = (registros: RegistroGeo[]): Map<string, EstadoConMunicipios> => {
    const estadosMap = new Map<string, EstadoConMunicipios>();
    
    registros.forEach(registro => {
      const estado = registro.estado;
      const municipio = registro.municipio;
      
      if (!estado) return;
      
      if (!estadosMap.has(estado)) {
        estadosMap.set(estado, {
          estado: estado,
          codigo_estado: '', // Se puede agregar si está disponible
          cantidad: 0,
          municipios: new Set<string>()
        });
      }
      
      const estadoData = estadosMap.get(estado)!;
      estadoData.cantidad++;
      
      if (municipio) {
        estadoData.municipios.add(municipio);
      }
    });
    
    return estadosMap;
  };

  const getColorByDensity = (cantidad: number) => {
    // Colorear según la densidad de registros
    if (mostrarMunicipios) {
      // Escala para municipios (más granular)
      return cantidad > 20  ? '#d73027' :
             cantidad > 10  ? '#fc8d59' :
             cantidad > 5   ? '#fee08b' :
             cantidad > 2   ? '#d9ef8b' :
             cantidad > 0   ? '#91bfdb' :
                              '#e0e0e0';
    } else {
      // Escala para estados
      return cantidad > 100 ? '#d73027' :
             cantidad > 50  ? '#fc8d59' :
             cantidad > 20  ? '#fee08b' :
             cantidad > 10  ? '#d9ef8b' :
             cantidad > 0   ? '#91bfdb' :
                              '#e0e0e0';
    }
  };

  const onEachFeatureEstados = (feature: any, layer: any) => {
    const stateName = feature.properties?.name || '';
    const estadoInfo = estadosData.find(e => e.estado === stateName);
    const cantidad = estadoInfo?.cantidad || 0;
    const estadoDetectado = estadoInfo ? estadosDetectados.get(estadoInfo.estado) : null;
    const municipios = estadoDetectado ? Array.from(estadoDetectado.municipios) : [];

    // Popup con info
    let popupContent = `
      <div style="min-width: 200px;">
        <strong>${stateName}</strong><br/>
        <span style="color: #666;">Registros: <strong>${cantidad}</strong></span>
    `;
    if (municipios.length > 0) {
      popupContent += `
        <br/>
        <span style="color: #666;">Municipios (${municipios.length}):</span>
        <div style="max-height: 100px; overflow-y: auto; font-size: 0.85em; margin-top: 5px;">
          ${municipios.sort().slice(0, 10).join('<br/>')}
          ${municipios.length > 10 ? '<br/><em>... y ' + (municipios.length - 10) + ' más</em>' : ''}
        </div>
        <br/>
        <button 
          onclick="window.cargarMunicipiosDeEstado('${estadoInfo?.estado}')" 
          style="margin-top: 8px; padding: 5px 10px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;"
        >
          Ver municipios
        </button>
      `;
    }
    popupContent += '</div>';

    layer.bindPopup(popupContent);

    // Solo resaltar al pasar el mouse
    layer.on({
      mouseover: (e: any) => {
        e.target.setStyle({
          weight: 3,
          color: '#333',
          fillOpacity: 0.9
        });
      },
      mouseout: (e: any) => {
        // Función para obtener color de estados (siempre usar escala de estados)
        const getColorByDensityEstados = (cantidad: number) => {
          return cantidad > 100 ? '#d73027' :
                 cantidad > 50  ? '#fc8d59' :
                 cantidad > 20  ? '#fee08b' :
                 cantidad > 10  ? '#d9ef8b' :
                 cantidad > 0   ? '#91bfdb' :
                                  '#e0e0e0';
        };
        
        // Restaurar al color según densidad de estados
        e.target.setStyle({
          fillColor: getColorByDensityEstados(cantidad),
          weight: 2,
          color: 'white',
          fillOpacity: 0.7
        });
      },
      click: () => {
        if (estadoInfo) {
          cargarMunicipiosDeEstado(estadoInfo.estado);
        }
      }
    });
  };
 

  const onEachFeatureMunicipios = (feature: any, layer: any) => {
    const munNombre = feature.properties?.mun_name || '';
    const stateCode = feature.properties?.state_code || '';
    const munCode = feature.properties?.mun_code || '';
    
    // Buscar datos del municipio
    const munData = municipiosDelEstado.find(m => 
      m.feature && 
      m.feature.properties.state_code === stateCode &&
      m.feature.properties.mun_code === munCode
    );
    
    const cantidad = munData?.cantidad || 0;
    
    // Calcular porcentaje del total del estado
    const totalEstado = municipiosDelEstado.reduce((sum, m) => sum + m.cantidad, 0);
    const porcentaje = totalEstado > 0 ? ((cantidad / totalEstado) * 100).toFixed(1) : '0.0';
    
    // Encontrar el ranking del municipio
    const municipiosOrdenados = [...municipiosDelEstado].sort((a, b) => b.cantidad - a.cantidad);
    const ranking = municipiosOrdenados.findIndex(m => 
      m.feature && 
      m.feature.properties.state_code === stateCode &&
      m.feature.properties.mun_code === munCode
    ) + 1;
    
    let popupContent = `
      <div style="min-width: 200px; font-family: Arial, sans-serif;">
        <strong style="font-size: 1.1em; color: #2c3e50;">${munNombre}</strong><br/>
        <span style="color: #7f8c8d; font-size: 0.9em;">Estado: ${estadoSeleccionado}</span>
        <hr style="margin: 8px 0; border: none; border-top: 1px solid #ecf0f1;">
    `;
    
    if (cantidad > 0) {
      popupContent += `
        <div style="margin: 5px 0;">
          <span style="color: #34495e;">📊 Registros:</span> 
          <strong style="color: #27ae60; font-size: 1.1em;">${cantidad}</strong>
        </div>
        <div style="margin: 5px 0;">
          <span style="color: #34495e;">📈 Del estado:</span> 
          <strong>${porcentaje}%</strong>
        </div>
        <div style="margin: 5px 0;">
          <span style="color: #34495e;">🏆 Ranking:</span> 
          <strong>#${ranking}</strong> de ${municipiosDelEstado.length}
        </div>
      `;
    } else {
      popupContent += `
        <div style="margin: 5px 0; color: #95a5a6;">
          <em>Sin registros en este municipio</em>
        </div>
      `;
    }
    
    popupContent += '</div>';
    
    layer.bindPopup(popupContent);
    
    // Resaltar al pasar el mouse solo si tiene registros
    if (cantidad > 0) {
      layer.on({
        mouseover: (e: any) => {
          const layer = e.target;
          layer.setStyle({
            weight: 3,
            color: '#333',
            fillOpacity: 0.9
          });
        },
        mouseout: (e: any) => {
          const layer = e.target;
          layer.setStyle({
            weight: 1,
            color: 'white',
            fillOpacity: 0.7
          });
        }
      });
    }
  };

  const styleFeatureEstados = (feature: any) => {
    const stateName = feature.properties?.name || '';
    const estadoInfo = estadosData.find(e => e.estado === stateName);
    const cantidad = estadoInfo?.cantidad || 0;

    // Función para obtener color de estados (siempre usar escala de estados)
    const getColorByDensityEstados = (cantidad: number) => {
      return cantidad > 100 ? '#d73027' :
             cantidad > 50  ? '#fc8d59' :
             cantidad > 20  ? '#fee08b' :
             cantidad > 10  ? '#d9ef8b' :
             cantidad > 0   ? '#91bfdb' :
                              '#e0e0e0';
    };

    // Si se están mostrando municipios, hacer los estados semi-transparentes pero mantener colores
    if (mostrarMunicipios) {
      return {
        fillColor: getColorByDensityEstados(cantidad),
        weight: 2,
        opacity: 0.4,
        color: '#999',
        fillOpacity: 0.3  // Más transparente para que los municipios destaquen
      };
    }

    return {
      fillColor: getColorByDensityEstados(cantidad),
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  const styleFeatureMunicipios = (feature: any) => {
    const stateCode = feature.properties?.state_code || '';
    const munCode = feature.properties?.mun_code || '';
    
    // Buscar datos del municipio
    const munData = municipiosDelEstado.find(m => 
      m.feature && 
      m.feature.properties.state_code === stateCode &&
      m.feature.properties.mun_code === munCode
    );
    
    const cantidad = munData?.cantidad || 0;
    
    return {
      fillColor: getColorByDensity(cantidad),
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: cantidad > 0 ? 0.7 : 0.1
    };
  };

  // Preparar GeoJSON de municipios filtrado por estado
  const municipiosGeoJSONFiltrado = mostrarMunicipios && estadoSeleccionado && municipiosGeoJSON
    ? {
        ...municipiosGeoJSON,
        features: municipiosGeoJSON.features.filter((feature: any) => {
          const munData = municipiosDelEstado.find(m => 
            m.feature && 
            m.feature.properties.state_code === feature.properties.state_code &&
            m.feature.properties.mun_code === feature.properties.mun_code
          );
          return munData !== undefined;
        })
      }
    : null;

  // Exponer función globalmente para el botón del popup
  useEffect(() => {
    (window as any).cargarMunicipiosDeEstado = cargarMunicipiosDeEstado;
    return () => {
      delete (window as any).cargarMunicipiosDeEstado;
    };
  }, [registrosGeo, municipiosGeoJSON]);

  const totalRegistros = estadosData.reduce((sum, estado) => sum + estado.cantidad, 0);

  if (isLoading) {
    return <div className="loading">Cargando mapa...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="mapa-page">
      <h1>
        {mostrarMunicipios && estadoSeleccionado 
          ? `Mapa de Municipios - ${estadoSeleccionado}` 
          : 'Mapa de Registros por Estado'}
      </h1>
      
      {mostrarMunicipios && (
        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={volverAEstados}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ✕ Ocultar municipios
          </button>
        </div>
      )}
      
      <div className="mapa-info-cards">
        {mostrarMunicipios ? (
          <>
            <div className="info-card primary">
              <div className="card-icon"><FiBarChart2 /></div>
              <div className="card-content">
                <div className="card-value">{totalRegistros}</div>
                <div className="card-label">Total de Registros</div>
              </div>
            </div>

            <div className="info-card success">
              <div className="card-icon"><FiMapPin /></div>
              <div className="card-content">
                <div className="card-value">{estadoSeleccionado}</div>
                <div className="card-label">Estado Seleccionado</div>
              </div>
            </div>

            <div className="info-card info">
              <div className="card-icon"><FiHome /></div>
              <div className="card-content">
                <div className="card-value">{municipiosDelEstado.filter(m => m.cantidad > 0).length}</div>
                <div className="card-label">Municipios con Registros</div>
              </div>
            </div>

            <div className="info-card tip">
              <div className="card-icon"><FiInfo /></div>
              <div className="card-content">
                <div className="card-tip">Haz clic en otro estado para ver sus municipios</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="info-card primary">
              <div className="card-icon"><FiBarChart2 /></div>
              <div className="card-content">
                <div className="card-value">{totalRegistros}</div>
                <div className="card-label">Total de Registros</div>
              </div>
            </div>

            <div className="info-card success">
              <div className="card-icon"><FiMap /></div>
              <div className="card-content">
                <div className="card-value">{estadosData.filter(e => e.cantidad > 0).length}</div>
                <div className="card-label">Estados con Registros</div>
              </div>
            </div>

            <div className="info-card info">
              <div className="card-icon"><FiHome /></div>
              <div className="card-content">
                <div className="card-value">{Array.from(estadosDetectados.values()).reduce((sum, estado) => sum + estado.municipios.size, 0)}</div>
                <div className="card-label">Total de Municipios</div>
              </div>
            </div>

            <div className="info-card tip">
              <div className="card-icon"><FiInfo /></div>
              <div className="card-content">
                <div className="card-tip">Haz clic en un estado para ver sus municipios</div>
              </div>
            </div>
          </>
        )}
      </div>
         

      <MapContainer
        center={[23.6345, -102.5528]} // Centro de México
        zoom={5}
        style={{ height: '600px', width: '100%' }}
      >
        <MapRefCapture mapRef={mapRef} />
        
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Siempre mostrar los estados */}
        <GeoJSON
          key={`estados-${datosCargados}`}
          data={mexicoGeoJSON as any}
          style={styleFeatureEstados}
          onEachFeature={onEachFeatureEstados}
        />
        
        {/* Superponer municipios si hay un estado seleccionado */}
        {mostrarMunicipios && municipiosGeoJSONFiltrado && (
          <GeoJSON
            key={`municipios-${estadoSeleccionado}`}
            data={municipiosGeoJSONFiltrado as any}
            style={styleFeatureMunicipios}
            onEachFeature={onEachFeatureMunicipios}
            ref={geoJsonLayerRef as any}
          />
        )}
      </MapContainer>

      {!mostrarMunicipios ? (
        <div className="top-estados">
          <h3>Estados con más registros</h3>
          <ul>
            {estadosData
              .filter(e => e.cantidad > 0)
              .sort((a, b) => b.cantidad - a.cantidad)
              .slice(0, 10)
              .map(estado => {
                const estadoInfo = estadosDetectados.get(estado.estado);
                const numMunicipios = estadoInfo ? estadoInfo.municipios.size : 0;
                
                return (
                  <li 
                    key={estado.codigo_estado || estado.estado}
                    style={{ cursor: 'pointer' }}
                    onClick={() => cargarMunicipiosDeEstado(estado.estado)}
                  >
                    <strong>{estado.estado}</strong>: {estado.cantidad} registros
                    {numMunicipios > 0 && (
                      <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '8px' }}>
                        ({numMunicipios} municipio{numMunicipios !== 1 ? 's' : ''})
                      </span>
                    )}
                  </li>
                );
              })
            }
          </ul>
        </div>
      ) : (
        <div className="top-estados">
          <h3>Municipios de {estadoSeleccionado} con más registros</h3>
          <ul>
            {municipiosDelEstado
              .sort((a, b) => b.cantidad - a.cantidad)
              .slice(0, 20)
              .map((mun, idx) => (
                <li key={`${mun.municipio}-${idx}`}>
                  <strong>{mun.municipio}</strong>: {mun.cantidad} registros
                </li>
              ))
            }
          </ul>
        </div>
      )}

      {!mostrarMunicipios && estadosDetectados.size > 0 && (
        <div className="municipios-info" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <h3>Municipios detectados por estado</h3>
          {Array.from(estadosDetectados.entries())
            .sort((a, b) => b[1].cantidad - a[1].cantidad)
            .slice(0, 5)
            .map(([estadoNombre, info]) => (
              <div key={estadoNombre} style={{ marginBottom: '15px' }}>
                <strong 
                  style={{ cursor: 'pointer', color: '#2196F3' }}
                  onClick={() => cargarMunicipiosDeEstado(estadoNombre)}
                >
                  {estadoNombre}
                </strong> ({info.cantidad} registros):
                <div style={{ marginLeft: '15px', fontSize: '0.9em', color: '#555' }}>
                  {Array.from(info.municipios).sort().join(', ')}
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};
