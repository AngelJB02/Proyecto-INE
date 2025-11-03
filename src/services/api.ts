import axios from 'axios';
import type {
  LoginCredentials,
  AuthResponse,
  RegistroINE,
  EstadisticasGeneral,
  FiltrosEstadisticas,
  CodigoPostal,
} from '../types';

// Configuración base de Axios
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token en cada petición
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Servicios de autenticación
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return data;
  },
  
  register: async (userData: any): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', userData);
    return data;
  },
};

// Servicios de registros INE
export const registrosService = {
  getAll: async (filtros?: FiltrosEstadisticas): Promise<{ page: number; total: number; totalPages: number; data: RegistroINE[] }> => {
    const { data } = await apiClient.get<{ page: number; total: number; totalPages: number; data: RegistroINE[] }>('/registros', { params: filtros });
    return data;
  },
  
  getById: async (id: number): Promise<RegistroINE> => {
    const { data } = await apiClient.get<RegistroINE>(`/registros/${id}`);
    return data;
  },
  
  getByUsuario: async (filtros?: FiltrosEstadisticas): Promise<RegistroINE[]> => {
    const { data } = await apiClient.get<RegistroINE[]>('/registros/usuario', { params: filtros });
    return data;
  },
};

// Servicios de estadísticas
export const estadisticasService = {
  getGeneral: async (filtros?: FiltrosEstadisticas): Promise<EstadisticasGeneral> => {
    const { data } = await apiClient.get<EstadisticasGeneral>('/estadisticas/general', { 
      params: filtros 
    });
    return data;
  },
  
  getPorUsuario: async (filtros?: FiltrosEstadisticas): Promise<EstadisticasGeneral> => {
    const { data } = await apiClient.get<EstadisticasGeneral>('/estadisticas/usuario', { 
      params: filtros 
    });
    return data;
  },
  
  getPorNumero: async (numero: string, filtros?: FiltrosEstadisticas): Promise<any> => {
    const { data } = await apiClient.get(`/estadisticas/numero/${numero}`, { 
      params: filtros 
    });
    return data;
  },
};

// Servicios de códigos postales
export const codigosPostalesService = {
  buscarPorCP: async (cp: string): Promise<CodigoPostal[]> => {
    const { data } = await apiClient.get<CodigoPostal[]>(`/codigos-postales/${cp}`);
    return data;
  },
  
  getEstados: async (): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>('/codigos-postales/estados');
    return data;
  },
  
  getMunicipios: async (estado: string): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>(`/codigos-postales/municipios/${estado}`);
    return data;
  },
};

// Servicios de mapa
export const mapaService = {
  getRegistrosGeoreferenciados: async (filtros?: { estado?: string; municipio?: string; seccion?: string; limit?: number }): Promise<any> => {
    const { data } = await apiClient.get('/mapa/registros-georeferenciados', { params: filtros });
    return data;
  },
  
  getRegistrosPorEstado: async (): Promise<any> => {
    const { data } = await apiClient.get('/mapa/registros-por-estado');
    return data;
  },
  
  getRegistrosPorMunicipio: async (estado?: string): Promise<any> => {
    const { data } = await apiClient.get('/mapa/registros-por-municipio', { params: { estado } });
    return data;
  },
  
  getRegistrosPorSeccion: async (filtros?: { estado?: string; municipio?: string }): Promise<any> => {
    const { data } = await apiClient.get('/mapa/registros-por-seccion', { params: filtros });
    return data;
  },
  
  getEstados: async (): Promise<any> => {
    const { data } = await apiClient.get('/mapa/estados');
    return data;
  },
  
  getMunicipios: async (estado: string): Promise<any> => {
    const { data } = await apiClient.get(`/mapa/municipios/${estado}`);
    return data;
  },
};

export default apiClient;
