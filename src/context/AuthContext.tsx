import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Usuario } from '../types';
import { mockUsuario } from '../services/mockData';

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
    // Verificar si hay un token guardado
    const savedToken = localStorage.getItem('token');
    const savedUsuario = localStorage.getItem('usuario');
    
    if (savedToken && savedUsuario) {
      setToken(savedToken);
      setUsuario(JSON.parse(savedUsuario));
    } else {
      // AUTO-LOGIN con usuario de prueba para desarrollo
      const mockToken = 'mock-token-' + Date.now();
      setToken(mockToken);
      setUsuario(mockUsuario);
      localStorage.setItem('token', mockToken);
      localStorage.setItem('usuario', JSON.stringify(mockUsuario));
    }
    setIsLoading(false);
  }, []);

  const login = async (_username: string, _password: string) => {
    // Simular login sin backend
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const mockToken = 'mock-token-' + Date.now();
        setToken(mockToken);
        setUsuario(mockUsuario);
        localStorage.setItem('token', mockToken);
        localStorage.setItem('usuario', JSON.stringify(mockUsuario));
        resolve();
      }, 500);
    });
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
