import { Institute, Alumno, AlumnoComment } from './types';

export const INITIAL_INSTITUTES: Institute[] = [
  {
    id: '1',
    name: 'Instituto Tecnológico del Sol',
    shortName: 'ITS',
    description: 'Líder en innovación tecnológica, ingeniería robótica y ciencias de la computación. El nido de las mentes digitales más brillantes de la región.',
    image: '/src/assets/images/institute_neo_campus_1781459216781.jpg',
    location: 'Campus Este - Distrito de Innovación',
    studentCount: 1420,
    popularCategory: 'Académico & Gaming',
    ratingAverage: 4.8,
    tipo: 'instituto'
  },
  {
    id: '2',
    name: 'Colegio Mayor de San Marcos',
    shortName: 'CMSM',
    description: 'Institución histórica y tradicional enfocada en artes del lenguaje, ciencias sociales, debate y el desarrollo de líderes del mañana.',
    image: '/src/assets/images/institute_classic_academy_1781459231074.jpg',
    location: 'Plaza Central - Zona Histórica',
    studentCount: 980,
    popularCategory: 'Líder & Artista',
    ratingAverage: 4.5,
    tipo: 'colegio'
  },
  {
    id: '3',
    name: 'Politécnico de Artes & Ciencias Digitales',
    shortName: 'PACD',
    description: 'El hotspot creativo definitivo. Música, animación 3D, desarrollo de videojuegos, diseño de modas y marketing de influencia.',
    image: '/src/assets/images/institute_polytechnic_1781459245918.jpg',
    location: 'Avenida de la Cultura - Zona Creativa',
    studentCount: 1250,
    popularCategory: 'Influencer & Artista',
    ratingAverage: 4.9,
    tipo: 'universidad'
  }
];

export const INITIAL_ALUMNOS: Alumno[] = [
  // ITS students (ID 1)
  {
    id: 'a1',
    name: 'Mateo Sebastiani',
    nickname: 'TeoDev',
    instituteId: '1',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
    course: '8vo Semestre - Ingeniería de Software',
    category: 'Académico',
    bio: 'Ganador de las Olimpiadas Nacionales de IA. Creo algoritmos por la mañana y speedrunneo juegos retro por la noche. Desarrollador principal de la red inalámbrica secreta del campus.',
    starsPopularity: 4.9,
    starsCharisma: 4.5,
    starsTalent: 5.0,
    views: 1240,
    points: 432,
    isVerified: true,
    instagram: 'teo.dev.js',
    tiktok: 'teodev'
  },
  {
    id: 'a2',
    name: 'Valeria Mendoza',
    nickname: 'ValValkiria',
    instituteId: '1',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    course: '4to Semestre - Ciberseguridad',
    category: 'Gaming',
    bio: 'Campeona nacional de Valorant. Si te hackean las cuentas, probablemente esté detrás para salvarte. Fundadora del club de eSports del instituto.',
    starsPopularity: 4.8,
    starsCharisma: 4.7,
    starsTalent: 4.9,
    views: 950,
    points: 310,
    isVerified: true,
    instagram: 'val.valkiria',
    tiktok: 'val_valkiria_val'
  },
  {
    id: 'a3',
    name: 'Diego Flores',
    nickname: 'IronDiego',
    instituteId: '1',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    course: '6to Semestre - Manufactura Robótica',
    category: 'Deportista',
    bio: 'Capitán de nuestra selección de fútbol robótico y mediocampista estrella de la liga real de futsal interuniversitaria. Combino el gimnasio con los circuitos integrados.',
    starsPopularity: 4.5,
    starsCharisma: 4.8,
    starsTalent: 4.3,
    views: 610,
    points: 195,
    isVerified: false,
    instagram: 'diego_flores_robotics'
  },

  // CMSM students (ID 2)
  {
    id: 'a4',
    name: 'Sofía Larrea',
    nickname: 'SofiOrations',
    instituteId: '2',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
    course: '5to de Secundaria - Presidencia Estudiantil',
    category: 'Líder',
    bio: 'Presidenta del consejo estudiantil. Defensora principal de los derechos estudiantiles y campeona de debate intercolegial. Amas el café o la poesía, hablemos.',
    starsPopularity: 4.9,
    starsCharisma: 5.0,
    starsTalent: 4.6,
    views: 1530,
    points: 512,
    isVerified: true,
    instagram: 'sofi.larrea',
    tiktok: 'sofilarrea_debate'
  },
  {
    id: 'a5',
    name: 'Santiago Benites',
    nickname: 'SantiGuitar',
    instituteId: '2',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    course: '4to de Secundaria - Letras & Artes',
    category: 'Artista',
    bio: 'Cantautor acústico. Es imposible no encontrarlo con la guitarra en el patio histórico del colegio. Su voz te cura cualquier mal examen.',
    starsPopularity: 4.7,
    starsCharisma: 4.9,
    starsTalent: 4.8,
    views: 820,
    points: 280,
    isVerified: false,
    instagram: 'santi_benites_music'
  },

  // PACD students (ID 3)
  {
    id: 'a6',
    name: 'Camila Rossi',
    nickname: 'CamiTrend',
    instituteId: '3',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    course: '3er Ciclo - Marketing Digital',
    category: 'Influencer',
    bio: 'Creadora de contenido Full-Time con más de 300k seguidores en TikTok. Mis videos documentando la caótica vida en el politécnico se vuelven virales cada semana. ¿Collab?',
    starsPopularity: 5.0,
    starsCharisma: 4.9,
    starsTalent: 4.7,
    views: 3120,
    points: 890,
    isVerified: true,
    instagram: 'cami.rossi',
    tiktok: 'camitrends'
  },
  {
    id: 'a7',
    name: 'Lucas Guerrero',
    nickname: 'LukaDraws',
    instituteId: '3',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200',
    course: '5to Ciclo - Diseño de Personajes 3D',
    category: 'Artista',
    bio: 'Ilustrador e instructor cyberpunk. Diseñador del logo oficial de WikiStars5. Siempre con sus audífonos gigantes dibujando en su tableta digitalizadora en la cafetería.',
    starsPopularity: 4.6,
    starsCharisma: 4.4,
    starsTalent: 4.9,
    views: 1040,
    points: 345,
    isVerified: true,
    instagram: 'luka_draws_cyber'
  }
];

export const INITIAL_COMMENTS: AlumnoComment[] = [
  {
    id: 'c1',
    alumnoId: 'a1',
    author: 'Javier Pérez',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
    text: 'Mateo me salvó la vida explicándome bases de datos relacionales en 15 minutos en el pasillo antes del parcial. Un genio absoluto.',
    status: 'student',
    createdAt: '2026-06-13T14:30:00Z',
    likes: 24
  },
  {
    id: 'c2',
    alumnoId: 'a1',
    author: 'Estudiante Anónimo',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
    text: 'Se dice que él redactó el código fuente del script que automatiza las reservas de mesas de estudio. ¡Queremos saber si es real!',
    status: 'anonymous',
    createdAt: '2026-06-14T02:15:00Z',
    likes: 12
  },
  {
    id: 'c3',
    alumnoId: 'a6',
    author: 'María P.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100',
    text: 'Aparecí de fondo en su último vblog y mi cuenta sumó 500 seguidores. Cami siempre re buena onda con todos en los pasillos.',
    status: 'student',
    createdAt: '2026-06-14T08:00:00Z',
    likes: 45
  },
  {
    id: 'c4',
    alumnoId: 'a4',
    author: 'Director Adjunto de Debate',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100',
    text: 'Su elocuencia y ética de liderazgo son ejemplares. Definiendo el estándar alto para CMSM.',
    status: 'verified',
    createdAt: '2026-06-11T12:00:00Z',
    likes: 38
  }
];
