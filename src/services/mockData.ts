// Datos de prueba para desarrollo sin backend

import type { Usuario, RegistroINE, EstadisticasGeneral } from '../types';

// Usuario de prueba
export const mockUsuario: Usuario = {
  id: 1,
  username: 'usuario_demo',
  email: 'demo@sistema-ine.com',
  nombres_asignados: ['521234567890', '521234567891', '521234567892'],
  rol: 'usuario',
};

export const mockUsuarioAdmin: Usuario = {
  id: 2,
  username: 'admin_demo',
  email: 'admin@sistema-ine.com',
  nombres_asignados: ['521234567890', '521234567891', '521234567892', '521234567893'],
  rol: 'admin',
};

// Registros de prueba
export const mockRegistros: RegistroINE[] = [
  {
    id: 1,
    from_number: '521234567890',
    Nombre: 'Juan Pérez García',
    Domicilio: 'Calle Principal 123, Col. Centro',
    ClaveDeElector: 'PRGJNA85120112H100',
    CURP: 'PEGJ850112HDFRNN09',
    AnioRegistro: '2010',
    FechaNacimiento: new Date('1985-01-12'),
    Seccion: '0123',
    Vigencia: '2027',
    fecha_registro: new Date('2024-10-15T10:30:00'),
  },
  {
    id: 2,
    from_number: '521234567891',
    Nombre: 'María López Hernández',
    Domicilio: 'Av. Reforma 456, Col. Juárez',
    ClaveDeElector: 'LPHMAR90031523M200',
    CURP: 'LOHM900315MDFRNN01',
    AnioRegistro: '2012',
    FechaNacimiento: new Date('1990-03-15'),
    Seccion: '0124',
    Vigencia: '2028',
    fecha_registro: new Date('2024-10-20T14:20:00'),
  },
  {
    id: 3,
    from_number: '521234567890',
    Nombre: 'Carlos Ramírez Sánchez',
    Domicilio: 'Calle Morelos 789, Col. Centro',
    ClaveDeElector: 'RASCAR88070734H300',
    CURP: 'RASC880707HDFRNN08',
    AnioRegistro: '2015',
    FechaNacimiento: new Date('1988-07-07'),
    Seccion: '0123',
    Vigencia: '2026',
    fecha_registro: new Date('2024-10-25T09:15:00'),
  },
  {
    id: 4,
    from_number: '521234567892',
    Nombre: 'Ana Martínez González',
    Domicilio: 'Blvd. Miguel Alemán 321, Col. Del Valle',
    ClaveDeElector: 'MAGAN92051245M400',
    CURP: 'MAGA920512MDFRNN02',
    AnioRegistro: '2018',
    FechaNacimiento: new Date('1992-05-12'),
    Seccion: '0125',
    Vigencia: '2029',
    fecha_registro: new Date('2024-10-28T16:45:00'),
  },
  {
    id: 5,
    from_number: '521234567891',
    Nombre: 'Luis Fernández Torres',
    Domicilio: 'Calle Hidalgo 654, Col. Centro',
    ClaveDeElector: 'FETLUI95092056H500',
    CURP: 'FETL950920HDFRNN03',
    AnioRegistro: '2020',
    FechaNacimiento: new Date('1995-09-20'),
    Seccion: '0124',
    Vigencia: '2030',
    fecha_registro: new Date('2024-10-30T11:00:00'),
  },
];

// Estadísticas de prueba
export const mockEstadisticas: EstadisticasGeneral = {
  total_registros: 156,
  registros_hoy: 12,
  registros_mes: 89,
  registros_por_numero: [
    { numero: '521234567890', cantidad: 45 },
    { numero: '521234567891', cantidad: 38 },
    { numero: '521234567892', cantidad: 42 },
    { numero: '521234567893', cantidad: 31 },
  ],
  registros_por_estado: [
    { estado: 'Ciudad de México', cantidad: 52 },
    { estado: 'Estado de México', cantidad: 38 },
    { estado: 'Jalisco', cantidad: 24 },
    { estado: 'Nuevo León', cantidad: 18 },
    { estado: 'Puebla', cantidad: 12 },
    { estado: 'Veracruz', cantidad: 8 },
    { estado: 'Guanajuato', cantidad: 4 },
  ],
  registros_por_seccion: [
    { seccion: '0123', cantidad: 35 },
    { seccion: '0124', cantidad: 28 },
    { seccion: '0125', cantidad: 22 },
    { seccion: '0126', cantidad: 18 },
    { seccion: '0127', cantidad: 15 },
  ],
};

// Generar más registros aleatorios para tener datos más completos
export const generarRegistrosAdicionales = (cantidad: number): RegistroINE[] => {
  const nombres = ['Pedro', 'Laura', 'Jorge', 'Sofía', 'Miguel', 'Carmen', 'Ricardo', 'Patricia'];
  const apellidos = ['García', 'López', 'Martínez', 'Rodríguez', 'Hernández', 'González', 'Pérez', 'Sánchez'];
  const secciones = ['0123', '0124', '0125', '0126', '0127', '0128', '0129', '0130'];
  const numeros = ['521234567890', '521234567891', '521234567892', '521234567893'];

  const registros: RegistroINE[] = [];

  for (let i = 0; i < cantidad; i++) {
    const nombre = nombres[Math.floor(Math.random() * nombres.length)];
    const apellido1 = apellidos[Math.floor(Math.random() * apellidos.length)];
    const apellido2 = apellidos[Math.floor(Math.random() * apellidos.length)];
    
    registros.push({
      id: 100 + i,
      from_number: numeros[Math.floor(Math.random() * numeros.length)],
      Nombre: `${nombre} ${apellido1} ${apellido2}`,
      Domicilio: `Calle ${Math.floor(Math.random() * 999)} #${Math.floor(Math.random() * 999)}`,
      ClaveDeElector: `CLV${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
      CURP: `CURP${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
      AnioRegistro: String(2010 + Math.floor(Math.random() * 14)),
      FechaNacimiento: new Date(1970 + Math.floor(Math.random() * 35), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      Seccion: secciones[Math.floor(Math.random() * secciones.length)],
      Vigencia: String(2024 + Math.floor(Math.random() * 10)),
      fecha_registro: new Date(2024, 9, Math.floor(Math.random() * 30) + 1, Math.floor(Math.random() * 24), Math.floor(Math.random() * 60)),
    });
  }

  return registros;
};

export const todosLosMockRegistros = [...mockRegistros, ...generarRegistrosAdicionales(50)];
