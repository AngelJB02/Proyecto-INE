# Sistema INE - Frontend

Sistema de gestión y visualización de registros electorales del INE con integración a WhatsApp vía n8n.

## 🚀 Características

- ✅ Sistema de autenticación de usuarios
- 📊 Dashboard con estadísticas en tiempo real
- 📈 Gráficas interactivas (Recharts)
- 🗺️ Visualización de datos en mapa (Leaflet + TopoJSON)
- 🔍 Filtros avanzados por fecha, número, estado, sección
- 👥 Gestión de permisos por usuario
- 📱 Vinculación de números de WhatsApp por usuario
- 📋 Tabla completa de registros con búsqueda

## 🛠️ Tecnologías

- **React 19** con TypeScript
- **Vite** - Build tool ultra rápido
- **React Router** - Navegación
- **Axios** - Cliente HTTP
- **Recharts** - Gráficas y visualizaciones
- **Leaflet** - Mapas interactivos
- **date-fns** - Manejo de fechas

## 📁 Estructura del Proyecto

```
src/
├── components/        # Componentes reutilizables
│   ├── BarChart.tsx
│   ├── Layout.tsx
│   ├── ProtectedRoute.tsx
│   └── StatsCard.tsx
├── pages/            # Páginas principales
│   ├── Dashboard.tsx
│   ├── Estadisticas.tsx
│   ├── Login.tsx
│   ├── Mapa.tsx
│   └── Registros.tsx
├── context/          # Context API
│   └── AuthContext.tsx
├── services/         # Servicios API
│   └── api.ts
├── types/           # Tipos TypeScript
│   └── index.ts
├── styles/          # Archivos CSS
│   ├── App.css
│   ├── Dashboard.css
│   ├── Estadisticas.css
│   ├── Layout.css
│   ├── Login.css
│   ├── Mapa.css
│   ├── Registros.css
│   ├── StatsCard.css
│   └── index.css
├── App.tsx
└── main.tsx
```

## 📦 Instalación

### Requisitos Previos

- Node.js 18+
- npm o yarn

### Pasos de Instalación

1. **Instalar dependencias** (ya instaladas)
```bash
npm install
```


2. **Configurar variables de entorno**

El archivo `.env` ya está configurado con:

```env
VITE_API_URL=https://proyecto-ine.onrender.com/api
```

3. **Ejecutar en desarrollo**
```bash
npm run dev
```

El proyecto se abrirá en `http://localhost:5173`

## 🔧 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Preview de la build de producción
- `npm run lint` - Ejecuta el linter

## 🗺️ Configuración del Mapa

Para que el mapa funcione correctamente, necesitas:

1. Descargar el archivo TopoJSON de México
2. Colocarlo en `public/data/mexico.topojson`
3. El componente `Mapa.tsx` ya está preparado para cargarlo

Puedes obtener TopoJSON de México de:
- [Mexican Geographic Data](https://github.com/ponentesincausa/mexico-geojson)
- [Natural Earth](https://www.naturalearthdata.com/)

## 🔐 Sistema de Autenticación

El sistema incluye:

- Login con usuario y contraseña
- Token JWT almacenado en localStorage
- Protección de rutas mediante `ProtectedRoute`
- Context API para estado global de autenticación
- Diferenciación entre roles `admin` y `usuario`

### Roles de Usuario

**Admin:**
- Acceso a todas las estadísticas
- Puede ver datos de todos los usuarios
- Gestión completa del sistema

**Usuario:**
- Acceso solo a sus números asignados
- Estadísticas personalizadas
- Dashboard limitado a su información

## 📡 API Backend

El frontend espera los siguientes endpoints:

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario

### Registros
- `GET /api/registros` - Obtener todos los registros (admin)
- `GET /api/registros/usuario` - Registros del usuario actual
- `GET /api/registros/:id` - Obtener un registro específico

### Estadísticas
- `GET /api/estadisticas/general` - Estadísticas generales (admin)
- `GET /api/estadisticas/usuario` - Estadísticas del usuario
- `GET /api/estadisticas/numero/:numero` - Estadísticas por número

### Códigos Postales
- `GET /api/codigos-postales/:cp` - Buscar por código postal
- `GET /api/codigos-postales/estados` - Listar estados
- `GET /api/codigos-postales/municipios/:estado` - Municipios por estado

## 🎨 Personalización

### Colores

Los colores principales se definen en `src/styles/index.css`:

```css
:root {
  --primary-color: #4f46e5;
  --secondary-color: #10b981;
  --danger-color: #ef4444;
  --warning-color: #f59e0b;
  /* ... más colores */
}
```

## 🚀 Despliegue

### Build para Producción

```bash
npm run build
```

Los archivos optimizados estarán en la carpeta `dist/`

### Despliegue en Vercel

```bash
npm install -g vercel
vercel
```

### Despliegue en Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

## 📝 Próximos Pasos

Para completar el sistema necesitas:

1. **Backend en Node.js/Express** con:
   - API REST con los endpoints mencionados
   - Autenticación JWT
   - Conexión a MySQL
   - CORS configurado

2. **Base de datos MySQL** con:
   - Tabla `ine_registros` (ya tienes el esquema)
   - Tabla `usuarios` para login
   - Tabla `usuarios_numeros` para asignación de WhatsApp
   - Tabla `codigos_postales` con el CSV cargado

3. **Integración n8n**:
   - Webhook para recibir imágenes de WhatsApp
   - OCR para extraer datos
   - INSERT a MySQL

## 📄 Licencia

Este proyecto es privado.

## 👥 Autor

Desarrollado para gestión de registros del INE.

