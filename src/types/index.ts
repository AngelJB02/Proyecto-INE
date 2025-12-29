// Tipos para el sistema INE

export interface Usuario {
  id: number;
  username: string;
  nombre?: string;
  apellido?: string;
  email: string;
  nombres_asignados: string[]; // números de WhatsApp asignados
  rol: 'admin' | 'usuario';
}

export interface RegistroINE {
  id: number;
  from_number: string;
  Nombre: string | null;
  Domicilio: string | null;
  ClaveDeElector: string | null;
  CURP: string | null;
  AnioRegistro: string | null;
  FechaNacimiento: Date | null;
  Seccion: string | null;
  Vigencia: string | null;
  fecha_registro: Date;
  nombre_contacto: string;
  imagen_url?: string;
}

export interface CodigoPostal {
  id: number;
  d_codigo: string;
  d_asenta: string;
  d_tipo_asenta: string;
  d_mnpio: string;
  d_estado: string;
  d_ciudad: string;
  d_CP: string;
  c_estado: string;
  c_oficina: string;
  c_tipo_asenta: string;
  c_mnpio: string;
  id_asenta_cpcons: string;
  d_zona: string;
  seccion_electoral: string;
}

export interface EstadisticasGeneral {
  totalRegistros: number;
  registrosHoy: number;
  registrosMes: number;
  numerosActivos: number;
  registros_por_numero: { numero: string; cantidad: number }[];
  registros_por_estado: { estado: string; cantidad: number }[];
  registros_por_seccion: { seccion: string; cantidad: number }[];
}

export interface FiltrosEstadisticas {
  fecha_inicio?: string;
  fecha_fin?: string;
  from_number?: string;
  estado?: string;
  seccion?: string;
  userId?: number;
  page?: number; // Página actual para paginación
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

export interface RegistroGeo {
  id: number;
  Nombre: string;
  Domicilio: string;
  Seccion: string;
  fecha_registro: Date;
  codigo_postal: string;
  estado: string;
  municipio: string;
  colonia: string;
  d_zona: string;
}

export interface EstadoStats {
  estado: string;
  cantidad: number;
  codigo_estado: string;
}

export interface MunicipioStats {
  estado: string;
  municipio: string;
  cantidad: number;
  codigo_municipio: string;
}

export interface SeccionStats {
  seccion: string;
  cantidad: number;
  estado: string;
  municipio: string;
}

export interface StateMapConfig {
  [key: string]: {
    center: [number, number];
    zoom: number;
    name: string;
  };
}

export interface UsuarioCompleto extends Usuario {
  activo: boolean;
  fecha_creacion: string;
  ultima_sesion?: string;
  numeros?: NumeroAsignado[];
}

export interface NumeroAsignado {
  id: number;
  numero_whatsapp: string;
  nombre_contacto?: string;
  activo: boolean;
  fecha_asignacion: string;
}

export interface CrearUsuarioData {
  username: string;
  email: string;
  password: string;
  nombre?: string;
  apellido?: string;
  rol?: 'admin' | 'usuario';
}

export interface AsignarNumeroData {
  numero_whatsapp: string;
  nombre_contacto?: string;
}

