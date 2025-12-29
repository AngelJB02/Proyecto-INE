## Alcance y Supuestos
- Agregar en /registros una acción "Ver imagen" por fila para visualizar la imagen asociada al registro almacenada en el VPS.
- Supuesto: el backend ya devuelve una URL de imagen por registro (p.ej. imagen_url/media_url). Si es relativa, se resolverá contra una base configurada.
- Sin cambios de backend. Si el campo no existe, se hará resolución flexible revisando posibles keys y se mostrará botón solo cuando haya URL válida.

## Cambios en Tipos
- Actualizar [types/index.ts](file:///c:/Users/angel/Desktop/ine/Proyecto-INE/src/types/index.ts) para incluir opcionalmente `imagen_url?: string` en `RegistroINE`.
- Mantener compatibilidad: campo opcional, no rompe usos existentes.

## UI en Tabla de Registros
- En [Registros.tsx](file:///c:/Users/angel/Desktop/ine/Proyecto-INE/src/pages/Registros.tsx):
  - Agregar columna "Acciones" al thead.
  - En cada fila, renderizar botón "Ver imagen" cuando exista una URL resolvible.
  - Deshabilitar el botón si no hay URL.

## Modal/Lightbox
- Implementar un modal ligero dentro de `Registros.tsx` (sin crear archivos nuevos) con:
  - Overlay semitransparente, contenedor centrado, imagen con `max-width: 90vw; max-height: 85vh`.
  - Estado local: `isModalOpen`, `selectedImageUrl`, `isImgLoading`, `imgError`.
  - Cerrar con botón visible, clic en overlay y tecla Escape.

## Resolución de URL y Validaciones
- Función `resolveImageUrl(registro)`:
  - Extrae la URL de `imagen_url`, `image_url`, `media_url`, `archivo_url` si existen.
  - Si la URL es relativa, prefiere `import.meta.env.VITE_FILES_BASE_URL`; si no existe, toma `VITE_API_URL` y reemplaza `/api` por `/files`.
  - Valida formato (http/https o relativa no vacía). Si no válida, no muestra botón.
- Antes de cargar la imagen:
  - Verificar existencia de `selectedImageUrl`.
  - Manejar errores vía `onError` del `img`.

## Carga, Loader y Errores
- Mostrar spinner mientras `isImgLoading` esté true.
- En `img` usar:
  - `loading="lazy"` (aunque en modal ya es diferida) y `decoding="async"`.
  - `onLoad`/`onError` para alternar estados.
- Mensaje claro en errores: "Imagen no disponible".

## Optimización (Lazy y Cache)
- Lazy: solo cargamos la imagen al abrir el modal; no hay trabajo adicional en lista.
- Cache: `Map<number, { url: string; status: 'ok'|'error' }>` en memoria:
  - Si una imagen ya cargó ok, reusar instantáneamente sin loader.
  - Si falló, evitar reintentos innecesarios y mostrar error inmediato.
- Confiar en cache HTTP del navegador para el contenido.

## Estilos
- Añadir reglas en [Registros.css](file:///c:/Users/angel/Desktop/ine/Proyecto-INE/src/styles/Registros.css):
  - `.modal-overlay`, `.modal-content`, `.modal-close`, `.modal-spinner`, imagen responsiva.
  - Seguir paleta y espaciados existentes; usar variables de `tokens.css` cuando aplicable.

## Accesibilidad
- Atributos ARIA en el modal (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`).
- Enfocar el botón cerrar al abrir modal; devolver el foco al botón disparador al cerrar.

## Pruebas y Verificación
- Casos:
  - URL absoluta válida: abre y muestra.
  - URL relativa: se resuelve y muestra.
  - URL inválida/vacía: botón oculto/deshabilitado.
  - Error 404: muestra mensaje y permite reintentar.
  - Navegación por páginas con caché funcionando.
- Validar responsividad en móvil y desktop.

## Documentación en Código
- Añadir comentarios breves en `Registros.tsx` y `Registros.css` explicando:
  - Resolución de URL y supuestos.
  - Estados del modal y flujo de carga.
  - Estrategia de cache en memoria.

## Entregables
- `types/index.ts`: campo opcional de imagen.
- `pages/Registros.tsx`: columna Acciones, modal y lógica.
- `styles/Registros.css`: estilos del modal y loader.

¿Confirmas este plan para proceder con la implementación?