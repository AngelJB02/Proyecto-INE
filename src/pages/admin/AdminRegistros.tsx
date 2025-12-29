import { useState, useEffect, useRef } from 'react';
import type { RegistroINE } from '../../types';
import { format } from 'date-fns';
import '../../styles/Registros.css';
import { registrosService } from '../../services/api';

export const AdminRegistros = () => {
  const [registros, setRegistros] = useState<RegistroINE[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isImgLoading, setIsImgLoading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const imgCache = useState<Map<number, { url: string; status: 'ok' | 'error' }>>(
    () => new Map()
  )[0];
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    cargarRegistrosAdmin();
  }, [currentPage]);

  const cargarRegistrosAdmin = async () => {
    setIsLoading(true);
    try {
      const response = await registrosService.getAllAdmin({ page: currentPage });
      setRegistros(response.data);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Error cargando registros (admin):', error);
      setRegistros([]);
    } finally {
      setIsLoading(false);
    }
  };

  const registrosFiltrados = registros.filter(registro =>
    registro.Nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    registro.CURP?.toLowerCase().includes(busqueda.toLowerCase()) ||
    registro.ClaveDeElector?.toLowerCase().includes(busqueda.toLowerCase()) ||
    registro.from_number.includes(busqueda)
  );

  const cambiarPagina = (pagina: number) => {
    if (pagina >= 1 && pagina <= totalPages) {
      setCurrentPage(pagina);
    }
  };

  const resolveImageUrl = (registro: RegistroINE): string | null => {
    const anyReg = registro as any;
    const candidates = [anyReg.imagen_url, anyReg.image_url, anyReg.media_url, anyReg.archivo_url].filter(Boolean) as string[];
    if (candidates.length === 0) return null;
    const raw = candidates[0]!.trim();
    if (raw === '') return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const filesBase = import.meta.env.VITE_FILES_BASE_URL as string | undefined;
    if (filesBase) {
      return filesBase.replace(/\/+$/, '') + '/' + raw.replace(/^\/+/, '');
    }
    const apiBase = import.meta.env.VITE_API_URL as string | undefined;
    if (apiBase) {
      const base = apiBase.replace(/\/+$/, '').replace(/\/api$/, '');
      return base + '/' + raw.replace(/^\/+/, '');
    }
    return raw;
  };

  const handleVerImagen = (registro: RegistroINE) => {
    const url = resolveImageUrl(registro) || undefined;
    if (!url || url.trim() === '') return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const cached = imgCache.get(registro.id);
    if (cached && cached.status === 'ok') {
      setSelectedImageUrl(cached.url);
      setImgError(null);
      setIsImgLoading(false);
      setIsModalOpen(true);
      return;
    }
    setSelectedImageUrl(url);
    setImgError(null);
    setIsImgLoading(true);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setSelectedImageUrl(null);
    setIsImgLoading(false);
    setImgError(null);
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cerrarModal();
      }
    };
    if (isModalOpen) {
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 0);
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [isModalOpen]);

  return (
    <div className="registros-page">
      <div className="registros-header">
        <h1>Todos los Registros (Admin)</h1>
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
        <div className="tabla-container">
          <div className="skeleton-table">
            {[...Array(8)].map((_, idx) => (
              <div key={idx} className="skeleton-row">
                <div className="skeleton skeleton-cell w-col-1"></div>
                <div className="skeleton skeleton-cell w-col-2"></div>
                <div className="skeleton skeleton-cell w-col-3"></div>
                <div className="skeleton skeleton-cell w-col-4"></div>
                <div className="skeleton skeleton-cell w-col-5"></div>
                <div className="skeleton skeleton-cell w-col-6"></div>
                <div className="skeleton skeleton-cell w-col-7"></div>
                <div className="skeleton skeleton-cell w-col-8"></div>
                <div className="skeleton skeleton-cell w-col-9"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="registros-count">
            Mostrando {registrosFiltrados.length} de {registros.length} registros
          </div>

          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => cambiarPagina(currentPage - 1)}
            >
              Anterior
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => cambiarPagina(currentPage + 1)}
            >
              Siguiente
            </button>
          </div>
          
          <div className="tabla-container">
            <table className="tabla-registros">
              <thead>
                <tr>
                  <th>N°</th>
                  <th className="operador-column">Operador</th>
                  <th>CURP</th>
                  <th>Nombre</th>
                  <th>Clave Elector</th>
                  <th>Domicilio</th>
                  <th>Sección</th>
                  <th>Vigencia</th>
                  <th>Fecha Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((registro, index) => (
                  <tr key={registro.id}>
                    <td>{index + 1}</td>
                    <td className="operador-column">{registro.nombre_contacto}</td>
                    <td>{registro.CURP || 'N/A'}</td>
                    <td>{registro.Nombre || 'N/A'}</td>
                    <td>{registro.ClaveDeElector || 'N/A'}</td>
                    <td>{registro.Domicilio || 'N/A'}</td>
                    <td>{registro.Seccion || 'N/A'}</td>
                    <td>{registro.Vigencia || 'N/A'}</td>
                    <td>{format(new Date(registro.fecha_registro), 'dd/MM/yyyy HH:mm')}</td>
                    <td>
                      <button
                        className="btn-ver-imagen"
                        disabled={!resolveImageUrl(registro)}
                        onClick={() => handleVerImagen(registro)}
                        title={resolveImageUrl(registro) ? 'Ver imagen' : 'Sin imagen disponible'}
                      >
                        Ver imagen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {registrosFiltrados.length === 0 && (
              <p className="no-data">No se encontraron registros</p>
            )}
          </div>

          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => cambiarPagina(currentPage - 1)}
            >
              Anterior
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => cambiarPagina(currentPage + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
      {isModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="imagen-modal-title-admin"
          onClick={cerrarModal}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="imagen-modal-title-admin">Imagen del registro</h2>
              <button ref={closeBtnRef} className="modal-close" onClick={cerrarModal} aria-label="Cerrar">×</button>
            </div>
            <div className="modal-body">
              {isImgLoading && !imgError && (
                <div className="modal-spinner">Cargando...</div>
              )}
              {imgError && (
                <div className="modal-error">Imagen no disponible</div>
              )}
              {selectedImageUrl && (
                <img
                  src={selectedImageUrl}
                  alt="Imagen de registro"
                  loading="lazy"
                  decoding="async"
                  onLoad={() => {
                    setIsImgLoading(false);
                    const url = selectedImageUrl!;
                    const entry = { url, status: 'ok' as const };
                    const id = registros.find(r => resolveImageUrl(r) === url)?.id;
                    if (id) imgCache.set(id, entry);
                  }}
                  onError={() => {
                    setIsImgLoading(false);
                    setImgError('error');
                    const url = selectedImageUrl!;
                    const id = registros.find(r => resolveImageUrl(r) === url)?.id;
                    if (id) imgCache.set(id, { url, status: 'error' });
                  }}
                  className="modal-image"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
