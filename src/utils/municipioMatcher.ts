/**
 * Utilidades para hacer matching entre nombres de municipios/estados 
 * de la base de datos y los GeoJSON
 */

// Mapeo de códigos de estado de INEGI a números del GeoJSON
export const estadoCodigoMap: { [key: string]: number } = {
  // Estados ordenados por código INEGI
  '01': 1,   // Aguascalientes
  '02': 2,   // Baja California
  '03': 3,   // Baja California Sur
  '04': 4,   // Campeche
  '05': 5,   // Coahuila
  '06': 6,   // Colima
  '07': 7,   // Chiapas
  '08': 8,   // Chihuahua
  '09': 9,   // Ciudad de México
  '10': 10,  // Durango
  '11': 11,  // Guanajuato
  '12': 12,  // Guerrero
  '13': 13,  // Hidalgo
  '14': 14,  // Jalisco
  '15': 15,  // México
  '16': 16,  // Michoacán
  '17': 17,  // Morelos
  '18': 18,  // Nayarit
  '19': 19,  // Nuevo León
  '20': 20,  // Oaxaca
  '21': 21,  // Puebla
  '22': 22,  // Querétaro
  '23': 23,  // Quintana Roo
  '24': 24,  // San Luis Potosí
  '25': 25,  // Sinaloa
  '26': 26,  // Sonora
  '27': 27,  // Tabasco
  '28': 28,  // Tamaulipas
  '29': 29,  // Tlaxcala
  '30': 30,  // Veracruz
  '31': 31,  // Yucatán
  '32': 32,  // Zacatecas
};

// Mapeo de nombres de estados (de la BD) a códigos numéricos del GeoJSON
export const estadoNombreMap: { [key: string]: number } = {
  'Aguascalientes': 1,
  'Baja California': 2,
  'Baja California Sur': 3,
  'Campeche': 4,
  'Coahuila': 5,
  'Coahuila de Zaragoza': 5,
  'Colima': 6,
  'Chiapas': 7,
  'Chihuahua': 8,
  'Ciudad de México': 9,
  'Distrito Federal': 9,
  'CDMX': 9,
  'Durango': 10,
  'Guanajuato': 11,
  'Guerrero': 12,
  'Hidalgo': 13,
  'Jalisco': 14,
  'México': 15,
  'Estado de México': 15,
  'Michoacán': 16,
  'Michoacán de Ocampo': 16,
  'Morelos': 17,
  'Nayarit': 18,
  'Nuevo León': 19,
  'Oaxaca': 20,
  'Puebla': 21,
  'Querétaro': 22,
  'Querétaro de Arteaga': 22,
  'Quintana Roo': 23,
  'San Luis Potosí': 24,
  'Sinaloa': 25,
  'Sonora': 26,
  'Tabasco': 27,
  'Tamaulipas': 28,
  'Tlaxcala': 29,
  'Veracruz': 30,
  'Veracruz de Ignacio de la Llave': 30,
  'Yucatán': 31,
  'Zacatecas': 32,
};

/**
 * Normaliza un string para comparación (sin acentos, minúsculas, sin espacios extras)
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Obtiene el código de estado del GeoJSON a partir del nombre del estado
 */
export function getEstadoCodeFromName(estadoNombre: string): number | null {
  // Primero buscar coincidencia exacta
  if (estadoNombreMap[estadoNombre]) {
    return estadoNombreMap[estadoNombre];
  }
  
  // Buscar coincidencia normalizada
  const normalizado = normalizeString(estadoNombre);
  for (const [nombre, codigo] of Object.entries(estadoNombreMap)) {
    if (normalizeString(nombre) === normalizado) {
      return codigo;
    }
  }
  
  return null;
}

/**
 * Encuentra el municipio en el GeoJSON que coincide con el nombre y estado dados
 */
export function findMunicipioFeature(
  municipiosGeoJSON: any,
  estadoNombre: string,
  municipioNombre: string
): any | null {
  const estadoCodigo = getEstadoCodeFromName(estadoNombre);
  
  if (!estadoCodigo) {
    console.warn(`No se encontró código para el estado: ${estadoNombre}`);
    return null;
  }
  
  const municipioNormalizado = normalizeString(municipioNombre);
  
  // Buscar en las features del GeoJSON
  const features = municipiosGeoJSON.features || [];
  
  for (const feature of features) {
    const props = feature.properties;
    
    // Verificar que coincida el código de estado
    if (props.state_code === estadoCodigo) {
      const munNombre = normalizeString(props.mun_name || '');
      
      // Verificar coincidencia exacta
      if (munNombre === municipioNormalizado) {
        return feature;
      }
      
      // Verificar coincidencia parcial (contiene)
      if (munNombre.includes(municipioNormalizado) || municipioNormalizado.includes(munNombre)) {
        return feature;
      }
    }
  }
  
  return null;
}

/**
 * Obtiene todos los municipios de un estado específico del GeoJSON
 */
export function getMunicipiosByEstado(
  municipiosGeoJSON: any,
  estadoNombre: string
): any[] {
  const estadoCodigo = getEstadoCodeFromName(estadoNombre);
  
  if (!estadoCodigo) {
    return [];
  }
  
  const features = municipiosGeoJSON.features || [];
  return features.filter((f: any) => f.properties.state_code === estadoCodigo);
}

/**
 * Agrupa registros por municipio y cuenta
 */
export interface MunicipioConRegistros {
  estado: string;
  municipio: string;
  cantidad: number;
  feature: any; // La feature del GeoJSON
}

export function agruparRegistrosPorMunicipio(
  registros: Array<{ estado: string; municipio: string }>,
  municipiosGeoJSON: any
): MunicipioConRegistros[] {
  const municipiosMap = new Map<string, MunicipioConRegistros>();
  
  for (const registro of registros) {
    const key = `${registro.estado}|${registro.municipio}`;
    
    if (!municipiosMap.has(key)) {
      const feature = findMunicipioFeature(
        municipiosGeoJSON,
        registro.estado,
        registro.municipio
      );
      
      if (feature) {
        municipiosMap.set(key, {
          estado: registro.estado,
          municipio: registro.municipio,
          cantidad: 0,
          feature: feature
        });
      }
    }
    
    const munData = municipiosMap.get(key);
    if (munData) {
      munData.cantidad++;
    }
  }
  
  return Array.from(municipiosMap.values());
}
