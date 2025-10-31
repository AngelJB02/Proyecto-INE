import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Usuario } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Limpiar datos corruptos del localStorage
    const savedUsuario = localStorage.getItem('usuario');
    if (savedUsuario === 'undefined' || savedUsuario === null || savedUsuario === '') {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    }

    // Verificar si hay datos válidos
    const savedToken = localStorage.getItem('token');
    const cleanSavedUsuario = localStorage.getItem('usuario');
    
    if (savedToken && cleanSavedUsuario && cleanSavedUsuario !== 'undefined') {
      try {
        setToken(savedToken);
        setUsuario(JSON.parse(cleanSavedUsuario));
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        // Limpiar datos corruptos
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login({ username, password });
      setToken(response.token);
      setUsuario(response.usuario);
      localStorage.setItem('token', response.token);
      localStorage.setItem('usuario', JSON.stringify(response.usuario));
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
