/// <reference types="vite/client" />

// Declaración para archivos GeoJSON
declare module '*.geojson' {
  const value: any;
  export default value;
}

// Declaración para archivos JSON
declare module '*.json' {
  const value: any;
  export default value;
}
