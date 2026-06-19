export interface Institute {
  id: string;
  name: string;
  shortName: string;
  description: string;
  image: string;
  location: string;
  studentCount: number;
  popularCategory: string;
  ratingAverage: number;
}

export interface Alumno {
  id: string;
  name: string;
  nickname?: string;
  instituteId: string;
  avatar: string;
  course: string;
  category: 'Artista' | 'Deportista' | 'Académico' | 'Influencer' | 'Gaming' | 'Líder';
  bio: string;
  starsPopularity: number; // 0-5
  starsCharisma: number; // 0-5
  starsTalent: number; // 0-5
  views: number;
  points: number; // upvotes / social points
  isVerified?: boolean;
  instagram?: string;
  tiktok?: string;
  nominationReason?: string;
}

export interface AlumnoComment {
  id: string;
  alumnoId: string;
  author: string;
  avatar: string;
  text: string;
  status: 'anonymous' | 'student' | 'verified';
  createdAt: string;
  likes: number;
}
