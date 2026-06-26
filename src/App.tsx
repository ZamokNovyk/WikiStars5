import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Award, 
  Sparkles, 
  TrendingUp, 
  Heart, 
  MessageSquare, 
  Share2, 
  UserPlus, 
  ArrowLeft, 
  CheckCircle2, 
  School, 
  MapPin, 
  Users, 
  Flame, 
  PlusCircle, 
  Download, 
  X, 
  Send,
  GraduationCap,
  Building,
  Landmark, 
  Star, 
  Crown, 
  Gamepad2, 
  Trophy, 
  Music, 
  Brain, 
  Shield, 
  Smartphone,
  ExternalLink,
  Plus,
  BookOpen,
  Swords,
  SlidersHorizontal,
  List,
  Grid,
  HeartCrack,
  Lock,
  Home,
  User,
  History,
  Trash2,
  Edit,
  Edit2,
  Calendar,
  Link2,
  Pencil,
  Instagram,
  Youtube,
  Facebook,
  Twitter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Institute, Alumno, AlumnoComment } from './types';
import { INITIAL_INSTITUTES, INITIAL_ALUMNOS, INITIAL_COMMENTS } from './data';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot, serverTimestamp, increment, runTransaction, deleteField } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

function generateDocId(rawName: string) {
  return rawName.toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-0.]/g, '');
}

const getGuestId = () => {
  let guestId = localStorage.getItem('wikistars_guest_id');
  if (!guestId) {
    guestId = 'g_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('wikistars_guest_id', guestId);
  }
  return guestId;
};

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function generateSearchArrays(nombre: string) {
  const normalized = nombre.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9\s]/g, ""); // keep only safe alphanumeric words
  
  const tokens = normalized.split(/\s+/).filter(t => t.length > 0);
  const searchTokens = Array.from(new Set(tokens));
  
  const searchKeywordsSet = new Set<string>();
  for (const token of tokens) {
    for (let i = 1; i <= token.length; i++) {
      searchKeywordsSet.add(token.substring(0, i));
    }
  }
  const searchKeywords = Array.from(searchKeywordsSet);
  
  return { searchTokens, searchKeywords };
}

function normalizeText(text: string): string {
  if (!text) return '';
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9\s]/g, " "); // replace special characters with spaces
}

export default function App() {
  // Load state from localStorage or use initial values
  const [institutes, setInstitutes] = useState<Institute[]>(INITIAL_INSTITUTES);
  const [alumnos, setAlumnos] = useState<Alumno[]>(INITIAL_ALUMNOS);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [comments, setComments] = useState<AlumnoComment[]>(INITIAL_COMMENTS);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    nickname: string;
    instituteId: string;
    category: string;
    userId: string;
    photoURL?: string;
    email?: string;
    sexo?: 'femenino' | 'masculino' | '';
  } | null>(() => {
    const saved = localStorage.getItem('wikistars_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Navigation and filters
  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);
  const [selectedAlumnoId, setSelectedAlumnoId] = useState<string | null>(null);
  const [selectedProfessorId, setSelectedProfessorId] = useState<string | null>(null);
  const [activeProfSubTab, setActiveProfSubTab] = useState<'Wiki' | 'Reseñas' | 'Crushes' | 'Ship'>('Reseñas');
  const [profReviews, setProfReviews] = useState<any[]>([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [ratingHover, setRatingHover] = useState<number | null>(null);
  const [ratingOpportunities, setRatingOpportunities] = useState<number>(() => {
    const saved = localStorage.getItem('wikistars_rating_opportunities');
    return saved !== null ? parseInt(saved, 10) : 6;
  });
  const [userTodayVotes, setUserTodayVotes] = useState<number[]>([]);
  const [profCrushes, setProfCrushes] = useState<any[]>([]);
  const [newCrushText, setNewCrushText] = useState('');
  const [isSubmittingCrush, setIsSubmittingCrush] = useState(false);
  const [profShips, setProfShips] = useState<any[]>([]);
  const [userVotedShipId, setUserVotedShipId] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, { yoTeConozco: boolean; fan: boolean; crush: boolean }>>({});
  const [isVotingProf, setIsVotingProf] = useState(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Create Institute Modal State
  const [isCreateInstituteModalOpen, setIsCreateInstituteModalOpen] = useState(false);
  const [createInstituteStep, setCreateInstituteStep] = useState<1 | 2>(1);
  const [newInstituteName, setNewInstituteName] = useState('');
  const [newInstituteTipo, setNewInstituteTipo] = useState('instituto');
  const [isSubmittingInstitute, setIsSubmittingInstitute] = useState(false);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('Todos');

  // Campus-specific Navigation & View Modes
  const [activeCampusTab, setActiveCampusTab] = useState<'Wiki' | 'Profesores' | 'Rachas'>('Wiki');
  const [campusViewMode, setCampusViewMode] = useState<'list' | 'grid'>('list'); // Default to list view as shown in the mockup
  const [studentSortOrder, setStudentSortOrder] = useState<'puntos' | 'nombre' | 'estrellas'>('puntos');
  const [showShareToast, setShowShareToast] = useState(false);
  const [professorVotes, setProfessorVotes] = useState<Record<string, number>>({ 'Alberto': 148, 'Carmen': 165 });
  const [votedVersus, setVotedVersus] = useState<string | null>(null);
  const [streakClaimed, setStreakClaimed] = useState(false);
  const [userStreakCount, setUserStreakCount] = useState(2);

  // Tab navigation for mobile
  const [activeBottomTab, setActiveBottomTab] = useState<'feed' | 'profile'>('feed');
  const [userProfile, setUserProfile] = useState<any>(null);

  // Sync state with URL
  useEffect(() => {
    if (selectedAlumnoId) {
      window.history.pushState(null, '', `/profile/${selectedAlumnoId}`);
    } else if (selectedInstituteId) {
      window.history.pushState(null, '', `/campus/${selectedInstituteId}`);
    } else {
      window.history.pushState(null, '', '/');
    }
  }, [selectedAlumnoId, selectedInstituteId]);

  // Restore state from URL on load
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/profile/')) {
      const id = path.split('/')[2];
      setSelectedAlumnoId(id);
    } else if (path.startsWith('/campus/')) {
      const id = path.split('/')[2];
      setSelectedInstituteId(id);
    }
  }, []);

  // Edit Profile form states
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileNickname, setEditProfileNickname] = useState('');
  const [editProfileSexo, setEditProfileSexo] = useState<'femenino' | 'masculino' | ''>('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Wiki Edit States
  const [isEditingWiki, setIsEditingWiki] = useState(false);
  const [wikiPerfilPhoto, setWikiPerfilPhoto] = useState('');
  const [wikiPortadaPhoto, setWikiPortadaPhoto] = useState('');
  const [wikiAnoFundacion, setWikiAnoFundacion] = useState('');
  const [wikiInstagram, setWikiInstagram] = useState('');
  const [wikiYoutube, setWikiYoutube] = useState('');
  const [wikiFacebook, setWikiFacebook] = useState('');
  const [wikiTwitter, setWikiTwitter] = useState('');
  const [wikiErrors, setWikiErrors] = useState<Record<string, string>>({});
  const [isSubmittingWikiEdit, setIsSubmittingWikiEdit] = useState(false);

  useEffect(() => {
    if (activeBottomTab === 'profile') {
      if (currentUser?.userId) {
        const fetchProfile = async () => {
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.userId));
            if (userDoc.exists()) {
              const data = userDoc.data();
              const prof = {
                displayName: data.displayName || data.name || currentUser.name || 'Estudiante',
                nickname: data.nickname || currentUser.nickname || 'estudiante',
                email: data.email || currentUser.email || 'Invitado (No vinculado)',
                photoURL: data.photoURL || currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
                sexo: data.sexo || currentUser.sexo || '',
                userId: currentUser.userId
              };
              setUserProfile(prof);
              setEditProfileName(prof.displayName);
              setEditProfileNickname(prof.nickname);
              setEditProfileSexo(prof.sexo as any);
            } else {
              const prof = {
                displayName: currentUser.name || 'Estudiante',
                nickname: currentUser.nickname || 'estudiante',
                email: currentUser.email || 'Invitado (No vinculado)',
                photoURL: currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
                sexo: currentUser.sexo || '',
                userId: currentUser.userId
              };
              setUserProfile(prof);
              setEditProfileName(prof.displayName);
              setEditProfileNickname(prof.nickname);
              setEditProfileSexo(prof.sexo as any);
            }
          } catch (err) {
            console.error("Error fetching user profile:", err);
            const prof = {
              displayName: currentUser.name || 'Estudiante',
              nickname: currentUser.nickname || 'estudiante',
              email: currentUser.email || 'Invitado (No vinculado)',
              photoURL: currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
              sexo: currentUser.sexo || '',
              userId: currentUser.userId
            };
            setUserProfile(prof);
            setEditProfileName(prof.displayName);
            setEditProfileNickname(prof.nickname);
            setEditProfileSexo(prof.sexo as any);
          }
        };
        fetchProfile();
      } else {
        // completely anonymous
        const prof = {
          displayName: 'Invitado Anónimo',
          nickname: 'anonimo',
          email: 'No vinculado',
          photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
          sexo: '',
          userId: 'anonymous'
        };
        setUserProfile(prof);
        setEditProfileName('');
        setEditProfileNickname('');
        setEditProfileSexo('');
      }
    }
  }, [activeBottomTab, currentUser]);

  // Real-time Professors & Add Professor States
  const [professors, setProfessors] = useState<any[]>([]);
  const [isAddProfessorModalOpen, setIsAddProfessorModalOpen] = useState(false);
  const [newProfNombre, setNewProfNombre] = useState('');
  const [newProfApellidos, setNewProfApellidos] = useState('');
  const [newProfCourse, setNewProfCourse] = useState('');
  const [newProfGender, setNewProfGender] = useState<'male' | 'female'>('male');
  const [newProfApproval, setNewProfApproval] = useState(95);
  const [isSubmittingProf, setIsSubmittingProf] = useState(false);

  // Modals state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
  
  // Edit Wiki Modal State
  const [isEditWikiModalOpen, setIsEditWikiModalOpen] = useState(false);
  const [editWikiEdad, setEditWikiEdad] = useState('');
  const [editWikiAltura, setEditWikiAltura] = useState('');
  const [editWikiPeso, setEditWikiPeso] = useState('');
  const [editWikiEstadoCivil, setEditWikiEstadoCivil] = useState('');
  const [editWikiDay, setEditWikiDay] = useState('');
  const [editWikiMonth, setEditWikiMonth] = useState('');
  const [editWikiYear, setEditWikiYear] = useState('');
  const [isSubmittingWiki, setIsSubmittingWiki] = useState(false);

  // PWA installation state & handlers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      triggerNotice('🎉 ¡Fabuloso! WikiStars 5 se ha instalado con éxito.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handlePWAInstall = async () => {
    if (!deferredPrompt) {
      triggerNotice('El navegador no soporta o ya tiene instalada la app. Intenta añadirla desde el menú del navegador.');
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        triggerNotice('¡Instalación aceptada! Disfruta de WikiStars 5.');
      } else {
        triggerNotice('Instalación cancelada.');
      }
    } catch (err) {
      console.error('Error al intentar instalar:', err);
      triggerNotice('No se pudo abrir la instalación del navegador. Intenta desde el menú del navegador.');
    }
    setDeferredPrompt(null);
  };

  // Community notification logs
  const [socialLogs, setSocialLogs] = useState<string[]>([
    '🔥 Mateo Sebastiani obtuvo un punto de popularidad hace 2 minutos',
    '🎨 Camila Rossi sumó 30 visualizaciones de perfil hace 5 minutos',
    '🎓 Sofía Larrea lidera el ranking en el Colegio Mayor de San Marcos',
    '💡 ¡Prueba nominando a un compañero presionando "Nominar una Estrella!"',
  ]);

  // Nomination form states
  const [nominateName, setNominateName] = useState('');
  const [nominateNickname, setNominateNickname] = useState('');
  const [nominateCourse, setNominateCourse] = useState('');
  const [nominateCategory, setNominateCategory] = useState<'Artista' | 'Deportista' | 'Académico' | 'Influencer' | 'Gaming' | 'Líder'>('Influencer');
  const [nominateBio, setNominateBio] = useState('');
  const [nominateReason, setNominateReason] = useState('');
  const [nominateAvatar, setNominateAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200');

  // Comment form state
  const [newCommentText, setNewCommentText] = useState('');
  const [postAsAnonymous, setPostAsAnonymous] = useState(true);

  // Profile Create states
  const [joinName, setJoinName] = useState('');
  const [joinNickname, setJoinNickname] = useState('');
  const [joinInstituteId, setJoinInstituteId] = useState('1');
  const [joinCategory, setJoinCategory] = useState('Artista');

  // Notification Banner
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Synchronize alumnos and comments with Firestore in real-time
  useEffect(() => {
    const unsubscribeAlumnos = onSnapshot(collection(db, 'alumnos'), (snapshot) => {
      const list: Alumno[] = [];
      snapshot.forEach((snapDoc) => {
        list.push(snapDoc.data() as Alumno);
      });
      setAlumnos(list);
    }, (error) => {
      console.warn("Could not fetch alumnos (offline or permissions):", error);
    });

    const unsubscribeComments = onSnapshot(collection(db, 'comments'), async (snapshot) => {
      if (snapshot.empty) {
        // If empty, seed initial comments
        try {
          for (const c of INITIAL_COMMENTS) {
            await setDoc(doc(db, 'comments', c.id), c);
          }
        } catch (err) {
          console.error("Failed to seed initial comments:", err);
        }
      } else {
        const list: AlumnoComment[] = [];
        snapshot.forEach((snapDoc) => {
          list.push(snapDoc.data() as AlumnoComment);
        });
        // Sort descending by date
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setComments(list);
      }
    }, (error) => {
      console.warn("Could not fetch comments (offline or permissions):", error);
    });

    const unsubscribeInstitutes = onSnapshot(collection(db, 'centros.educativos'), async (snapshot) => {
      const list: Institute[] = [];
      snapshot.forEach((snapDoc) => {
        const data = snapDoc.data();
        list.push({
          id: snapDoc.id,
          name: data.nombre || data.name || '',
          shortName: data.shortName || (data.nombre ? data.nombre.split(' ').map((w: string) => w[0]).join('').toUpperCase().substring(0, 5) : 'INST'),
          description: data.description || 'Institución educativa registrada.',
          image: data.perfilPhotoUrl || data.image || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=300',
          location: data.location || 'Sede Principal',
          studentCount: data.studentCount || 0,
          popularCategory: data.popularCategory || 'General',
          ratingAverage: data.ratingAverage || 4.5,
          perfilPhotoUrl: data.perfilPhotoUrl || '',
          portadaPhotoUrl: data.portadaPhotoUrl || '',
          anoDeFundacion: data.anoDeFundacion !== undefined ? data.anoDeFundacion : null,
          redesSociales: data.redesSociales || {}
        });
      });
      setInstitutes(list);
    }, (error) => {
      console.warn("Could not fetch centers (offline or permissions):", error);
    });

    const unsubscribePerfiles = onSnapshot(collection(db, 'perfiles'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((snapDoc) => {
        list.push(snapDoc.data());
      });
      setPerfiles(list);
    }, (error) => {
      console.warn("Could not fetch profiles:", error);
    });

    return () => {
      unsubscribeAlumnos();
      unsubscribeComments();
      unsubscribeInstitutes();
      unsubscribePerfiles();
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('wikistars_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('wikistars_user');
    }
  }, [currentUser]);

  // Load professors for active institute in real-time
  useEffect(() => {
    if (!selectedInstituteId) {
      setProfessors([]);
      return;
    }

    const path = `centros.educativos/${selectedInstituteId}/profesores`;
    const unsubscribe = onSnapshot(collection(db, path), async (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((snapDoc) => {
        list.push(snapDoc.data());
      });
      setProfessors(list);
    }, (error) => {
      console.warn("Could not fetch professors:", error);
    });

    return () => unsubscribe();
  }, [selectedInstituteId]);

  // Check user's votes for the selected professor
  useEffect(() => {
    if (!selectedProfessorId) return;
    const userId = auth.currentUser?.uid || getGuestId();
    
    const checkUserVotes = async () => {
      if (!selectedInstituteId) return;
      try {
        const yoRef = doc(db, `centros.educativos/${selectedInstituteId}/profesores/${selectedProfessorId}/${'yoTeConozco'}`, userId);
        const fanRef = doc(db, `centros.educativos/${selectedInstituteId}/profesores/${selectedProfessorId}/${'fan'}`, userId);
        const crushRef = doc(db, `centros.educativos/${selectedInstituteId}/profesores/${selectedProfessorId}/${'crushes'}`, userId);
        
        const [yoSnap, fanSnap, crushSnap] = await Promise.all([getDoc(yoRef), getDoc(fanRef), getDoc(crushRef)]);
        
        setUserVotes(prev => ({
          ...prev,
          [selectedProfessorId]: {
            yoTeConozco: yoSnap.exists(),
            fan: fanSnap.exists(),
            crush: crushSnap.exists() && crushSnap.data()?.votedAt !== undefined
          }
        }));
      } catch (err) {
        console.warn("Could not check user votes:", err);
      }
    };
    
    checkUserVotes();
  }, [selectedProfessorId, auth.currentUser]);

  // Synchronize Crushes, Ships and Reviews for the selected professor in real-time
  useEffect(() => {
    if (!selectedProfessorId) {
      setProfCrushes([]);
      setProfShips([]);
      setProfReviews([]);
      setUserVotedShipId(null);
      setUserTodayVotes([]);
      return;
    }

    const userId = auth.currentUser?.uid || getGuestId();
    if (!selectedInstituteId) return;

    // 1. Sync Crushes
    const crushesRef = collection(db, `centros.educativos/${selectedInstituteId}/profesores/${selectedProfessorId}/crushes`);
    const unsubCrushes = onSnapshot(crushesRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.text) {
          list.push({ id: docSnap.id, ...data });
        }
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setProfCrushes(list);
    });

    // 2. Sync Ships
    const shipsRef = collection(db, `centros.educativos/${selectedInstituteId}/profesores/${selectedProfessorId}/ships`);
    const unsubShips = onSnapshot(shipsRef, async (snapshot) => {
      if (snapshot.empty) {
        const initialShips = [
          { id: 'slide', label: 'Las diapositivas infinitas', votes: 12 },
          { id: 'coffee', label: 'El café bien cargado de las 8 AM', votes: 19 },
          { id: 'marker', label: 'El plumón acrílico rojo que nunca pinta', votes: 8 },
          { id: 'silence', label: 'El silencio incómodo después de una pregunta', votes: 15 }
        ];
        try {
          for (const s of initialShips) {
            await setDoc(doc(db, `centros.educativos/${selectedInstituteId}/profesores/${selectedProfessorId}/ships`, s.id), s);
          }
        } catch (err) {
          console.warn("Failed to seed initial ships:", err);
        }
      } else {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        list.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        setProfShips(list);
      }
    });

    // 3. Sync Reviews (Reseñas)
    const reviewsRef = collection(db, `centros.educativos/${selectedInstituteId}/profesores/${selectedProfessorId}/reviews`);
    const unsubReviews = onSnapshot(reviewsRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setProfReviews(list);
    });

    // 4. Check if user voted for a ship
    const checkShipVote = async () => {
      try {
        const voteRef = doc(db, `perfiles/${selectedProfessorId}/shipsVotedBy`, userId);
        const voteSnap = await getDoc(voteRef);
        if (voteSnap.exists()) {
          setUserVotedShipId(voteSnap.data().shipId || null);
        } else {
          setUserVotedShipId(null);
        }
      } catch (err) {
        console.warn("Error checking ship vote:", err);
      }
    };
    checkShipVote();

    // 5. Load rating opportunities & history today (with smart local storage caching to minimize Firestore reads)
    const loadRatingData = async () => {
      const todayStr = getLocalDateString();
      const cacheKey = `wikistars_votes_${userId}_${selectedProfessorId}_${todayStr}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.votes) && typeof parsed.opportunities === 'number') {
            setUserTodayVotes(parsed.votes);
            setRatingOpportunities(parsed.opportunities);
            return;
          }
        } catch (e) {
          console.warn("Error parsing cached ratings:", e);
        }
      }

      // If not cached, fetch ONCE from Firestore
      try {
        const userRatingDocRef = doc(db, `centros.educativos/${selectedInstituteId}/profesores/${selectedProfessorId}/ratings`, userId);
        const userHistoryColRef = collection(db, `centros.educativos/${selectedInstituteId}/profesores/${selectedProfessorId}/ratings/${userId}/history`);

        const [ratingSnap, historySnap] = await Promise.all([
          getDoc(userRatingDocRef),
          getDocs(userHistoryColRef)
        ]);

        let lives = 6;
        if (ratingSnap.exists()) {
          const data = ratingSnap.data();
          if (data.lastVotedDate === todayStr) {
            lives = typeof data.lives === 'number' ? data.lives : 6;
          }
        }

        const docsList = historySnap.docs.map(d => d.data());
        const todayVotes = docsList
          .filter(item => {
            if (!item.createdAt) return false;
            try {
              const dateObj = new Date(item.createdAt);
              const y = dateObj.getFullYear();
              const m = String(dateObj.getMonth() + 1).padStart(2, '0');
              const d = String(dateObj.getDate()).padStart(2, '0');
              return `${y}-${m}-${d}` === todayStr;
            } catch {
              return false;
            }
          })
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map(item => item.rating);

        setUserTodayVotes(todayVotes);
        setRatingOpportunities(lives);

        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify({ votes: todayVotes, opportunities: lives }));
      } catch (err) {
        console.warn("Error fetching rating data from Firestore:", err);
        setUserTodayVotes([]);
        setRatingOpportunities(6);
      }
    };

    loadRatingData();

    return () => {
      unsubCrushes();
      unsubShips();
      unsubReviews();
    };
  }, [selectedProfessorId, auth.currentUser]);

  const handleAddProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstituteId || !newProfNombre.trim() || !newProfApellidos.trim()) return;

    setIsSubmittingProf(true);
    try {
      const nombreCompleto = `${newProfNombre.trim()} ${newProfApellidos.trim()}`;
      const profId = nombreCompleto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s.-]/g, '')
        .trim()
        .replace(/\s+/g, '.');

      const { searchTokens, searchKeywords } = generateSearchArrays(nombreCompleto.trim());

      const profData = {
        id: profId,
        nombreCompleto: nombreCompleto.trim(),
        nombre: newProfNombre.trim(),
        apellidos: newProfApellidos.trim(),
        gender: newProfGender,
        instituteId: selectedInstituteId,
        createdAt: new Date().toISOString(),
        searchTokens,
        searchKeywords
      };

      // 1. Save in subcollection: centros.educativos/{institutoId}/profesores/{profId}
      const subCollPath = `centros.educativos/${selectedInstituteId}/profesores`;
      await setDoc(doc(db, subCollPath, profId), profData);

      // 2. Save in root general collection: perfiles/{profId}
      await setDoc(doc(db, 'perfiles', profId), {
        ...profData,
        tipo: 'profesor'
      });

      setNewProfNombre('');
      setNewProfApellidos('');
      setNewProfCourse('');
      setNewProfGender('male');
      setNewProfApproval(95);
      setIsAddProfessorModalOpen(false);
      
      pushSocialLog(`👨‍🏫 Se agregó al profesor ${profData.nombreCompleto.split(' ')[0]} en el campus!`);
      triggerNotice('¡Profesor agregado exitosamente!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `centros.educativos/${selectedInstituteId}/profesores`);
    } finally {
      setIsSubmittingProf(false);
    }
  };

  const handleVoteProfessorType = async (profId: string, type: 'yoTeConozco' | 'fan') => {
    if (isVotingProf) return;
    const userId = auth.currentUser?.uid || getGuestId();
    const otherType = type === 'yoTeConozco' ? 'fan' : 'yoTeConozco';
    
    const currentVotes = userVotes[profId] || { yoTeConozco: false, fan: false, crush: false };
    const isCurrentlyVoted = currentVotes[type];
    const isOtherVoted = currentVotes[otherType];
    
    setIsVotingProf(true);
    try {
      await runTransaction(db, async (transaction) => {
        const timestamp = new Date().toISOString();
        const instDocRef = selectedInstituteId ? doc(db, `centros.educativos/${selectedInstituteId}/profesores`, profId) : null;
        
        if (!instDocRef) throw new Error("No institute selected");

        // 1. If currently voted, remove it
        if (isCurrentlyVoted) {
          transaction.delete(doc(db, `centros.educativos/${selectedInstituteId}/profesores/${profId}/${type}`, userId));
          transaction.set(instDocRef, { [type === 'yoTeConozco' ? 'yoTeConozcoCount' : 'fanCount']: increment(-1) }, { merge: true });
        }
        
        // 2. If other voted, remove it
        if (isOtherVoted) {
          transaction.delete(doc(db, `centros.educativos/${selectedInstituteId}/profesores/${profId}/${otherType}`, userId));
          transaction.set(instDocRef, { [otherType === 'yoTeConozco' ? 'yoTeConozcoCount' : 'fanCount']: increment(-1) }, { merge: true });
        }
        
        // 3. If it was NOT currently voted, add it (this handles both toggling ON and switching from other)
        if (!isCurrentlyVoted) {
          transaction.set(doc(db, `centros.educativos/${selectedInstituteId}/profesores/${profId}/${type}`, userId), { votedAt: timestamp });
          transaction.set(instDocRef, { [type === 'yoTeConozco' ? 'yoTeConozcoCount' : 'fanCount']: increment(1) }, { merge: true });
        }
      });
      
      // Update local votes state
      setUserVotes(prev => ({
        ...prev,
        [profId]: {
          ...prev[profId],
          [type]: !isCurrentlyVoted,
          [otherType]: false 
        }
      }));
      
      triggerNotice(isCurrentlyVoted ? '¡Voto retirado!' : '¡Voto registrado!');
    } catch (error) {
      console.error("Error voting:", error);
      triggerNotice('Hubo un error al registrar tu voto.');
    } finally {
      setIsVotingProf(false);
    }
  };

  const handleToggleCrush = async (profId: string) => {
    if (isVotingProf) return;
    const userId = auth.currentUser?.uid || getGuestId();
    
    const hasCrush = (userVotes[profId] || { crush: false }).crush;
    
    setIsVotingProf(true);
    try {
      await runTransaction(db, async (transaction) => {
        const timestamp = new Date().toISOString();
        const instDocRef = selectedInstituteId ? doc(db, `centros.educativos/${selectedInstituteId}/profesores`, profId) : null;
        const instCrushRef = selectedInstituteId ? doc(db, `centros.educativos/${selectedInstituteId}/profesores/${profId}/crushes`, userId) : null;

        if (!instDocRef || !instCrushRef) throw new Error("No institute selected");

        const instCrushSnap = await transaction.get(instCrushRef);
        const hasText = instCrushSnap.exists() && instCrushSnap.data()?.text !== undefined;

        if (hasCrush) {
          // Remove crush vote
          if (hasText) {
            // Keep text fields, just remove votedAt
            transaction.update(instCrushRef, { votedAt: deleteField() });
          } else {
            // No text, safe to delete entire document
            transaction.delete(instCrushRef);
          }
          transaction.set(instDocRef, { crushesCount: increment(-1) }, { merge: true });
        } else {
          // Add crush vote
          transaction.set(instCrushRef, { votedAt: timestamp }, { merge: true });
          transaction.set(instDocRef, { crushesCount: increment(1) }, { merge: true });
        }
      });
      
      setUserVotes(prev => ({
        ...prev,
        [profId]: {
          ...prev[profId],
          crush: !hasCrush
        }
      }));
      triggerNotice(hasCrush ? '¡Crush eliminado!' : '¡Crush registrado!');
    } catch (error) {
      console.error("Error toggling crush:", error);
      triggerNotice('Hubo un error al registrar tu crush.');
    } finally {
      setIsVotingProf(false);
    }
  };

  const handleSubmitCrush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfessorId || !selectedInstituteId || !newCrushText.trim() || isSubmittingCrush) return;
    const authorId = auth.currentUser?.uid || getGuestId();
    
    const alreadyHasCrush = profCrushes.some(c => c.authorId === authorId);
    if (alreadyHasCrush) {
      triggerNotice('Ya tienes un mensaje de amor publicado. Elimínalo para poder enviar uno nuevo.');
      return;
    }

    setIsSubmittingCrush(true);
    try {
      const crushId = authorId;
      const text = newCrushText.trim();
      const timestamp = new Date().toISOString();
      const authorName = currentUser ? currentUser.name : 'Estudiante Anónimo';

      await runTransaction(db, async (transaction) => {
        const perfCrushRef = doc(db, `perfiles/${selectedProfessorId}/crushes`, crushId);
        const instCrushRef = doc(db, `centros.educativos/${selectedInstituteId}/profesores/${selectedProfessorId}/crushes`, crushId);
        
        const data = {
          text,
          authorName,
          authorId,
          createdAt: timestamp
        };
        
        transaction.set(perfCrushRef, data, { merge: true });
        transaction.set(instCrushRef, data, { merge: true });
      });

      setNewCrushText('');
      pushSocialLog(`❤️ ¡Se publicó un Crush anónimo para un docente!`);
      triggerNotice('¡Crush publicado de forma anónima!');
    } catch (err) {
      console.error("Error submitting crush:", err);
      triggerNotice('No se pudo enviar el crush.');
    } finally {
      setIsSubmittingCrush(false);
    }
  };

  const handleDeleteCrush = async (crushAuthorId?: string) => {
    if (!selectedProfessorId || !selectedInstituteId || isSubmittingCrush) return;
    const userId = auth.currentUser?.uid || getGuestId();
    const targetId = crushAuthorId || userId;
    
    if (targetId !== userId) {
      triggerNotice('Solo puedes eliminar tu propio mensaje de amor.');
      return;
    }

    setIsSubmittingCrush(true);
    try {
      await runTransaction(db, async (transaction) => {
        const instCrushRef = doc(db, `centros.educativos/${selectedInstituteId}/profesores/${selectedProfessorId}/crushes`, targetId);
        const perfCrushRef = doc(db, `perfiles/${selectedProfessorId}/crushes`, targetId);
        
        const instCrushSnap = await transaction.get(instCrushRef);
        const hasHeartVote = instCrushSnap.exists() && instCrushSnap.data()?.votedAt !== undefined;

        if (hasHeartVote) {
          // Document still has Heart (❤️) vote, keep votedAt and remove text/comment fields
          transaction.update(instCrushRef, {
            text: deleteField(),
            authorName: deleteField(),
            authorId: deleteField(),
            createdAt: deleteField()
          });
        } else {
          // No Heart (❤️) vote exists, safely delete the entire document
          transaction.delete(instCrushRef);
        }
        
        // Remove from global/feed copy
        transaction.delete(perfCrushRef);
      });

      triggerNotice('¡Tu mensaje de amor ha sido eliminado!');
    } catch (err) {
      console.error("Error deleting crush:", err);
      triggerNotice('No se pudo eliminar el mensaje.');
    } finally {
      setIsSubmittingCrush(false);
    }
  };

  const handleOpenEditWiki = () => {
    if (!currentSelectedProfessor) return;
    setEditWikiEdad(currentSelectedProfessor.edad || '');
    
    // Parse height (altura) to match "X cm" dropdown
    let heightVal = currentSelectedProfessor.altura || '';
    if (heightVal) {
      const match = heightVal.match(/\d+(\.\d+)?/);
      if (match) {
        let num = parseFloat(match[0]);
        if (num <= 3) {
          // It's in meters, convert to cm, e.g., 1.75 -> 175
          num = Math.round(num * 100);
        }
        if (num >= 100 && num <= 200) {
          heightVal = `${Math.round(num)} cm`;
        }
      }
    }
    setEditWikiAltura(heightVal);

    // Parse weight (peso) to match "X kg" dropdown
    let weightVal = currentSelectedProfessor.peso || '';
    if (weightVal) {
      const match = weightVal.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num >= 40 && num <= 100) {
          weightVal = `${num} kg`;
        }
      }
    }
    setEditWikiPeso(weightVal);

    // Marital Status
    setEditWikiEstadoCivil(currentSelectedProfessor.estadoCivil || '');
    
    // Birthday dropdowns
    setEditWikiDay(currentSelectedProfessor.birthDay || '');
    setEditWikiMonth(currentSelectedProfessor.birthMonth || '');
    setEditWikiYear(currentSelectedProfessor.birthYear || '');
    
    setIsEditWikiModalOpen(true);
  };

  const calculateAgeStr = (dayStr: string, monthStr: string, yearStr: string) => {
    if (!dayStr || !monthStr || !yearStr) return 'No especificada';
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = (today.getMonth() + 1) - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }
    return age >= 0 ? `${age} años` : 'No especificada';
  };

  const getDaysInMonth = (yearStr: string, monthStr: string) => {
    if (!monthStr) return 31;
    const month = parseInt(monthStr, 10);
    if (month === 2) {
      if (yearStr) {
        const year = parseInt(yearStr, 10);
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        return isLeap ? 29 : 28;
      }
      return 29;
    }
    if ([4, 6, 9, 11].includes(month)) return 30;
    return 31;
  };

  useEffect(() => {
    if (editWikiDay && editWikiMonth) {
      const maxDays = getDaysInMonth(editWikiYear, editWikiMonth);
      const dayVal = parseInt(editWikiDay, 10);
      if (dayVal > maxDays) {
        setEditWikiDay(String(maxDays));
      }
    }
  }, [editWikiYear, editWikiMonth, editWikiDay]);

  const startEditingWiki = () => {
    if (!currentSelectedInstitute) return;
    setWikiPerfilPhoto(currentSelectedInstitute.perfilPhotoUrl || currentSelectedInstitute.image || '');
    setWikiPortadaPhoto(currentSelectedInstitute.portadaPhotoUrl || '');
    setWikiAnoFundacion(currentSelectedInstitute.anoDeFundacion ? String(currentSelectedInstitute.anoDeFundacion) : '');
    setWikiInstagram(currentSelectedInstitute.redesSociales?.instagram || '');
    setWikiYoutube(currentSelectedInstitute.redesSociales?.youtube || '');
    setWikiFacebook(currentSelectedInstitute.redesSociales?.facebook || '');
    setWikiTwitter(currentSelectedInstitute.redesSociales?.twitter || '');
    setWikiErrors({});
    setIsEditingWiki(true);
  };

  const handleSaveInstituteWiki = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstituteId || isSubmittingWikiEdit) return;
    
    const errors: Record<string, string> = {};
    
    // 1. Validation for Facebook-only images
    const isFacebookDomain = (url: string) => {
      const u = url.trim().toLowerCase();
      return u.includes('facebook.com') || u.includes('fbcdn.net') || u.includes('fbcdn.com') || u.includes('fb.com');
    };
    
    if (wikiPerfilPhoto.trim()) {
      if (!isFacebookDomain(wikiPerfilPhoto)) {
        errors.perfilPhoto = 'Solo se permiten enlaces de imágenes de Facebook (ej. facebook.com, fbcdn.net, fb.com).';
      }
    }
    
    if (wikiPortadaPhoto.trim()) {
      if (!isFacebookDomain(wikiPortadaPhoto)) {
        errors.portadaPhoto = 'Solo se permiten enlaces de imágenes de Facebook (ej. facebook.com, fbcdn.net, fb.com).';
      }
    }
    
    // 2. Validation for specific Social networks
    if (wikiInstagram.trim() && !wikiInstagram.trim().toLowerCase().includes('instagram.com') && !wikiInstagram.trim().toLowerCase().includes('instagr.am')) {
      errors.instagram = 'El enlace debe ser de Instagram (instagram.com).';
    }
    
    if (wikiYoutube.trim() && !wikiYoutube.trim().toLowerCase().includes('youtube.com') && !wikiYoutube.trim().toLowerCase().includes('youtu.be')) {
      errors.youtube = 'El enlace debe ser de YouTube (youtube.com o youtu.be).';
    }
    
    if (wikiFacebook.trim() && !wikiFacebook.trim().toLowerCase().includes('facebook.com') && !wikiFacebook.trim().toLowerCase().includes('fb.com')) {
      errors.facebook = 'El enlace debe ser de Facebook (facebook.com o fb.com).';
    }
    
    if (wikiTwitter.trim() && !wikiTwitter.trim().toLowerCase().includes('twitter.com') && !wikiTwitter.trim().toLowerCase().includes('x.com')) {
      errors.twitter = 'El enlace debe ser de Twitter / X (twitter.com o x.com).';
    }
    
    if (Object.keys(errors).length > 0) {
      setWikiErrors(errors);
      return;
    }
    
    setWikiErrors({});
    setIsSubmittingWikiEdit(true);
    try {
      const yearNum = wikiAnoFundacion && wikiAnoFundacion.trim() ? parseInt(wikiAnoFundacion, 10) : null;
      
      const updateData = {
        perfilPhotoUrl: wikiPerfilPhoto.trim(),
        portadaPhotoUrl: wikiPortadaPhoto.trim(),
        anoDeFundacion: yearNum,
        redesSociales: {
          instagram: wikiInstagram.trim(),
          youtube: wikiYoutube.trim(),
          facebook: wikiFacebook.trim(),
          twitter: wikiTwitter.trim(),
        }
      };
      
      await setDoc(doc(db, 'centros.educativos', selectedInstituteId), updateData, { merge: true });
      setIsEditingWiki(false);
    } catch (error) {
      console.error("Error updating institute wiki:", error);
    } finally {
      setIsSubmittingWikiEdit(false);
    }
  };

  const handleSubmitWiki = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfessorId || !selectedInstituteId || isSubmittingWiki) return;
    setIsSubmittingWiki(true);
    try {
      const profDocRef = doc(db, 'centros.educativos', selectedInstituteId, 'profesores', selectedProfessorId);
      const perfDocRef = doc(db, 'perfiles', selectedProfessorId);
      
      const computedAge = calculateAgeStr(editWikiDay, editWikiMonth, editWikiYear);
      
      const updateData = {
        edad: computedAge,
        birthDay: editWikiDay,
        birthMonth: editWikiMonth,
        birthYear: editWikiYear,
        altura: editWikiAltura,
        peso: editWikiPeso,
        estadoCivil: editWikiEstadoCivil
      };
      
      await runTransaction(db, async (transaction) => {
        transaction.set(profDocRef, updateData, { merge: true });
        transaction.set(perfDocRef, updateData, { merge: true });
      });
      
      setIsEditWikiModalOpen(false);
      triggerNotice('¡Información de la Wiki actualizada!');
    } catch (err) {
      console.error("Error updating wiki:", err);
      triggerNotice('No se pudo guardar la información de la wiki.');
    } finally {
      setIsSubmittingWiki(false);
    }
  };

  const handleSubmitReview = async (rating: number) => {
    if (!selectedProfessorId || !selectedInstituteId || isSubmittingReview) return;
    setIsSubmittingReview(true);
    try {
      const authorId = auth.currentUser?.uid || getGuestId();
      const text = `Calificó con ★ ${rating}`;
      const timestamp = new Date().toISOString();
      const authorName = currentUser ? currentUser.name : 'Estudiante Anónimo';

      const profDocRef = doc(db, 'centros.educativos', selectedInstituteId, 'profesores', selectedProfessorId);
      const userRatingRef = doc(db, 'centros.educativos', selectedInstituteId, 'profesores', selectedProfessorId, 'ratings', authorId);
      
      const historyColRef = collection(db, 'centros.educativos', selectedInstituteId, 'profesores', selectedProfessorId, 'ratings', authorId, 'history');
      const newHistoryRef = doc(historyColRef);
      
      const reviewColRef = collection(db, 'centros.educativos', selectedInstituteId, 'profesores', selectedProfessorId, 'reviews');
      const newReviewRef = doc(reviewColRef);

      await runTransaction(db, async (transaction) => {
        const profSnap = await transaction.get(profDocRef);
        const userRatingSnap = await transaction.get(userRatingRef);

        const todayStr = getLocalDateString();
        let currentLives = 6;
        if (userRatingSnap.exists()) {
          const data = userRatingSnap.data();
          if (data.lastVotedDate === todayStr) {
            currentLives = typeof data.lives === 'number' ? data.lives : 6;
          }
        }

        if (currentLives <= 0) {
          throw new Error('¡Ya no te quedan oportunidades de calificación para hoy!');
        }

        const newLives = currentLives - 1;

        // Calculate stars
        const profData = profSnap.data() || {};
        const currentRatingCount = profData.ratingCount || 0;
        
        const rating_1_count = profData.rating_1_count || 0;
        const rating_2_count = profData.rating_2_count || 0;
        const rating_3_count = profData.rating_3_count || 0;
        const rating_4_count = profData.rating_4_count || 0;
        const rating_5_count = profData.rating_5_count || 0;

        let new_1 = rating_1_count;
        let new_2 = rating_2_count;
        let new_3 = rating_3_count;
        let new_4 = rating_4_count;
        let new_5 = rating_5_count;

        if (rating === 1) new_1++;
        if (rating === 2) new_2++;
        if (rating === 3) new_3++;
        if (rating === 4) new_4++;
        if (rating === 5) new_5++;

        const newRatingCount = currentRatingCount + 1;
        const newSum = (new_1 * 1) + (new_2 * 2) + (new_3 * 3) + (new_4 * 4) + (new_5 * 5);
        const newAverage = parseFloat((newSum / newRatingCount).toFixed(1));

        // Update Professor document
        transaction.set(profDocRef, {
          rating: newAverage,
          ratingCount: newRatingCount,
          rating_1_count: new_1,
          rating_2_count: new_2,
          rating_3_count: new_3,
          rating_4_count: new_4,
          rating_5_count: new_5
        }, { merge: true });

        // Set or update User Rating document
        transaction.set(userRatingRef, {
          userId: authorId,
          lives: newLives,
          lastVotedDate: todayStr
        });

        // Add to history
        transaction.set(newHistoryRef, {
          rating: rating,
          text: text,
          createdAt: timestamp,
          authorName,
          authorId
        });

        // Add to reviews collection for public feed
        transaction.set(newReviewRef, {
          text: text,
          rating: rating,
          authorName,
          authorId,
          createdAt: timestamp
        });
      });

      // Update local storage and local state cache
      const todayStr = getLocalDateString();
      const cacheKey = `wikistars_votes_${authorId}_${selectedProfessorId}_${todayStr}`;
      
      const nextVotes = [...userTodayVotes, rating];
      const nextOpportunities = Math.max(0, ratingOpportunities - 1);
      
      setUserTodayVotes(nextVotes);
      setRatingOpportunities(nextOpportunities);
      
      localStorage.setItem(cacheKey, JSON.stringify({ votes: nextVotes, opportunities: nextOpportunities }));

      setNewReviewText('');
      setSelectedRating(rating);
      setTimeout(() => {
        setSelectedRating(null);
      }, 1500);

      pushSocialLog(`📝 ¡Se publicó una nueva calificación de ★ ${rating} para un docente!`);
      triggerNotice('¡Calificación publicada con éxito!');
    } catch (err: any) {
      console.error("Error submitting review:", err);
      const errMsg = err?.message || 'No se pudo enviar la calificación.';
      triggerNotice(errMsg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleVoteShip = async (shipId: string) => {
    if (!selectedProfessorId) return;
    const userId = auth.currentUser?.uid || getGuestId();

    if (userVotedShipId) {
      triggerNotice('¡Ya votaste por tu ship favorito para este docente!');
      return;
    }

    try {
      await setDoc(doc(db, `perfiles/${selectedProfessorId}/shipsVotedBy`, userId), {
        shipId,
        votedAt: new Date().toISOString()
      });

      await setDoc(doc(db, `perfiles/${selectedProfessorId}/ships`, shipId), {
        votes: increment(1)
      }, { merge: true });

      setUserVotedShipId(shipId);
      pushSocialLog(`💖 ¡Se registró un voto de emparejamiento (Ship)!`);
      triggerNotice('¡Voto de ship registrado!');
    } catch (err) {
      console.error("Error voting for ship:", err);
      triggerNotice('No se pudo guardar tu voto de ship.');
    }
  };

  // Synchronize Google Auth state and update /users in Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          let profileData;
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            profileData = {
              userId: firebaseUser.uid,
              name: data.displayName || firebaseUser.displayName || 'Estudiante',
              nickname: data.email ? data.email.split('@')[0] : 'wikistar',
              email: data.email || firebaseUser.email || '',
              photoURL: data.photoURL || firebaseUser.photoURL || '',
              instituteId: data.instituteId || '1',
              category: data.category || 'Influencer'
            };
          } else {
            // Seeding/registering user in Firestore if not present
            const now = new Date();
            const newUserDoc = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'WikiStars User',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100',
              createdAt: now,
              lastLogin: now
            };
            await setDoc(userDocRef, newUserDoc);
            
            profileData = {
              userId: firebaseUser.uid,
              name: newUserDoc.displayName,
              nickname: newUserDoc.email ? newUserDoc.email.split('@')[0] : 'wikistar',
              email: newUserDoc.email,
              photoURL: newUserDoc.photoURL,
              instituteId: '1',
              category: 'Influencer'
            };
          }
          setCurrentUser(profileData);
        } catch (error) {
          console.error("Error loading auth user profile:", error);
          setCurrentUser({
            userId: firebaseUser.uid,
            name: firebaseUser.displayName || 'Estudiante',
            nickname: firebaseUser.email ? firebaseUser.email.split('@')[0] : 'wikistar',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            instituteId: '1',
            category: 'Influencer'
          });
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Show a temporary banner notice
  const triggerNotice = (message: string) => {
    setBannerNotice(message);
    setTimeout(() => {
      setBannerNotice(null);
    }, 4000);
  };

  // Add a live simulation log
  const pushSocialLog = (log: string) => {
    setSocialLogs(prev => [log, ...prev.slice(0, 3)]);
  };

  // Handle rating metrics with Firestore propagation
  const handleRate = async (alumnoId: string, metric: 'popularity' | 'charisma' | 'talent', rating: number) => {
    const al = alumnos.find(a => a.id === alumnoId);
    if (!al) return;

    let updatedFields: Partial<Alumno> = {};

    if (metric === 'popularity') {
      const currentTotal = al.starsPopularity * 10;
      const newAverage = parseFloat(((currentTotal + rating) / 11).toFixed(1));
      updatedFields = { starsPopularity: newAverage, points: al.points + 5 };
    } else if (metric === 'charisma') {
      const currentTotal = al.starsCharisma * 10;
      const newAverage = parseFloat(((currentTotal + rating) / 11).toFixed(1));
      updatedFields = { starsCharisma: newAverage, points: al.points + 3 };
    } else {
      const currentTotal = al.starsTalent * 10;
      const newAverage = parseFloat(((currentTotal + rating) / 11).toFixed(1));
      updatedFields = { starsTalent: newAverage, points: al.points + 7 };
    }

    try {
      const updatedAlumno: Alumno = {
        ...al,
        ...updatedFields,
        nickname: al.nickname || '',
        isVerified: al.isVerified || false,
        instagram: al.instagram || '',
        tiktok: al.tiktok || ''
      };
      await setDoc(doc(db, 'alumnos', alumnoId), updatedAlumno);
      
      pushSocialLog(`⭐ ${al.name} recibió una calificación en ${
        metric === 'popularity' ? 'Popularidad' : metric === 'charisma' ? 'Carisma' : 'Talento'
      }`);
      triggerNotice('¡Tu calificación ha sido registrada e incluida en el promedio!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `alumnos/${alumnoId}`);
    }
  };

  // Upvote point / Flame with Firestore propagation
  const handleUpvote = async (alumnoId: string) => {
    const al = alumnos.find(a => a.id === alumnoId);
    if (!al) return;

    try {
      const updatedAlumno: Alumno = {
        ...al,
        points: al.points + 1,
        views: al.views + 4,
        nickname: al.nickname || '',
        isVerified: al.isVerified || false,
        instagram: al.instagram || '',
        tiktok: al.tiktok || ''
      };
      await setDoc(doc(db, 'alumnos', alumnoId), updatedAlumno);
      
      pushSocialLog(`🔥 ${al.name} recibió un voto de popularidad`);
      triggerNotice('¡Gracias por tu voto! Has impulsado su ranking.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `alumnos/${alumnoId}`);
    }
  };

  // Submit Comments with Firestore propagation
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedAlumnoId) return;

    const authorName = postAsAnonymous || !currentUser ? 'Anónimo' : currentUser.name;
    const authorNickname = postAsAnonymous || !currentUser ? '@anon' : `@${currentUser.nickname}`;
    const statusType: 'anonymous' | 'student' | 'verified' = postAsAnonymous || !currentUser ? 'anonymous' : 'student';

    const newCommentId = `comment-${Date.now()}`;
    const newComment: AlumnoComment = {
      id: newCommentId,
      alumnoId: selectedAlumnoId,
      author: `${authorName} (${authorNickname})`,
      avatar: currentUser && !postAsAnonymous 
        ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'
        : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100',
      text: newCommentText,
      status: statusType,
      createdAt: new Date().toISOString(),
      likes: 0
    };

    try {
      // 1. Add comment
      await setDoc(doc(db, 'comments', newCommentId), newComment);

      // 2. Add points to target student
      const al = alumnos.find(a => a.id === selectedAlumnoId);
      if (al) {
        const updatedAlumno: Alumno = {
          ...al,
          points: al.points + 2,
          nickname: al.nickname || '',
          isVerified: al.isVerified || false,
          instagram: al.instagram || '',
          tiktok: al.tiktok || ''
        };
        await setDoc(doc(db, 'alumnos', selectedAlumnoId), updatedAlumno);
      }

      setNewCommentText('');
      pushSocialLog(`💬 Comentario agregado en la Wiki de un estudiante`);
      triggerNotice('Comentario publicado con éxito.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `comments/${newCommentId}`);
    }
  };

  // Comment Likes with Firestore propagation
  const handleLikeComment = async (commentId: string) => {
    const c = comments.find(comment => comment.id === commentId);
    if (!c) return;

    try {
      await setDoc(doc(db, 'comments', commentId), {
        ...c,
        likes: c.likes + 1
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `comments/${commentId}`);
    }
  };

  // Handle Nomination with Firestore propagation
  const handleNominateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nominateName || !nominateCourse || !selectedInstituteId) {
      alert('Por favor ingresa todos los datos obligatorios.');
      return;
    }

    const newId = `star-${Date.now()}`;
    const { searchTokens, searchKeywords } = generateSearchArrays(nominateName);
    const newAlumno: Alumno = {
      id: newId,
      name: nominateName,
      nickname: nominateNickname || '',
      instituteId: selectedInstituteId,
      avatar: nominateAvatar,
      course: nominateCourse,
      category: nominateCategory,
      bio: nominateBio || 'Sin biografía aún. ¡Ayúdanos completando su wiki!',
      starsPopularity: 4.0,
      starsCharisma: 4.2,
      starsTalent: 4.0,
      views: 75,
      points: 10,
      isVerified: false,
      instagram: '',
      tiktok: '',
      nominationReason: nominateReason || '',
      searchTokens,
      searchKeywords
    };

    try {
      await setDoc(doc(db, 'alumnos', newId), newAlumno);
      setIsNominateModalOpen(false);

      pushSocialLog(`✨ ${newAlumno.name} fue nominado como Estrella por un compañero`);
      triggerNotice(`¡Has nominado con éxito a ${newAlumno.name}!`);

      // Reset Form
      setNominateName('');
      setNominateNickname('');
      setNominateCourse('');
      setNominateCategory('Influencer');
      setNominateBio('');
      setNominateReason('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `alumnos/${newId}`);
    }
  };

  // Handle Create Institute/School with Firestore saving
  const handleCreateInstituteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstituteName.trim()) {
      alert('Por favor, ingresa el nombre de la institución.');
      return;
    }

    setIsSubmittingInstitute(true);
    const docId = generateDocId(newInstituteName);
    const { searchTokens, searchKeywords } = generateSearchArrays(newInstituteName);

    // Default professional high-quality campus graphics
    const perfilPhotoUrl = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=300";
    const portadaPhotoUrl = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1200";

    const newCentro = {
      anoDeFundacion: null,
      creadoEn: serverTimestamp(),
      creadoPor: auth.currentUser?.uid || "G9m5dcwEdAhc7L3rJeBgpFv4nh73",
      nombre: newInstituteName.trim(),
      perfilPhotoUrl,
      portadaPhotoUrl,
      redesSociales: {
        facebook: `https://web.facebook.com/${generateDocId(newInstituteName)}`
      },
      searchKeywords,
      searchTokens,
      tipo: newInstituteTipo
    };

    try {
      await setDoc(doc(db, 'centros.educativos', docId), newCentro);
      setIsCreateInstituteModalOpen(false);
      setNewInstituteName('');
      setNewInstituteTipo('instituto');
      
      pushSocialLog(`🏛️ Nuevo centro educativo registrado: ${newCentro.nombre}`);
      triggerNotice('¡Institución registrada correctamente!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `centros.educativos/${docId}`);
    } finally {
      setIsSubmittingInstitute(false);
    }
  };

  // Handle Google Sign-In and write to /users in Firestore
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      const now = new Date();
      
      const finalDisplayName = user.displayName || 'WikiStars User';
      const finalPhotoURL = user.photoURL || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100';
      
      if (docSnap.exists()) {
        await setDoc(userDocRef, {
          lastLogin: now,
          displayName: finalDisplayName,
          photoURL: finalPhotoURL,
          email: user.email || ''
        }, { merge: true });
      } else {
        await setDoc(userDocRef, {
          uid: user.uid,
          displayName: finalDisplayName,
          email: user.email || '',
          photoURL: finalPhotoURL,
          createdAt: now,
          lastLogin: now
        });
      }
      
      const userProfile = {
        userId: user.uid,
        name: finalDisplayName,
        nickname: user.email ? user.email.split('@')[0] : 'wikistar',
        email: user.email || '',
        photoURL: finalPhotoURL,
        instituteId: '1',
        category: 'Influencer'
      };
      
      setCurrentUser(userProfile);
      setIsJoinModalOpen(false);
      triggerNotice(`¡Bienvenido a WikiStars 5, ${userProfile.name}!`);
      pushSocialLog(`🚀 @${userProfile.nickname} se ha unido a WikiStars5`);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      triggerNotice("Error al iniciar sesión con Google o faltan permisos.");
    }
  };

  // Handle join platform
  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim()) return;

    const userProfile = {
      name: joinName,
      nickname: joinNickname ? joinNickname.replace('@', '') : joinName.toLowerCase().replace(/\s+/g, ''),
      instituteId: joinInstituteId,
      category: joinCategory,
      userId: `user-${Date.now()}`
    };

    setCurrentUser(userProfile);
    setIsJoinModalOpen(false);
    triggerNotice(`¡Bienvenido a WikiStars5, ${userProfile.name}! Ya tienes tu Pasaporte del Campus.`);
    pushSocialLog(`🚀 @${userProfile.nickname} se ha unido to WikiStars5`);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("SignOut failed:", e);
    }
    setCurrentUser(null);
    localStorage.removeItem('wikistars_user');
    triggerNotice('Has cerrado sesión en tu pasaporte estudiantil.');
  };

  // Save profile changes
  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});
    
    // Validations
    const errors: Record<string, string> = {};
    if (!editProfileName.trim()) {
      errors.name = 'El nombre completo real es obligatorio.';
    }
    if (!editProfileNickname.trim()) {
      errors.nickname = 'El nombre de usuario es obligatorio.';
    } else if (editProfileNickname.trim().includes(' ')) {
      errors.nickname = 'El nombre de usuario no puede contener espacios.';
    }
    
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    
    setIsSavingProfile(true);
    try {
      let finalUserId = currentUser?.userId;
      const isAnon = !finalUserId || finalUserId === 'anonymous' || finalUserId.startsWith('user-');
      if (!finalUserId || finalUserId === 'anonymous') {
        // Generate a new guest UID if completely anonymous
        finalUserId = 'user-' + Date.now();
      }
      
      const updatedUser = {
        name: editProfileName.trim(),
        nickname: editProfileNickname.trim().replace('@', '').toLowerCase(),
        instituteId: currentUser?.instituteId || '1',
        category: currentUser?.category || 'Influencer',
        userId: finalUserId,
        photoURL: currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
        email: currentUser?.email || '',
        sexo: editProfileSexo
      };
      
      // Update local state and local storage
      setCurrentUser(updatedUser);
      localStorage.setItem('wikistars_user', JSON.stringify(updatedUser));
      
      // Update in Firestore users collection if logged in with Google
      const isRealFirebaseUser = auth.currentUser?.uid === finalUserId;
      if (isRealFirebaseUser) {
        await setDoc(doc(db, 'users', finalUserId), {
          displayName: editProfileName.trim(),
          nickname: editProfileNickname.trim().replace('@', '').toLowerCase(),
          sexo: editProfileSexo,
          lastLogin: new Date()
        }, { merge: true });
      }
      
      setUserProfile({
        displayName: editProfileName.trim(),
        nickname: editProfileNickname.trim().replace('@', '').toLowerCase(),
        email: currentUser?.email || 'Invitado (No vinculado)',
        photoURL: currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
        sexo: editProfileSexo,
        userId: finalUserId
      });
      
      triggerNotice('¡Perfil actualizado con éxito!');
      pushSocialLog(`👤 @${editProfileNickname.trim()} actualizó su perfil`);
    } catch (err) {
      console.error("Error saving profile:", err);
      triggerNotice('Error al guardar los cambios del perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Filters computed
  const filteredInstitutes = useMemo(() => {
    if (!globalSearch.trim()) return institutes;
    
    const queryNormalized = normalizeText(globalSearch);
    const queryWords = queryNormalized.split(/\s+/).filter(w => w.length > 0);
    if (queryWords.length === 0) return institutes;

    const scored = institutes.map(inst => {
      const nameNorm = normalizeText(inst.name);
      const shortNameNorm = normalizeText(inst.shortName || '');
      const descNorm = normalizeText(inst.description || '');
      const locationNorm = normalizeText(inst.location || '');
      const combined = `${nameNorm} ${shortNameNorm} ${descNorm} ${locationNorm}`;

      let score = 0;
      
      // 1. Exact combined phrase match gets the ultimate boost
      if (combined.includes(queryNormalized)) {
        score += 150;
      }
      // Exact name match gets another high boost
      if (nameNorm.includes(queryNormalized)) {
        score += 80;
      }

      // 2. Token-by-token matching
      let matchedWordsCount = 0;
      queryWords.forEach(word => {
        if (combined.includes(word)) {
          matchedWordsCount++;
          // High weight for word matching name
          if (nameNorm.includes(word)) {
            score += 30;
          }
          // Weight for shortName
          if (shortNameNorm.includes(word)) {
            score += 25;
          }
          // Base word weight
          score += 10;
        }
      });

      // Require that at least one of the query terms matches
      const isMatch = matchedWordsCount > 0;
      
      // Bonus if ALL search words are matched
      if (matchedWordsCount === queryWords.length) {
        score += 50;
      }

      return { inst, score, isMatch };
    });

    return scored
      .filter(item => item.isMatch && item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.inst);
  }, [globalSearch, institutes]);

  const filteredPerfiles = useMemo(() => {
    if (!globalSearch.trim()) return [];
    
    const queryNormalized = normalizeText(globalSearch);
    const queryWords = queryNormalized.split(/\s+/).filter(w => w.length > 0);
    
    return perfiles.filter(perf => {
      const nameNorm = normalizeText(perf.nombreCompleto || '');
      return nameNorm.includes(queryNormalized) || queryWords.every(word => nameNorm.includes(word));
    });
  }, [globalSearch, perfiles]);

  const filteredAlumnosGlobally = useMemo(() => {
    if (!globalSearch.trim()) return [];
    
    const queryNormalized = normalizeText(globalSearch);
    const queryWords = queryNormalized.split(/\s+/).filter(w => w.length > 0);
    if (queryWords.length === 0) return [];

    const scored = alumnos.map(al => {
      const nameNorm = normalizeText(al.name);
      const nicknameNorm = normalizeText(al.nickname || '');
      const bioNorm = normalizeText(al.bio || '');
      const courseNorm = normalizeText(al.course || '');
      const combined = `${nameNorm} ${nicknameNorm} ${bioNorm} ${courseNorm}`;

      let score = 0;
      if (combined.includes(queryNormalized)) {
        score += 150;
      }
      if (nameNorm.includes(queryNormalized)) {
        score += 80;
      }

      let matchedWordsCount = 0;
      queryWords.forEach(word => {
        const tokens = al.searchTokens || generateSearchArrays(al.name).searchTokens;
        const keywords = al.searchKeywords || generateSearchArrays(al.name).searchKeywords;
        const matchesTokenOrKeyword = tokens.some(t => t.startsWith(word) || word.startsWith(t)) || keywords.includes(word);

        if (combined.includes(word) || matchesTokenOrKeyword) {
          matchedWordsCount++;
          if (nameNorm.includes(word) || matchesTokenOrKeyword) {
            score += 30;
          }
          if (nicknameNorm.includes(word)) {
            score += 25;
          }
          score += 10;
        }
      });

      const isMatch = matchedWordsCount === queryWords.length;
      if (isMatch) {
        score += 100; // heavy boost for fully matching all query words (order-independent)
      }

      return { al, score, isMatch };
    });

    return scored
      .filter(item => item.isMatch && item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.al);
  }, [globalSearch, alumnos]);

  const filteredAlumnosInCampus = useMemo(() => {
    if (!selectedInstituteId) return [];
    
    // 1st: Filter by school
    let pool = alumnos.filter(al => al.instituteId === selectedInstituteId);

    // 2nd: Filter by category pill
    if (activeCategoryFilter !== 'Todos') {
      pool = pool.filter(al => al.category === activeCategoryFilter);
    }

    // 3rd: Filter by local sub search bar
    if (studentSearch.trim()) {
      const queryNormalized = normalizeText(studentSearch);
      const queryWords = queryNormalized.split(/\s+/).filter(w => w.length > 0);
      
      if (queryWords.length > 0) {
        const scoredPool = pool.map(al => {
          const nameNorm = normalizeText(al.name);
          const nicknameNorm = normalizeText(al.nickname || '');
          const bioNorm = normalizeText(al.bio || '');
          const courseNorm = normalizeText(al.course || '');
          const combined = `${nameNorm} ${nicknameNorm} ${bioNorm} ${courseNorm}`;

          let score = 0;
          if (combined.includes(queryNormalized)) {
            score += 150;
          }
          if (nameNorm.includes(queryNormalized)) {
            score += 80;
          }

          let matchedWordsCount = 0;
          queryWords.forEach(word => {
            const tokens = al.searchTokens || generateSearchArrays(al.name).searchTokens;
            const keywords = al.searchKeywords || generateSearchArrays(al.name).searchKeywords;
            const matchesTokenOrKeyword = tokens.some(t => t.startsWith(word) || word.startsWith(t)) || keywords.includes(word);

            if (combined.includes(word) || matchesTokenOrKeyword) {
              matchedWordsCount++;
              if (nameNorm.includes(word) || matchesTokenOrKeyword) {
                score += 30;
              }
              if (nicknameNorm.includes(word)) {
                score += 25;
              }
              score += 10;
            }
          });

          // Sort base points are added as tie breaker
          score += (al.points / 1000);

          const isMatch = matchedWordsCount === queryWords.length;
          if (isMatch) {
            score += 100;
          }

          return { al, score, isMatch };
        });

        pool = scoredPool
          .filter(item => item.isMatch && item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(item => item.al);
      }
    }

    // Sort pool according to studentSortOrder
    const sortedPool = [...pool];
    if (studentSortOrder === 'puntos') {
      sortedPool.sort((a, b) => b.points - a.points);
    } else if (studentSortOrder === 'nombre') {
      sortedPool.sort((a, b) => a.name.localeCompare(b.name));
    } else if (studentSortOrder === 'estrellas') {
      sortedPool.sort((a, b) => {
        const scoreB = b.starsPopularity + b.starsCharisma + b.starsTalent;
        const scoreA = a.starsPopularity + a.starsCharisma + a.starsTalent;
        return scoreB - scoreA;
      });
    }

    return sortedPool;
  }, [selectedInstituteId, activeCategoryFilter, studentSearch, alumnos, studentSortOrder]);

  const filteredProfessorsInCampus = useMemo(() => {
    if (!selectedInstituteId) return [];
    if (!studentSearch.trim()) return professors;

    const queryNormalized = normalizeText(studentSearch);
    const queryWords = queryNormalized.split(/\s+/).filter(w => w.length > 0);
    if (queryWords.length === 0) return professors;

    const scored = professors.map(prof => {
      const nameNorm = normalizeText(prof.nombreCompleto);
      
      let matchedWordsCount = 0;
      queryWords.forEach(word => {
        const tokens = prof.searchTokens || generateSearchArrays(prof.nombreCompleto).searchTokens;
        const keywords = prof.searchKeywords || generateSearchArrays(prof.nombreCompleto).searchKeywords;
        const matchesTokenOrKeyword = tokens.some((t: string) => t.startsWith(word) || word.startsWith(t)) || keywords.includes(word);

        if (nameNorm.includes(word) || matchesTokenOrKeyword) {
          matchedWordsCount++;
        }
      });

      const isMatch = matchedWordsCount === queryWords.length;
      return { prof, isMatch };
    });

    return scored
      .filter(item => item.isMatch)
      .map(item => item.prof);
  }, [selectedInstituteId, studentSearch, professors]);

  // Top National popular students ranking
  const topNationalAlumnos = useMemo(() => {
    return [...alumnos].sort((a, b) => b.points - a.points).slice(0, 3);
  }, [alumnos]);

  // Find active items
  const currentSelectedInstitute = useMemo(() => {
    return institutes.find(i => i.id === selectedInstituteId) || null;
  }, [selectedInstituteId, institutes]);

  const currentSelectedAlumno = useMemo(() => {
    return alumnos.find(a => a.id === selectedAlumnoId) || null;
  }, [selectedAlumnoId, alumnos]);

  const currentSelectedProfessor = useMemo(() => {
    return professors.find(p => p.id === selectedProfessorId) || null;
  }, [selectedProfessorId, professors]);

  const currentAlumnoComments = useMemo(() => {
    if (!selectedAlumnoId) return [];
    return comments.filter(c => c.alumnoId === selectedAlumnoId);
  }, [selectedAlumnoId, comments]);

  // Categories helper to map custom icons
  const getCategoryIcon = (category: Alumno['category']) => {
    switch (category) {
      case 'Artista':
        return <Music className="w-4 h-4 text-pink-400" />;
      case 'Deportista':
        return <Trophy className="w-4 h-4 text-emerald-400" />;
      case 'Académico':
        return <Brain className="w-4 h-4 text-sky-400" />;
      case 'Gaming':
        return <Gamepad2 className="w-4 h-4 text-purple-400" />;
      case 'Líder':
        return <Shield className="w-4 h-4 text-amber-400" />;
      case 'Influencer':
        return <Sparkles className="w-4 h-4 text-yellow-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getCategoryThemeColor = (category: Alumno['category'] | 'Todos') => {
    switch (category) {
      case 'Artista': return 'border-pink-500/30 text-pink-400 bg-pink-500/5 hover:bg-pink-500/10';
      case 'Deportista': return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10';
      case 'Académico': return 'border-sky-500/30 text-sky-400 bg-sky-500/5 hover:bg-sky-500/10';
      case 'Gaming': return 'border-purple-500/30 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10';
      case 'Líder': return 'border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10';
      case 'Influencer': return 'border-yellow-400/30 text-yellow-400 bg-yellow-400/5 hover:bg-yellow-400/10';
      default: return 'border-zinc-800 text-zinc-300 bg-zinc-900/60 hover:bg-zinc-800';
    }
  };

  const calcAverageScore = (votesCount: number) => { 
    return Math.min(5.0, 2.5 + (votesCount / 85)).toFixed(1); 
  };

  const getApprovalPercent = (votesCount: number) => { 
    return Math.min(100, Math.floor(45 + (votesCount / 4))); 
  };

  return (
    <div className="min-h-screen bg-[#050505] bg-grid-dots text-zinc-100 font-sans selection:bg-yellow-400 selection:text-black overflow-x-hidden relative">
      
      {/* Background ambient glowing orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent pointer-events-none rounded-full blur-3xl z-0" />
      <div className="absolute top-[400px] left-1/4 w-96 h-96 bg-yellow-500/2 pointer-events-none rounded-full blur-[120px] z-0" />
      <div className="absolute top-[1200px] right-1/4 w-[500px] h-[500px] bg-yellow-500/[0.015] pointer-events-none rounded-full blur-[140px] z-0" />

      {/* Top Banner Notice Pop-up */}
      <AnimatePresence>
        {bannerNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            id="banner-notice"
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-black px-6 py-3 rounded-full font-bold shadow-[0_10px_30px_rgba(250,204,21,0.3)] flex items-center gap-2 border border-yellow-300 font-mono text-xs uppercase"
          >
            <Sparkles className="w-4 h-4 text-black animate-spin" />
            <span>{bannerNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HEADER --- */}
      <header id="main-header" className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-900 px-4 py-3.5 lg:px-8">
        {/* Subtle accent bar at very top of header */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400/45 to-transparent" />
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <div 
            id="header-logo" 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => {
              setSelectedInstituteId(null);
              setSelectedAlumnoId(null);
              setGlobalSearch('');
            }}
          >
            <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(250,204,21,0.15)]">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/wikistars5-465e1.firebasestorage.app/o/wikistars5logo.png?alt=media&token=026f822e-3b69-4538-b0ef-28dacb65551e" 
                alt="WikiStars Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex items-baseline font-display text-lg tracking-widest font-black text-white">
              WIKISTARS
              <span className="text-yellow-400 ml-1 text-2xl font-black drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">5</span>
            </div>
          </div>

          {/* Actions & Profiles */}
          <div className="flex items-center gap-3">
            
            {/* Install button */}
            {!isAppInstalled && (
              <button
                id="btn-install"
                onClick={() => {
                  if (deferredPrompt) {
                    handlePWAInstall();
                  } else {
                    triggerNotice('Para instalar en Android/Chrome, pulsa el icono de instalación (⊕) o "Instalar Aplicación" en el menú. En iOS, pulsa Compartir y "Añadir a pantalla de inicio".');
                  }
                }}
                className="flex items-center gap-2 border border-yellow-400/20 hover:border-yellow-400/80 text-yellow-400 text-xs px-2 sm:px-4 py-2 rounded-full font-bold font-mono tracking-wider transition-all duration-300 cursor-pointer bg-yellow-400/5 hover:bg-yellow-400/10 hover:-translate-y-0.5 relative"
                title="Habilitar instalación en tu dispositivo"
              >
                <Download className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                <span className="hidden sm:block">INSTALAR APP</span>
                {deferredPrompt && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping" />
                )}
                {deferredPrompt && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full" />
                )}
              </button>
            )}

            {/* Registration state */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-yellow-300 font-mono tracking-tight">{currentUser.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">@{currentUser.nickname}</span>
                </div>
                <div className="relative group">
                  <div className="w-10 h-10 rounded-full bg-yellow-400 text-black border-2 border-yellow-400 flex items-center justify-center font-black text-sm cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-[0_0_12px_rgba(250,204,21,0.15)]">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Logout dropdown on hover/click */}
                  <div className="absolute right-0 top-12 w-48 bg-zinc-950 border border-zinc-900 rounded-xl p-2 hidden group-hover:block hover:block shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50">
                    <div className="px-2 py-1.5 border-b border-zinc-900 text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold">
                      Pasaporte Activo
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left font-mono text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-2.5 rounded-lg mt-1 transition-all flex items-center justify-between"
                    >
                      <span>Cerrar Pasaporte</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                id="btn-unirse"
                onClick={() => setIsJoinModalOpen(true)}
                className="bg-yellow-400 text-[#050505] hover:bg-yellow-300 font-display font-black text-xs px-5 py-2.5 rounded-full transition-all duration-300 shadow-[0_4px_15px_rgba(250,204,21,0.25)] hover:shadow-[0_4px_25px_rgba(250,204,21,0.4)] hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                UNIRSE
              </button>
            )}

          </div>
        </div>
      </header>

      {/* --- HERO BANNER & SEARCH --- */}
      <AnimatePresence mode="wait">
        {!selectedInstituteId && !selectedAlumnoId && (
          <motion.section 
            id="hero-banner"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="relative px-4 pt-20 pb-4 lg:pb-8 text-center z-10 max-w-5xl mx-auto"
          >
            {/* Crown visual asset decoration with glow */}
            <div className="mx-auto w-14 h-14 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl flex items-center justify-center text-yellow-400 mb-8 animate-pulse shadow-[0_0_20px_rgba(250,204,21,0.15)]">
              <Crown className="w-7 h-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black tracking-tight leading-[1.1] uppercase">
              <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">Mide tu </span>
              <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(250,204,21,0.25)] underline decoration-yellow-400/30 decoration-8 underline-offset-4">popularidad</span>
              <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent"> en el campus</span>
            </h1>
            
            <p className="mt-6 text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed tracking-wide font-medium">
              La primera wiki social para calificar y descubrir a los estudiantes más populares e influyentes.
            </p>

            {/* Search Input matching uploaded mockup */}
            <div className="mt-12 max-w-xl mx-auto relative group">
              {/* Animated surrounding glow ring on focus */}
              <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-yellow-400 transition-colors z-10">
                <Search className="w-5 h-5" />
              </div>
              <input
                id="main-search-input"
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Busca alumnos o instituciones..."
                className="w-full bg-zinc-950/90 hover:bg-zinc-900/90 focus:bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-sm py-4.5 pl-13 pr-12 rounded-full text-white outline-none placeholder-zinc-500 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.4)] focus:shadow-[0_0_30px_rgba(250,204,21,0.15)] font-mono tracking-wide relative z-0"
              />
              {globalSearch && (
                <button 
                  onClick={() => setGlobalSearch('')}
                  className="absolute inset-y-0 right-5 flex items-center text-zinc-400 hover:text-white transition-all z-10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* --- CONTENT CONTAINER & ROUTING --- */}
      <main className="max-w-7xl mx-auto px-4 pb-24 z-10 relative">
        
        {/* VIEW 1: GLOBAL DIRECTORY LISTS */}
        {!selectedInstituteId && !selectedAlumnoId && (
          <div id="global-directory-view" className="space-y-16">
            
            {/* If user searched, display global search outcomes */}
            {globalSearch.trim() && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="bg-[#0f0f0f] border border-zinc-900 rounded-3xl p-6 sm:p-8"
              >
                <div className="flex items-center justify-between pb-4 border-b border-zinc-900 mb-6">
                  <p className="text-xs uppercase font-mono tracking-widest text-[#facc15] font-semibold">
                    Resultados de Búsqueda sobre "{globalSearch}"
                  </p>
                  <button 
                    onClick={() => setGlobalSearch('')}
                    className="text-xs text-zinc-500 hover:text-white transition-all font-mono"
                  >
                    Limpiar Búsqueda
                  </button>
                </div>

                {/* Sub-block 1: Students matching */}
                {filteredAlumnosGlobally.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-yellow-400" />
                      Alumnos Encontrados ({filteredAlumnosGlobally.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredAlumnosGlobally.map(al => {
                        const schoolObj = institutes.find(i => i.id === al.instituteId);
                        return (
                          <div 
                            key={al.id}
                            onClick={() => {
                              setSelectedInstituteId(al.instituteId);
                              setSelectedAlumnoId(al.id);
                            }}
                            className="bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/65 rounded-xl p-4 cursor-pointer hover:border-yellow-400/30 transition-all flex items-center gap-3 group relative overflow-hidden"
                          >
                            <img 
                              src={al.avatar} 
                              alt={al.name} 
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-full object-cover border-2 border-zinc-800 group-hover:border-yellow-400 transition-colors" 
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <h4 className="font-semibold text-xs text-white truncate">{al.name}</h4>
                                {al.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                              </div>
                              <p className="text-[10px] text-yellow-400 font-mono">{al.nickname ? `@${al.nickname}` : al.course}</p>
                              <p className="text-[10px] text-zinc-400 truncate mt-0.5">{schoolObj?.shortName || 'Instituto'}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-zinc-500 text-[9px] font-mono block">WikiScore</span>
                              <span className="text-yellow-400 font-mono font-bold text-xs">🔥 {al.points}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-block 2: Institutes matching */}
                {filteredInstitutes.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                      <School className="w-5 h-5 text-yellow-400" />
                      Institutos Encontrados ({filteredInstitutes.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredInstitutes.map(inst => (
                        <div 
                          key={inst.id}
                          onClick={() => setSelectedInstituteId(inst.id)}
                          className="bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 cursor-pointer hover:border-yellow-400/30 transition-all flex items-center gap-4"
                        >
                          <img 
                            src={inst.image} 
                            alt={inst.name} 
                            referrerPolicy="no-referrer"
                            className="w-16 h-12 rounded-lg object-cover" 
                          />
                          <div>
                            <h4 className="font-bold text-xs text-white">{inst.name} ({inst.shortName})</h4>
                            <p className="text-[10px] text-zinc-400 line-clamp-1 mt-1">{inst.description}</p>
                            <span className="text-[9px] font-mono text-yellow-400 mt-1 block">📍 {inst.location}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-block 3: Professors matching */}
                {filteredPerfiles.length > 0 && (
                  <div>
                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-yellow-400" />
                      Profesores Encontrados ({filteredPerfiles.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredPerfiles.map(prof => (
                        <div 
                          key={prof.id}
                          onClick={() => {
                            setSelectedProfessorId(prof.id);
                            if (prof.instituteId) {
                                setSelectedInstituteId(prof.instituteId);
                            }
                          }}
                          className="bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 cursor-pointer hover:border-yellow-400/30 transition-all flex items-center gap-4"
                        >
                          <div className="text-xl">
                              {prof.gender === 'male' ? '👨‍🏫' : '👩‍🏫'}
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-white">{prof.nombreCompleto}</h4>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* SECTION 1: INSTITUTOS LIST */}
            <div id="institutes-section" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
                    <span className="w-1.5 h-6 bg-yellow-400 rounded-full" />
                    INSTITUCIONES REGISTRADAS
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 font-sans font-medium">
                    Ingresa en el foro de tu campus para calificar, nominar y descubrir las celebridades locales.
                  </p>
                </div>
                {!globalSearch && (
                  <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                    <div className="text-zinc-500 text-[10px] uppercase font-mono bg-zinc-950 px-3.5 py-2.5 rounded-full border border-zinc-900 text-right font-bold tracking-wider shrink-0 select-none">
                      CONEXIÓN EN VIVO A: <span className="text-yellow-400">{institutes.length} CAMPUSE(S)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid of campuses */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredInstitutes.map((inst, idx) => {
                  return (
                    <motion.div
                      key={inst.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      whileHover={{ y: -6 }}
                      onClick={() => {
                        setSelectedInstituteId(inst.id);
                        setActiveCategoryFilter('Todos');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden cursor-pointer group hover:border-yellow-400/40 shadow-2xl hover:shadow-[0_15px_30px_rgba(250,204,21,0.06)] transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Campus Portrait image */}
                      <div className="relative h-48 overflow-hidden bg-zinc-950">
                        <img 
                           src={inst.image} 
                           alt={inst.name}
                           referrerPolicy="no-referrer"
                           className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        />
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                        
                        {/* Shortname badge */}
                        <div className="absolute top-4 left-4 bg-black/90 backdrop-blur-md border border-yellow-400/25 text-yellow-400 text-[10px] font-mono font-black px-2.5 py-1 rounded-lg shadow-lg uppercase tracking-wider">
                          ★ {inst.shortName}
                        </div>

                        {/* Average stars */}
                        <div className="absolute bottom-4 right-4 bg-yellow-400 text-black text-[10px] font-mono font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xl shadow-black/80">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{inst.ratingAverage}</span>
                        </div>
                      </div>

                      {/* Info body */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-display font-black text-base text-zinc-100 group-hover:text-yellow-400 transition-colors line-clamp-1 uppercase tracking-tight">
                            {inst.name}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed font-sans font-medium">
                            {inst.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>



            {/* CONVENIENT WIKISTARS APP INTRO INFO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
              <div className="bg-zinc-950/70 border border-zinc-900 rounded-2xl p-6 flex gap-4">
                <div className="p-3 bg-yellow-400/10 text-yellow-400 h-fit rounded-lg">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-white text-sm">¿Cómo funciona la wiki social?</h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    WikiStars5 permite a alumnos registrar institutos y votar democráticamente por estudiantes ejemplares en redes, deportes, estudios o artes. Es moderado y busca rescatar el talento local con un espíritu competitivo y sano.
                  </p>
                </div>
              </div>
              <div className="bg-zinc-950/70 border border-zinc-900 rounded-2xl p-6 flex gap-4">
                <div className="p-3 bg-yellow-400/10 text-yellow-400 h-fit rounded-lg">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-white text-sm">¿Quieres nominar a alguien nuevo?</h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Ingresa en el Campus de tu instituto haciendo clic en cualquiera de las 3 opciones principales, luego presiona el botón <strong className="text-yellow-400">"Nominar una Estrella 🌟"</strong> para rellenar la ficha biográfica.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: ACTIVE INSTITUTE CAMPUS HUB WORKSPACE */}
        {selectedInstituteId && currentSelectedInstitute && !selectedAlumnoId && !selectedProfessorId && (
          <motion.div 
            id="campus-hub-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button 
              id="btn-back-global"
              onClick={() => {
                setSelectedInstituteId(null);
                setSelectedProfessorId(null);
                setActiveCategoryFilter('Todos');
                setStudentSearch('');
                setActiveCampusTab('Wiki');
              }}
              className="group flex items-center gap-2 text-xs text-zinc-400 hover:text-yellow-400 font-mono tracking-widest font-black uppercase cursor-pointer pb-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              VOLVER AL DIRECTORIO DE INSTITUTOS
            </button>

            {/* School Profile Hero Cover */}
            <div className="bg-[#0b0b0c] border border-zinc-900 rounded-2xl md:rounded-3xl overflow-hidden relative shadow-2xl">
              {/* Cover Banner Image with elegant vignette */}
              <div className="h-40 md:h-56 relative bg-gradient-to-b from-zinc-900 to-zinc-950">
                <img 
                  src={currentSelectedInstitute.portadaPhotoUrl || currentSelectedInstitute.image} 
                  alt={currentSelectedInstitute.name} 
                  className="w-full h-full object-cover opacity-45" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                
                {/* Float elements right */}
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setShowShareToast(true);
                      setTimeout(() => setShowShareToast(false), 2000);
                    }}
                    className="p-2.5 rounded-full bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-yellow-400 transition-all shadow-lg active:scale-95 cursor-pointer"
                    title="Compartir campus"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Share Success Toast notifier */}
              <AnimatePresence>
                {showShareToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-black font-mono text-xs font-black px-4 py-2 rounded-xl shadow-2xl z-50 flex items-center gap-1.5 border border-yellow-300"
                  >
                    <span>¡ENLACE COPIADO AL PORTAPAPELES! 🔗</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Overlapping Info block matching layout */}
              <div className="px-6 pb-6 pt-2 md:px-10 md:pb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                
                {/* Left side: Avatar + Title with flex-row */}
                <div className="flex flex-col md:flex-row md:items-center gap-5 -mt-10 md:-mt-14 w-full md:w-auto">
                  
                  {/* Dynamic Big Circular Avatar with Letter "I" */}
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-[#161618] border-4 border-[#050505] flex items-center justify-center text-zinc-450 font-mono font-black text-3xl md:text-5xl shadow-2xl shrink-0 selection:bg-transparent select-none select-none text-zinc-450 text-white overflow-hidden">
                    {currentSelectedInstitute.perfilPhotoUrl ? (
                      <img src={currentSelectedInstitute.perfilPhotoUrl} alt={currentSelectedInstitute.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      currentSelectedInstitute.name ? currentSelectedInstitute.name.charAt(0).toUpperCase() : 'I'
                    )}
                  </div>

                  <div className="space-y-1.5 max-w-xl">
                    <h2 className="text-xl md:text-3xl font-display font-black text-white uppercase tracking-tight leading-snug">
                      {currentSelectedInstitute.name}
                    </h2>
                    <p className="text-zinc-400 text-xs font-mono font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-yellow-400" />
                      {currentSelectedInstitute.location}
                    </p>
                  </div>
                </div>

              </div>

              {/* Description bar */}
              <div className="px-6 md:px-10 py-5 bg-[#0e0e10]/80 border-t border-zinc-900/60 text-xs text-zinc-400 leading-relaxed flex flex-col md:flex-row md:items-center justify-between gap-6">
                <span className="block max-w-2xl font-sans font-medium text-zinc-400">
                  {currentSelectedInstitute.description || 'Este instituto de calidad ofrece disciplinas y carreras profesionales en constante innovación académica.'}
                </span>
              </div>
            </div>

            {/* HIGH-FIDELITY SEARCH BAR (from standard reference) */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-yellow-400 transition-colors z-10">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="campus-search-input-mockup"
                type="text"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  if (activeCampusTab !== 'Profesores') {
                    setActiveCampusTab('Profesores');
                  }
                }}
                placeholder="Buscar profesor..."
                className="w-full bg-[#0d0d0f] focus:bg-[#121215] border border-zinc-900 focus:border-yellow-400/40 text-xs sm:text-sm py-3.5 pl-11 pr-4 rounded-xl text-zinc-200 outline-none placeholder-zinc-500/85 transition-colors shadow-2xl font-mono duration-200 focus:ring-1 focus:ring-yellow-400/20"
              />
              {studentSearch && (
                <button 
                  onClick={() => setStudentSearch('')}
                  className="absolute inset-y-0 right-4 flex items-center text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* MOCKUP SUB-TABS STRIP (Direct alignment to reference screen) */}
            <div className="bg-[#0b0b0c] border border-zinc-900 border-y py-1.5 overflow-x-auto flex items-center gap-1.5 scrollbar-none rounded-xl px-2">
              {[
                { id: 'Wiki', label: 'Wiki', icon: <BookOpen className="w-3.5 h-3.5" /> },
                { id: 'Profesores', label: 'Profesores', icon: <Shield className="w-3.5 h-3.5" /> },
                { id: 'Rachas', label: 'Rachas', icon: <Flame className="w-3.5 h-3.5" /> },
              ].map(tab => {
                const isActive = activeCampusTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveCampusTab(tab.id as any);
                    }}
                    className={`flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl transition-all duration-300 font-mono font-bold whitespace-nowrap uppercase cursor-pointer ${
                      isActive 
                        ? 'bg-[#fbbf24] text-black shadow-md font-black ring-1 ring-amber-400' 
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121215]'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TARGET CONTENT CONTAINER PANEL */}
            <AnimatePresence mode="wait">
              
              {/* TAB 1: ESTUDIANTES (ELIMINADO) */}
              {false && (
                <motion.div
                  key="tab-estudiantes-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Secondary control drawer: categories + sorting + view toggles */}
                  <div className="bg-[#08080a]/90 border border-zinc-900/65 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Category quick selectors */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1.5 md:pb-0 scrollbar-none select-none">
                      <span className="text-[10px] uppercase font-mono font-black text-zinc-500 mr-1.5 shrink-0">Categoría:</span>
                      {['Todos', 'Artista', 'Deportista', 'Académico', 'Influencer', 'Gaming', 'Líder'].map(cat => {
                        const isCatActive = activeCategoryFilter === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setActiveCategoryFilter(cat)}
                            className={`text-[11px] px-3 py-1.5 rounded-xl border transition-all shrink-0 font-mono tracking-wide ${
                              isCatActive 
                                ? 'bg-[#fbbf24] text-black border-[#fbbf24] font-bold shadow' 
                                : getCategoryThemeColor(cat as Alumno['category'])
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    {/* View mode toggle + Ordering */}
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                      
                      {/* Sort selection button */}
                      <div className="flex items-center gap-1.5 bg-[#0f0f12] border border-zinc-900 p-1.5 rounded-xl">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 ml-1" />
                        <span className="text-[9px] font-mono font-black text-zinc-500 uppercase">Orden:</span>
                        <select
                          value={studentSortOrder}
                          onChange={(e) => setStudentSortOrder(e.target.value as any)}
                          className="bg-transparent border-none text-[10px] font-mono font-black text-zinc-300 outline-none pr-1.5 cursor-pointer hover:text-yellow-400 uppercase"
                        >
                          <option value="puntos" className="bg-[#0f0f12]">PUNTOS</option>
                          <option value="nombre" className="bg-[#0f0f12]">NOMBRE</option>
                          <option value="estrellas" className="bg-[#0f0f12]">RATING</option>
                        </select>
                      </div>

                      {/* Display toggle mode icons */}
                      <div className="flex items-center bg-[#09090b] border border-zinc-900 p-1 rounded-xl gap-1">
                        <button
                          onClick={() => setCampusViewMode('list')}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            campusViewMode === 'list' 
                              ? 'bg-[#fbbf24] text-black shadow-md' 
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="Vista de Lista"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCampusViewMode('grid')}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            campusViewMode === 'grid' 
                              ? 'bg-[#fbbf24] text-black shadow-md' 
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          title="Vista de Mosaico"
                        >
                          <Grid className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Empty state or render */}
                  {filteredAlumnosInCampus.length === 0 ? (
                    <div id="no-students-fallback" className="bg-[#0b0b0c] border border-zinc-900 border-dashed rounded-2xl p-16 text-center text-zinc-500 space-y-4">
                      <Users className="w-10 h-10 text-zinc-650 mx-auto animate-pulse" />
                      <h4 className="font-display font-bold text-white text-base">Aún no hay estrellas registradas</h4>
                      <p className="text-xs max-w-sm mx-auto text-zinc-400">
                        Sé el primero en postular o nominar al alumno con más influencia o talento para esta categoría.
                      </p>
                      <button
                        onClick={() => setIsNominateModalOpen(true)}
                        className="bg-yellow-400 text-black text-xs px-4 py-2 rounded-xl transition-all font-mono font-bold cursor-pointer"
                      >
                        Nominar Alumno
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* HIGH-FIDELITY LIST VIEW RENDER matching reference cover screenshot */}
                      {campusViewMode === 'list' ? (
                        <div className="space-y-2.5">
                          {filteredAlumnosInCampus.map((al, index) => {
                            // Extract initials
                            const initials = al.name
                              ?.split(' ')
                              .filter(Boolean)
                              .map(part => part[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase() || 'S';

                            return (
                              <motion.div
                                key={al.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="bg-[#0b0b0c] hover:bg-zinc-950/70 border border-zinc-900/80 hover:border-zinc-800/80 p-4 rounded-xl flex items-center justify-between gap-4 transition-all duration-200 group hover:shadow-[0_4px_20px_rgba(250,204,21,0.02)]"
                              >
                                {/* Left side layout: index, initials avatar, name and sub metrics */}
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Rank Number Circle */}
                                  <div className="w-7 h-7 rounded-full bg-[#121214] border border-zinc-850 text-[11px] text-zinc-500 font-mono font-bold flex items-center justify-center shrink-0">
                                    {index + 1}
                                  </div>

                                  {/* Student Letter initials Avatar Circle */}
                                  {al.avatar && !al.avatar.includes('placeholder') ? (
                                    <img 
                                      src={al.avatar} 
                                      alt={al.name}
                                      referrerPolicy="no-referrer"
                                      className="w-10 h-10 rounded-full object-cover border border-zinc-800 shrink-0 shadow-sm"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-[#121214] border border-zinc-855 flex items-center justify-center font-mono font-bold text-xs text-yellow-405 text-yellow-400 shrink-0">
                                      {initials}
                                    </div>
                                  )}

                                  {/* Name, nickname, verification, and sub row */}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <h3 
                                        onClick={() => {
                                          setSelectedAlumnoId(al.id);
                                          window.scrollTo({ top: 300, behavior: 'smooth' });
                                        }}
                                        className="font-sans font-bold text-zinc-100 hover:text-yellow-400 cursor-pointer transition-colors text-sm truncate uppercase tracking-tight"
                                      >
                                        {al.name}
                                      </h3>
                                      {al.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                                    </div>

                                    {/* Interactive Metrics Row from user uploaded reference */}
                                    <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-zinc-500 font-medium">
                                      {/* Heart / Flame votes points */}
                                      <div className="flex items-center gap-1">
                                        <Heart className="w-3 h-3 text-pink-500 fill-pink-500/25" />
                                        <span>{al.points}</span>
                                      </div>
                                      {/* Group / views icon */}
                                      <div className="flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5 text-sky-400" />
                                        <span>{al.views || Math.floor((al.points * 3.4) + 12)}</span>
                                      </div>
                                      {/* Hearts cracked (dislikes) - constant 0 as in mockup */}
                                      <div className="flex items-center gap-1">
                                        <HeartCrack className="w-3 h-3 text-zinc-650 text-zinc-600" />
                                        <span>0</span>
                                      </div>
                                      {/* Course Tag */}
                                      <span className="hidden sm:inline-block text-[9px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-zinc-800/40">
                                        {al.course.split(' - ')[0]}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right side layout: rating indicator & trigger to view profile */}
                                <div className="flex items-center gap-4 shrink-0">
                                  {/* Golden Average Rating Tag */}
                                  <div className="text-right">
                                    <span className="text-xs font-black text-yellow-400 font-mono flex items-center gap-1 bg-yellow-400/5 px-2.5 py-1 rounded-lg border border-yellow-400/20 shadow-inner">
                                      ★ {al.starsPopularity ? al.starsPopularity.toFixed(1) : "0.0"}
                                    </span>
                                  </div>

                                  {/* Quick action profile check button */}
                                  <button
                                    onClick={() => {
                                      setSelectedAlumnoId(al.id);
                                      window.scrollTo({ top: 300, behavior: 'smooth' });
                                    }}
                                    className="hidden sm:block text-[10px] font-mono font-black text-[#a1a1aa] hover:text-yellow-400 border border-zinc-805 hover:border-yellow-400/30 px-3 py-1.5 rounded-lg bg-zinc-900/40 transition-colors uppercase cursor-pointer"
                                  >
                                    Ver Wiki
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        /* BENTO GRID VISTA DE MOSAICO (Original high-card visual bento rendering) */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredAlumnosInCampus.map((al, index) => {
                            return (
                              <motion.div
                                key={al.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ y: -5 }}
                                className="bg-[#0b0b0d] border border-zinc-900 hover:border-yellow-400/35 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-2xl transition-all duration-300 hover:shadow-[0_12px_30px_rgba(250,204,21,0.04)]"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-800/80 px-2.5 py-1 rounded-lg text-zinc-400 max-w-[180px] truncate">
                                    {al.course.split(' - ')[0]}
                                  </div>
                                  <div className="text-[9px] font-mono font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 shadow-sm">
                                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-current animate-pulse" />
                                    <span>{al.points} pt</span>
                                  </div>
                                </div>

                                <div className="mt-4 flex items-start gap-3.5">
                                  {al.avatar && !al.avatar.includes('placeholder') ? (
                                    <img 
                                      src={al.avatar} 
                                      alt={al.name} 
                                      referrerPolicy="no-referrer"
                                      className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400/30 shrink-0 shadow-md" 
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-yellow-500 shrink-0 shadow-md uppercase">
                                      {al.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h4 
                                        onClick={() => {
                                          setSelectedAlumnoId(al.id);
                                          window.scrollTo({ top: 300, behavior: 'smooth' });
                                        }}
                                        className="font-sans font-bold text-sm text-zinc-100 hover:text-yellow-400 transition-colors uppercase tracking-tight truncate cursor-pointer"
                                      >
                                        {al.name}
                                      </h4>
                                      {al.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                                    </div>
                                    {al.nickname && (
                                      <span className="text-[10px] text-yellow-500 font-mono font-semibold">@{al.nickname}</span>
                                    )}
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <span className="p-0.5 rounded bg-zinc-900 inline-block border border-zinc-800">
                                        {getCategoryIcon(al.category)}
                                      </span>
                                      <span className="text-[9px] font-mono text-zinc-400 tracking-wider uppercase font-black">
                                        {al.category}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <p className="mt-3.5 text-[11px] text-zinc-400 leading-relaxed italic line-clamp-2 font-sans font-medium">
                                  "{al.bio || 'Sin biografía disponible. ¡Postula o edita su ficha!'}"
                                </p>

                                <div className="mt-4 pt-3.5 border-t border-zinc-900/60 grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono text-zinc-500">
                                  <div className="bg-zinc-900/30 border border-zinc-900/50 p-2 rounded-xl">
                                    <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wide">Popu</span>
                                    <span className="text-white font-black text-xs">★ {al.starsPopularity?.toFixed(1) || '0.0'}</span>
                                  </div>
                                  <div className="bg-zinc-900/30 border border-zinc-900/50 p-2 rounded-xl">
                                    <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wide">Caris</span>
                                    <span className="text-white font-black text-xs">★ {al.starsCharisma?.toFixed(1) || '0.0'}</span>
                                  </div>
                                  <div className="bg-zinc-900/30 border border-zinc-900/50 p-2 rounded-xl">
                                    <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wide">Talen</span>
                                    <span className="text-white font-black text-xs">★ {al.starsTalent?.toFixed(1) || '0.0'}</span>
                                  </div>
                                </div>

                                <div className="mt-4 pt-1.5 flex gap-2">
                                  <button
                                    onClick={() => handleUpvote(al.id)}
                                    className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black text-[11px] font-mono font-black py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-yellow-400/10 hover:-translate-y-0.5 active:translate-y-0"
                                  >
                                    <Flame className="w-3.5 h-3.5 text-amber-600 fill-current" />
                                    <span>VOTAR</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedAlumnoId(al.id);
                                      window.scrollTo({ top: 300, behavior: 'smooth' });
                                    }}
                                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 hover:border-zinc-700 text-[11px] font-mono font-bold py-2.5 rounded-xl transition-all text-center cursor-pointer hover:-translate-y-0.5"
                                  >
                                    VER WIKI
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* TAB 3: HERMOSO (Hall of fame) (ELIMINADO) */}
              {false && (
                <motion.div
                  key="tab-hermoso-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-gradient-to-r from-[#0d0d10] to-yellow-950/20 border border-yellow-500/20 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-display font-black text-lg text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-400 animate-pulse animate-bounce" />
                        MURO DE CARISMA & BEAUTY ESTELAR
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans font-medium">
                        Nominados más destacados en carisma social, estética expresiva y popularidad de la comunidad.
                      </p>
                    </div>
                  </div>

                  {/* Top rated per charisma stars list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {alumnos
                      .filter(a => a.instituteId === selectedInstituteId)
                      .sort((a,b) => b.starsCharisma - a.starsCharisma)
                      .slice(0, 3)
                      .map((al, index) => {
                        const crownColors = ['text-yellow-400', 'text-zinc-400', 'text-amber-600'];
                        return (
                          <div
                            key={al.id}
                            className="bg-[#0b0b0c] border border-yellow-500/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between hover:shadow-[0_4px_30px_rgba(250,204,21,0.05)] transition-all"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/2 rounded-full blur-xl pointer-events-none" />
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-mono font-black text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                                PODIO {index + 1}
                              </span>
                              <Crown className={`w-5 h-5 ${crownColors[index] || 'text-yellow-400'}`} />
                            </div>

                            <div className="mt-4 flex items-center gap-3">
                              {al.avatar && !al.avatar.includes('placeholder') ? (
                                <img 
                                  src={al.avatar} 
                                  alt={al.name} 
                                  className="w-12 h-12 rounded-full object-cover border-2 border-yellow-400/50 shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-[#121214] border-2 border-yellow-400/30 flex items-center justify-center font-mono font-black text-sm text-yellow-400 shrink-0 uppercase">
                                  {al.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="font-sans font-bold text-sm text-white uppercase tracking-tight truncate">{al.name}</h4>
                                <span className="text-[10px] text-zinc-400 font-mono italic">Promedio Carisma: ★ {al.starsCharisma}</span>
                              </div>
                            </div>

                            <p className="mt-4 text-xs italic text-zinc-400 font-medium leading-relaxed">"{al.bio || 'Una de las personalidades más queridas y carismáticas del campus.'}"</p>

                            <div className="mt-4 pt-3.5 border-t border-zinc-900 flex justify-between items-center">
                              <span className="text-[11px] font-mono text-zinc-500">Puntaje global: <strong className="text-white">{al.points} pt</strong></span>
                              <button
                                onClick={() => {
                                  setSelectedAlumnoId(al.id);
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                                className="text-[10px] bg-zinc-900 border border-zinc-800 text-yellow-400 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors uppercase font-mono font-bold cursor-pointer"
                              >
                                Ver Ficha
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  
                  {alumnos.filter(a => a.instituteId === selectedInstituteId).length === 0 && (
                    <div className="text-center py-10 text-zinc-500 text-xs">No hay postulantes registrados en el campus.</div>
                  )}
                </motion.div>
              )}

              {/* TAB: CLEAN & SIMPLIFIED WIKI */}
              {activeCampusTab === 'Wiki' && (
                <motion.div
                  key="tab-wiki-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#0b0b0c] border border-zinc-900 p-6 sm:p-8 rounded-2xl space-y-6"
                >
                  <div className="border-b border-zinc-900 pb-4 flex flex-row justify-between items-start gap-4">
                    <div className="text-left">
                      <h3 className="font-sans font-bold text-lg sm:text-xl text-white tracking-tight">
                        Información del Instituto
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans mt-0.5">
                        Datos sobre {currentSelectedInstitute.name}.
                      </p>
                    </div>
                    {!isEditingWiki && (
                      <button
                        onClick={startEditingWiki}
                        className="bg-[#0c0c0e] hover:bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700 text-xs font-sans font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-sm"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    )}
                  </div>

                  {isEditingWiki ? (
                    <form onSubmit={handleSaveInstituteWiki} className="space-y-6 text-left">
                      {/* Photo inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-[#070708] border border-zinc-900 p-4 rounded-xl space-y-3">
                          <label className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-bold block">
                            Enlace de Imagen (Perfil)
                          </label>
                          <div className="flex gap-3">
                            <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden flex items-center justify-center">
                              {wikiPerfilPhoto ? (
                                <img src={wikiPerfilPhoto} alt="Perfil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <School className="w-5 h-5 text-zinc-600" />
                              )}
                            </div>
                            <div className="relative flex-1">
                              <input
                                type="url"
                                value={wikiPerfilPhoto}
                                onChange={(e) => setWikiPerfilPhoto(e.target.value)}
                                placeholder="https://ejemplo.com/perfil.jpg"
                                className={`w-full bg-[#0c0c0d] border ${wikiErrors.perfilPhoto ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-yellow-400'} text-xs p-3 pr-10 rounded-xl text-zinc-100 outline-none transition-all duration-200`}
                              />
                              {wikiPerfilPhoto && (
                                <button
                                  type="button"
                                  onClick={() => setWikiPerfilPhoto('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          {wikiErrors.perfilPhoto && (
                            <p className="text-red-500 font-mono text-[10px] mt-1 text-left leading-relaxed">
                              ⚠️ {wikiErrors.perfilPhoto}
                            </p>
                          )}
                        </div>

                        <div className="bg-[#070708] border border-[#070708] p-4 rounded-xl space-y-3">
                          <label className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-bold block">
                            Enlace de Foto de Portada
                          </label>
                          <div className="flex gap-3">
                            <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden flex items-center justify-center">
                              {wikiPortadaPhoto ? (
                                <img src={wikiPortadaPhoto} alt="Portada" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <School className="w-5 h-5 text-zinc-600" />
                              )}
                            </div>
                            <div className="relative flex-1">
                              <input
                                type="url"
                                value={wikiPortadaPhoto}
                                onChange={(e) => setWikiPortadaPhoto(e.target.value)}
                                placeholder="https://ejemplo.com/portada.jpg"
                                className={`w-full bg-[#0c0c0d] border ${wikiErrors.portadaPhoto ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-yellow-400'} text-xs p-3 pr-10 rounded-xl text-zinc-100 outline-none transition-all duration-200`}
                              />
                              {wikiPortadaPhoto && (
                                <button
                                  type="button"
                                  onClick={() => setWikiPortadaPhoto('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          {wikiErrors.portadaPhoto && (
                            <p className="text-red-500 font-mono text-[10px] mt-1 text-left leading-relaxed">
                              ⚠️ {wikiErrors.portadaPhoto}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Year input */}
                      <div className="bg-[#070708] border border-zinc-900 p-4 rounded-xl space-y-3">
                        <label className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-bold block">
                          Año de Fundación
                        </label>
                        <select
                          value={wikiAnoFundacion}
                          onChange={(e) => setWikiAnoFundacion(e.target.value)}
                          className="w-full bg-[#0c0c0d] border border-zinc-800 focus:border-yellow-400 text-xs p-3 rounded-xl text-zinc-100 outline-none transition-all duration-200 cursor-pointer"
                        >
                          <option value="">Selecciona un año (No especificado)</option>
                          {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      {/* Social Network inputs */}
                      <div className="bg-[#070708] border border-zinc-900 p-5 rounded-xl space-y-4">
                        <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-bold block border-b border-zinc-900 pb-2">
                          Redes Sociales
                        </span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                              <Instagram className="w-3 h-3 text-pink-500" /> Instagram
                            </label>
                            <div className="relative">
                              <input
                                type="url"
                                value={wikiInstagram}
                                onChange={(e) => setWikiInstagram(e.target.value)}
                                placeholder="https://instagram.com/nombre"
                                className={`w-full bg-[#0c0c0d] border ${wikiErrors.instagram ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-yellow-400'} text-xs p-3 pr-10 rounded-xl text-zinc-100 outline-none transition-all duration-200`}
                              />
                              {wikiInstagram && (
                                <button
                                  type="button"
                                  onClick={() => setWikiInstagram('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {wikiErrors.instagram && (
                              <p className="text-red-500 font-mono text-[9px] mt-0.5 leading-tight">
                                ⚠️ {wikiErrors.instagram}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                              <Youtube className="w-3 h-3 text-red-500" /> YouTube
                            </label>
                            <div className="relative">
                              <input
                                type="url"
                                value={wikiYoutube}
                                onChange={(e) => setWikiYoutube(e.target.value)}
                                placeholder="https://youtube.com/c/canal"
                                className={`w-full bg-[#0c0c0d] border ${wikiErrors.youtube ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-yellow-400'} text-xs p-3 pr-10 rounded-xl text-zinc-100 outline-none transition-all duration-200`}
                              />
                              {wikiYoutube && (
                                <button
                                  type="button"
                                  onClick={() => setWikiYoutube('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {wikiErrors.youtube && (
                              <p className="text-red-500 font-mono text-[9px] mt-0.5 leading-tight">
                                ⚠️ {wikiErrors.youtube}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                              <Facebook className="w-3 h-3 text-blue-500" /> Facebook
                            </label>
                            <div className="relative">
                              <input
                                type="url"
                                value={wikiFacebook}
                                onChange={(e) => setWikiFacebook(e.target.value)}
                                placeholder="https://facebook.com/pagina"
                                className={`w-full bg-[#0c0c0d] border ${wikiErrors.facebook ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-yellow-400'} text-xs p-3 pr-10 rounded-xl text-zinc-100 outline-none transition-all duration-200`}
                              />
                              {wikiFacebook && (
                                <button
                                  type="button"
                                  onClick={() => setWikiFacebook('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {wikiErrors.facebook && (
                              <p className="text-red-500 font-mono text-[9px] mt-0.5 leading-tight">
                                ⚠️ {wikiErrors.facebook}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                              <Twitter className="w-3 h-3 text-zinc-300" /> Twitter / X
                            </label>
                            <div className="relative">
                              <input
                                type="url"
                                value={wikiTwitter}
                                onChange={(e) => setWikiTwitter(e.target.value)}
                                placeholder="https://x.com/usuario"
                                className={`w-full bg-[#0c0c0d] border ${wikiErrors.twitter ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-yellow-400'} text-xs p-3 pr-10 rounded-xl text-zinc-100 outline-none transition-all duration-200`}
                              />
                              {wikiTwitter && (
                                <button
                                  type="button"
                                  onClick={() => setWikiTwitter('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {wikiErrors.twitter && (
                              <p className="text-red-500 font-mono text-[9px] mt-0.5 leading-tight">
                                ⚠️ {wikiErrors.twitter}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end gap-3 pt-3 border-t border-zinc-900/80">
                        <button
                          type="button"
                          onClick={() => setIsEditingWiki(false)}
                          className="bg-zinc-950 hover:bg-zinc-900 text-zinc-400 px-5 py-3 rounded-xl text-xs font-mono font-bold transition-all duration-200 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingWikiEdit}
                          className="bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 font-black text-xs px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer uppercase tracking-wider font-mono shadow-sm"
                        >
                          {isSubmittingWikiEdit ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6 text-left">
                      {/* Año de Fundación */}
                      <div className="flex items-start gap-4 py-2">
                        <Calendar className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="block text-xs text-zinc-400 font-sans">Año de Fundación</span>
                          <span className="text-sm sm:text-base font-sans font-black text-white">
                            {currentSelectedInstitute.anoDeFundacion || 'No especificado'}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-zinc-900/80" />

                      {/* Redes Sociales */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-zinc-500 shrink-0" />
                          <span className="text-xs text-zinc-400 font-sans">Redes Sociales</span>
                        </div>

                        <div className="flex flex-wrap gap-6 pl-1">
                          {currentSelectedInstitute.redesSociales?.facebook && (
                            <a
                              href={currentSelectedInstitute.redesSociales.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center gap-2 group cursor-pointer"
                            >
                              <div className="w-14 h-14 rounded-2xl bg-[#141416] hover:bg-[#1a1a1d] border border-zinc-800/80 group-hover:border-blue-500/30 flex items-center justify-center transition-all duration-200">
                                <Facebook className="w-5 h-5 text-white group-hover:text-blue-400 transition-colors" />
                              </div>
                              <span className="text-[11px] font-sans text-zinc-400 group-hover:text-white transition-colors">
                                Facebook
                              </span>
                            </a>
                          )}

                          {currentSelectedInstitute.redesSociales?.instagram && (
                            <a
                              href={currentSelectedInstitute.redesSociales.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center gap-2 group cursor-pointer"
                            >
                              <div className="w-14 h-14 rounded-2xl bg-[#141416] hover:bg-[#1a1a1d] border border-zinc-800/80 group-hover:border-pink-500/30 flex items-center justify-center transition-all duration-200">
                                <Instagram className="w-5 h-5 text-white group-hover:text-pink-400 transition-colors" />
                              </div>
                              <span className="text-[11px] font-sans text-zinc-400 group-hover:text-white transition-colors">
                                Instagram
                              </span>
                            </a>
                          )}

                          {currentSelectedInstitute.redesSociales?.youtube && (
                            <a
                              href={currentSelectedInstitute.redesSociales.youtube}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center gap-2 group cursor-pointer"
                            >
                              <div className="w-14 h-14 rounded-2xl bg-[#141416] hover:bg-[#1a1a1d] border border-zinc-800/80 group-hover:border-red-500/30 flex items-center justify-center transition-all duration-200">
                                <Youtube className="w-5 h-5 text-white group-hover:text-red-400 transition-colors" />
                              </div>
                              <span className="text-[11px] font-sans text-zinc-400 group-hover:text-white transition-colors">
                                YouTube
                              </span>
                            </a>
                          )}

                          {currentSelectedInstitute.redesSociales?.twitter && (
                            <a
                              href={currentSelectedInstitute.redesSociales.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center gap-2 group cursor-pointer"
                            >
                              <div className="w-14 h-14 rounded-2xl bg-[#141416] hover:bg-[#1a1a1d] border border-zinc-800/80 group-hover:border-zinc-400/30 flex items-center justify-center transition-all duration-200">
                                <Twitter className="w-5 h-5 text-white group-hover:text-zinc-300 transition-colors" />
                              </div>
                              <span className="text-[11px] font-sans text-zinc-400 group-hover:text-white transition-colors">
                                Twitter / X
                              </span>
                            </a>
                          )}

                          {(!currentSelectedInstitute.redesSociales?.instagram &&
                            !currentSelectedInstitute.redesSociales?.youtube &&
                            !currentSelectedInstitute.redesSociales?.facebook &&
                            !currentSelectedInstitute.redesSociales?.twitter) && (
                            <p className="text-xs text-zinc-500 italic font-sans leading-relaxed">
                              No se han registrado redes sociales oficiales. ¡Contribuye editando la Wiki!
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-zinc-900/60 text-left">
                    <p className="text-[10px] sm:text-xs text-zinc-500 font-mono uppercase tracking-wide">
                      ✏️ Sincronización comunitaria democrática. Cualquiera puede contribuir con datos verificados.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: PROFESORES DIRECTORY */}
              {activeCampusTab === 'Profesores' && (
                <motion.div
                  key="tab-profesores-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-[#0b0b0c] border border-zinc-900 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white uppercase tracking-widest flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-400" />
                        DIRECTORIO DE DOCENTES DEL INSTITUTO
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Vota de manera constructiva por los profesores universitarios de tu carrera profesional.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsAddProfessorModalOpen(true)}
                      className="bg-yellow-400 text-black hover:bg-yellow-300 font-black text-[11px] px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 font-mono tracking-wider shadow-[0_4px_12px_rgba(250,204,21,0.15)] hover:shadow-[0_4px_18px_rgba(250,204,21,0.25)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer uppercase shrink-0"
                    >
                      <Plus className="w-4 h-4 text-black" />
                      AGREGAR PROFESOR 👨‍🏫
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredProfessorsInCampus.map((prof) => {
                      const rating = typeof prof.rating === 'number' ? prof.rating.toFixed(1) : '0.0';

                      return (
                        <div
                          key={prof.id}
                          onClick={() => setSelectedProfessorId(prof.id)}
                          className="bg-[#0b0b0c] border border-zinc-900 p-5 rounded-xl hover:border-yellow-400/20 hover:bg-[#121214]/40 transition-all duration-300 cursor-pointer group flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar fallback for teacher */}
                            <div className="w-10 h-10 rounded-full bg-[#121214] border border-zinc-800 flex items-center justify-center text-xs text-yellow-400 font-mono font-black shrink-0 transition-all group-hover:border-yellow-400/30">
                              {prof.gender === 'male' ? '👨‍🏫' : '👩‍🏫'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-sans font-bold text-white text-sm uppercase group-hover:text-yellow-400 transition-colors truncate">{prof.nombreCompleto}</h4>
                              <div className="flex items-center gap-2 mt-0.5 font-mono text-[9px] text-zinc-500 uppercase font-black">
                                <span className="text-zinc-400">Docente</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">👥 {prof.yoTeConozcoCount || 0}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-red-400/80">❤️ {prof.fanCount || 0}</span>
                              </div>
                            </div>
                          </div>

                          {/* Score badge */}
                          <div className="flex items-center gap-1 bg-yellow-400/5 px-2.5 py-1 rounded border border-yellow-400/10 shrink-0 text-[10px] font-mono font-black text-yellow-400">
                            <span>★</span>
                            <span>{rating}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {professors.length === 0 && (
                    <div className="text-center py-10 text-zinc-500 text-xs font-mono">No hay docentes registrados en este instituto.</div>
                  )}

                  {professors.length > 0 && filteredProfessorsInCampus.length === 0 && (
                    <div className="text-center py-10 text-zinc-500 text-xs font-mono">No se encontraron docentes con esos términos de búsqueda.</div>
                  )}
                </motion.div>
              )}

              {/* TAB 6: RACHAS DAILY ENGAGEMENT */}
              {activeCampusTab === 'Rachas' && (
                <motion.div
                  key="tab-rachas-panel"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#0b0b0c] border border-zinc-900 rounded-2xl p-5 sm:p-8 space-y-6"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-850 pb-5">
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className="font-display font-black text-lg text-white uppercase tracking-widest flex items-center justify-center sm:justify-start gap-2">
                        <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
                        TABLERO DE ESTADÍSTICAS Y RACHAS DIARIAS
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans">
                        Reclama tus puntos diarios de WikiStars y compite por mantener viva tu racha en Uchiza.
                      </p>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl text-center self-stretch sm:self-auto shrink-0">
                      <span className="block text-[8px] font-mono text-amber-500 uppercase font-black">Mi Racha de Ficha</span>
                      <span className="text-base font-black text-white font-mono flex items-center justify-center gap-0.5">
                        🔥 {userStreakCount} DÍAS
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div className="space-y-4 md:col-span-2">
                      <h4 className="font-sans font-bold text-xs text-zinc-200 uppercase tracking-wider">¿Por qué es importante una racha?</h4>
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans font-medium">
                        WikiStars5 promueve la participation activa de los alumnos. Aquellos compañeros que visiten la applet de manera cotidiana, voten, comenten constructivamente o sugieran nuevas estrellas de Uchiza obtienen rachas y recompensas que elevan el prestigio de su instituto.
                      </p>

                      <div className="bg-[#121214]/60 border border-zinc-900 p-5 rounded-xl text-center space-y-3">
                        <p className="text-xs text-zinc-350 font-sans font-semibold">
                          {streakClaimed 
                            ? '🎉 ¡Excelente! Has sumado tu voto de racha diaria hoy. Regresa mañana.'
                            : '⚡ ¿Listo para hoy? Presiona el botón para agregar 1 día de presencia y registrar tu actividad.'}
                        </p>
                        <button
                          disabled={streakClaimed}
                          onClick={() => {
                            setStreakClaimed(true);
                            setUserStreakCount(c => c + 1);
                            // add social log
                            setSocialLogs(l => [`⚡ ¡Reclamaste tu racha diaria de la Wiki y sumaste puntos!`, ...l.slice(0, 4)]);
                          }}
                          className={`px-5 py-3 rounded-full font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            streakClaimed
                              ? 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                              : 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_4px_15px_rgba(250,204,21,0.2)]'
                          }`}
                        >
                          {streakClaimed ? '✓ RECOMPENSA RECLAMADA' : 'Claim Daily Streak +1 🔥'}
                        </button>
                      </div>
                    </div>

                    {/* Streak leaders panel */}
                    <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-4">
                      <h4 className="font-mono text-xs font-black text-zinc-400 uppercase tracking-widest text-center border-b border-zinc-900 pb-2">
                        🔥 LÍDERES DE RACHAS (UCHIZA)
                      </h4>
                      <div className="space-y-3">
                        {[
                          { name: 'Alicia Aurelia Berrospi', days: 12 },
                          { name: 'Almendra Jennifer Daza', days: 7 },
                          { name: 'Mateo Sebastiani', days: 5 },
                          { name: 'Tú (Estudiante)', days: userStreakCount }
                        ].map((leader, i) => (
                          <div key={i} className="flex items-center justify-between text-xs font-mono border-b border-[#121214] pb-2">
                            <span className="text-zinc-400 truncate max-w-[140px] uppercase font-bold">{leader.name}</span>
                            <span className="text-yellow-400 font-extrabold">{leader.days} DÍAS 🔥</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          </motion.div>
        )}

        {/* VIEW 3: SEPARATE STUDENT PROFILE WIKI DETAIL */}
        {selectedAlumnoId && currentSelectedAlumno && (
          <motion.div 
            id="student-wiki-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            {/* Back to Campus Hub */}
            <button 
              id="back-to-campus-btn"
              onClick={() => setSelectedAlumnoId(null)}
              className="group flex items-center gap-2 text-xs text-zinc-400 hover:text-yellow-400 font-mono tracking-widest font-black uppercase cursor-pointer pb-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              VOLVER AL CAMPUS {currentSelectedInstitute?.shortName}
            </button>

            {/* Profile Large Card Header */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
              {/* Abs decoration backdrop */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.06)_0%,transparent_70%)] pointer-events-none rounded-full blur-3xl" />
              
              <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
                {/* Large Avatar */}
                <div className="relative mx-auto md:mx-0 shrink-0">
                  <img 
                    src={currentSelectedAlumno.avatar} 
                    alt={currentSelectedAlumno.name} 
                    referrerPolicy="no-referrer"
                    className="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover border-4 border-yellow-400 shadow-2xl shadow-yellow-400/10 shrink-0" 
                  />
                  <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-black px-2.5 py-1 rounded-lg text-[9px] font-mono font-black border-2 border-zinc-950 shadow-lg tracking-wider uppercase">
                    WIKISTAR
                  </div>
                </div>

                {/* Profile info details */}
                <div className="flex-1 space-y-3 text-center md:text-left min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center gap-2.5 justify-center md:justify-start">
                    <h2 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
                      {currentSelectedAlumno.name}
                      {currentSelectedAlumno.isVerified && <CheckCircle2 className="w-5 h-5 text-yellow-400" />}
                    </h2>
                    
                    <span className="text-xs px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 font-mono font-bold max-w-fit mx-auto md:mx-0">
                      {currentSelectedAlumno.course}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1.5">
                    {currentSelectedAlumno.nickname && (
                      <span className="text-xs font-black text-yellow-400 font-mono bg-yellow-400/5 px-2.5 py-1 rounded-lg border border-yellow-400/20 leading-none">
                        @{currentSelectedAlumno.nickname}
                      </span>
                    )}

                    {/* Category */}
                    <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">
                      {getCategoryIcon(currentSelectedAlumno.category)}
                      <span>Categoría: {currentSelectedAlumno.category}</span>
                    </div>

                    <div className="text-xs font-mono text-zinc-500 font-bold">
                      • {currentSelectedAlumno.views + 120} visualizaciones
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 inline-block p-2 px-3.5 rounded-xl border border-zinc-800/80 text-[10px] text-zinc-450 text-zinc-450 text-zinc-400 max-w-fit mx-auto md:mx-0 font-mono">
                    🏛️ Miembro de: <strong className="text-white font-black">{currentSelectedInstitute?.name} ({currentSelectedInstitute?.shortName})</strong>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic pt-2 font-sans font-medium">
                    "{currentSelectedAlumno.bio}"
                  </p>

                  {/* Social media connections */}
                  {(currentSelectedAlumno.instagram || currentSelectedAlumno.tiktok) && (
                    <div className="pt-2 flex flex-wrap gap-2.5 justify-center md:justify-start">
                      {currentSelectedAlumno.instagram && (
                        <a 
                          href={`https://instagram.com/${currentSelectedAlumno.instagram}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] font-mono font-black text-pink-400 hover:text-white bg-pink-500/5 hover:bg-pink-500/15 border border-pink-500/25 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 transition-all uppercase tracking-wider"
                        >
                          <ExternalLink className="w-3 h-3" />
                          instagram: @{currentSelectedAlumno.instagram}
                        </a>
                      )}
                      {currentSelectedAlumno.tiktok && (
                        <a 
                          href={`https://tiktok.com/@${currentSelectedAlumno.tiktok}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] font-mono font-black text-yellow-400 hover:text-white bg-yellow-400/5 hover:bg-yellow-400/15 border border-yellow-500/25 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 transition-all uppercase tracking-wider"
                        >
                          <ExternalLink className="w-3 h-3" />
                          tiktok: @{currentSelectedAlumno.tiktok}
                        </a>
                      )}
                    </div>
                  )}

                  {currentSelectedAlumno.nominationReason && (
                    <div className="mt-4 p-4 bg-yellow-400/2 rounded-2xl border border-yellow-400/10 text-left">
                      <span className="block text-[9px] font-mono text-yellow-400 uppercase font-black tracking-wider">Razón de nominación comunitaria:</span>
                      <p className="text-[11px] text-zinc-400 mt-1 italic font-medium font-sans">"{currentSelectedAlumno.nominationReason}"</p>
                    </div>
                  )}

                </div>

                {/* Score & Fire interaction panel */}
                <div className="w-full md:w-52 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 text-center shrink-0 space-y-4 shadow-xl">
                  <div>
                    <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 font-black block">SCORE DE CAMPUS</span>
                    <span className="text-3xl sm:text-4xl font-mono font-black text-yellow-400 block mt-1 tracking-tight drop-shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                      🔥 {currentSelectedAlumno.points}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono tracking-tight block font-bold uppercase mt-0.5">puntos de interacción</span>
                  </div>

                  <button
                    onClick={() => handleUpvote(currentSelectedAlumno.id)}
                    className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black text-xs py-3 rounded-xl transition-all duration-300 shadow-lg shadow-yellow-400/10 flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Flame className="w-4 h-4 fill-current text-black animate-pulse" />
                    DAR MI VOTO (+1)
                  </button>

                  <span className="text-[9px] text-zinc-500 block font-mono font-bold uppercase">
                    ¡DEMOCRACIA DIGITALE!
                  </span>
                </div>
              </div>

            </div>

            {/* Rating sliders panel */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div>
                <h3 className="font-display font-black text-white text-lg tracking-tight uppercase flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
                  MÁXIMO CONTROL DE CALIFICACIONES
                </h3>
                <p className="text-zinc-500 text-xs mt-1 leading-relaxed font-sans font-medium">
                  Califica individualmente bajo los estándares fundamentales de WikiStars5. Tu voto recalculará el promedio de la wiki escolar de {currentSelectedAlumno.name} en tiempo real.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                
                {/* Metric 1 - Popularid */}
                <div className="bg-[#080808] border border-zinc-900/80 p-5 rounded-2xl flex flex-col justify-between hover:border-yellow-400/20 transition-colors duration-300">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-white font-mono uppercase tracking-wide">1. POPULARIDAD ⭐</span>
                      <span className="text-yellow-405 text-yellow-400 font-mono font-black">{currentSelectedAlumno.starsPopularity} / 5</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-2 font-medium">Cómo se desenvuelve socialmente y el nivel de reconocimiento que posee globalmente en el campus.</p>
                  </div>
                  
                  {/* Rating Selector */}
                  <div className="mt-5 pt-4 border-t border-zinc-900/50 flex justify-between items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase">Calificar:</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => handleRate(currentSelectedAlumno.id, 'popularity', star)}
                          className="text-zinc-700 hover:text-yellow-400 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
                          title={`Votar con ${star} estrellas`}
                        >
                          <Star className={`w-5 h-5 ${star <= Math.round(currentSelectedAlumno.starsPopularity) ? 'text-yellow-400 fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metric 2 - Charisma */}
                <div className="bg-[#080808] border border-zinc-900/80 p-5 rounded-2xl flex flex-col justify-between hover:border-yellow-400/20 transition-colors duration-300">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-white font-mono uppercase tracking-wide">2. CARISMA 😊</span>
                      <span className="text-yellow-405 text-yellow-400 font-mono font-black">{currentSelectedAlumno.starsCharisma} / 5</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-2 font-medium">Simpatía, trato con el prójimo, empatía y energía positiva inspiradora en los pasillos de clase.</p>
                  </div>
                  
                  {/* Rating Selector */}
                  <div className="mt-5 pt-4 border-t border-zinc-900/50 flex justify-between items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase">Calificar:</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => handleRate(currentSelectedAlumno.id, 'charisma', star)}
                          className="text-zinc-700 hover:text-yellow-400 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
                          title={`Votar con ${star} estrellas`}
                        >
                          <Star className={`w-5 h-5 ${star <= Math.round(currentSelectedAlumno.starsCharisma) ? 'text-yellow-400 fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metric 3 - Talent */}
                <div className="bg-[#080808] border border-zinc-900/80 p-5 rounded-2xl flex flex-col justify-between hover:border-yellow-400/20 transition-colors duration-300">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-white font-mono uppercase tracking-wide">3. TALENTO 🎨</span>
                      <span className="text-yellow-405 text-yellow-400 font-mono font-black">{currentSelectedAlumno.starsTalent} / 5</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-2 font-medium">Habilidad sobresaliente en código, artes plásticas, deportes de equipo, liderazgo o debate estudiantil.</p>
                  </div>
                  
                  {/* Rating Selector */}
                  <div className="mt-5 pt-4 border-t border-zinc-900/50 flex justify-between items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase">Calificar:</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => handleRate(currentSelectedAlumno.id, 'talent', star)}
                          className="text-zinc-700 hover:text-yellow-400 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
                          title={`Votar con ${star} estrellas`}
                        >
                          <Star className={`w-5 h-5 ${star <= Math.round(currentSelectedAlumno.starsTalent) ? 'text-yellow-400 fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Comments Area inside student detail */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              
              <div className="flex items-center justify-between border-b border-zinc-900/80 pb-4">
                <h3 className="font-display font-black text-white text-lg tracking-tight uppercase flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
                  MURMULLOS DEL CAMPUS ({currentAlumnoComments.length})
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 tracking-wider">
                  Moderación activa WikiStars
                </span>
              </div>

              {/* Add Comment form */}
              <form onSubmit={handleAddComment} className="bg-[#080808] border border-zinc-900 rounded-2xl p-5 space-y-4 shadow-inner">
                
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Escribe un testimonio verídico, anécdota divertida o por qué esta persona merece calificar alto..."
                  maxLength={250}
                  required
                  rows={2}
                  className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none placeholder-zinc-600 transition-colors resize-none font-sans font-medium"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Select posting identity */}
                  {currentUser ? (
                    <div className="flex items-center gap-4 select-none">
                      <label className="text-xs text-zinc-400 font-mono flex items-center gap-1.5 cursor-pointer font-bold">
                        <input
                          type="checkbox"
                          checked={postAsAnonymous}
                          onChange={(e) => setPostAsAnonymous(e.target.checked)}
                          className="rounded text-yellow-400 focus:ring-opacity-0 accent-yellow-400"
                        />
                        <span>Publicar como Anónimo</span>
                      </label>
                      {!postAsAnonymous && (
                        <span className="text-[10px] font-mono font-black text-yellow-400 bg-yellow-400/5 px-2.5 py-1 rounded-lg border border-yellow-400/20">
                          ID verificado: {currentUser.name}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                      ⚠️ Publicarás de forma <strong className="text-yellow-400">Anónima</strong>. Registra tu Pasaporte ("Unirse") para usar tu nombre verificado.
                    </div>
                  )}

                  <button
                    type="submit"
                    className="bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer ml-auto transition-all duration-300 uppercase shadow-md shadow-yellow-400/10 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Send className="w-3.5 h-3.5 text-black" />
                    <span>Enviar Testimonio</span>
                  </button>
                </div>

              </form>

              {/* Testimonials listed */}
              <div className="space-y-4">
                {currentAlumnoComments.length === 0 ? (
                  <p className="text-xs text-zinc-500 font-mono italic p-6 text-center">
                    Aún no hay testimonios públicos de {currentSelectedAlumno.name}. ¡Súmate escribiendo el primero arriba!
                  </p>
                ) : (
                  currentAlumnoComments.map(comm => {
                    return (
                      <div 
                        key={comm.id}
                        className="bg-[#080808] border border-zinc-900/60 rounded-2xl p-4.5 space-y-2 relative hover:border-yellow-400/15 transition-colors duration-350"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-yellow-400/80 animate-pulse" />
                            <span className="text-xs font-mono font-black text-zinc-200">
                              {comm.author}
                            </span>
                            
                            {/* Verified check */}
                            {comm.status === 'verified' && (
                              <span className="text-[9px] uppercase tracking-wider font-mono font-black bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-400/20">
                                Oficial
                              </span>
                            )}
                            {comm.status === 'student' && (
                              <span className="text-[9px] uppercase tracking-wider font-mono font-black bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">
                                Estudiante
                              </span>
                            )}
                            {comm.status === 'anonymous' && (
                              <span className="text-[9px] uppercase tracking-wider font-mono font-bold bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded border border-zinc-800">
                                Anónimo
                              </span>
                            )}
                          </div>
                          
                          <span className="text-[9px] font-mono font-black text-zinc-500">
                            {new Date(comm.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed pl-4.5 italic font-sans font-medium">
                          "{comm.text}"
                        </p>

                        <div className="pl-5 pt-1.5 flex items-center justify-between">
                          <button
                            onClick={() => handleLikeComment(comm.id)}
                            className="text-[10px] font-mono text-zinc-400 hover:text-yellow-400 flex items-center gap-1.5 transition-colors cursor-pointer bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800"
                          >
                            <Heart className="w-3 h-3 text-red-500 fill-current" />
                            <span>Me Gusta ({comm.likes})</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </motion.div>
        )}

        {/* VIEW 4: SEPARATE PROFESSOR DETAIL VIEW */}
        {selectedProfessorId && currentSelectedProfessor && (
          <motion.div 
            id="professor-detail-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            {/* Volver button */}
            <button 
              onClick={() => setSelectedProfessorId(null)}
              className="group flex items-center gap-2 text-xs text-zinc-400 hover:text-yellow-400 font-mono tracking-widest font-black uppercase cursor-pointer transition-all pb-2"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              VOLVER AL CAMPUS
            </button>

            {/* Professor Profile Card */}
            <div className="bg-[#0b0b0c] border border-zinc-900 rounded-3xl overflow-hidden relative shadow-2xl">
              
              {/* Background gradient/cover */}
              <div className="h-32 bg-gradient-to-r from-zinc-950 via-[#0e0e10] to-zinc-950 relative border-b border-zinc-900/60 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.04)_0%,transparent_70%)] animate-pulse" />
              </div>

              {/* Avatar section */}
              <div className="px-6 pb-8 relative text-center">
                
                {/* Overlapping Avatar */}
                <div className="relative w-28 h-28 mx-auto -mt-14 mb-4">
                  <img 
                    src={currentSelectedProfessor.gender === 'female' 
                      ? 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200' 
                      : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
                    } 
                    alt={currentSelectedProfessor.name} 
                    className="w-full h-full rounded-full object-cover border-4 border-yellow-400 shadow-2xl shadow-yellow-400/5"
                  />
                  
                  {/* Rating badge overlapping on bottom-right of avatar */}
                  <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-black border-2 border-[#0b0b0c] px-2.5 py-1 rounded-full font-mono font-black text-xs shadow-lg flex items-center gap-0.5 select-none">
                    <span>★</span>
                    <span>{typeof currentSelectedProfessor.rating === 'number' 
                      ? currentSelectedProfessor.rating.toFixed(1) 
                      : '0.0'}</span>
                  </div>
                </div>

                {/* Name */}
                <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight">
                  {currentSelectedProfessor.name}
                </h2>
                
                {/* Title */}
                <div className="flex justify-center items-center gap-2 mt-1.5">
                  <span className="text-[10px] tracking-widest font-mono font-black bg-yellow-400/10 text-yellow-400 px-3 py-1 rounded-full border border-yellow-400/15 uppercase select-none">
                    {currentSelectedProfessor.nombreCompleto || currentSelectedProfessor.name || 'DOCENTE'}
                  </span>
                </div>

                {/* Permanent Voting Buttons (Yo te conozco / Fan) */}
                <div className="grid grid-cols-2 gap-4 mt-8 max-w-2xl mx-auto">
                  
                  {/* Card 1: Yo te conozco */}
                  {(() => {
                    const hasVoted = (userVotes[currentSelectedProfessor.id] || { yoTeConozco: false }).yoTeConozco;
                    return (
                      <button
                        onClick={() => handleVoteProfessorType(currentSelectedProfessor.id, 'yoTeConozco')}
                        disabled={isVotingProf}
                        className={`p-6 rounded-2xl border text-center transition-all duration-300 relative group flex flex-col justify-between items-center h-48 cursor-pointer w-full outline-none ${
                          hasVoted
                            ? 'bg-yellow-400/5 border-yellow-400/50 shadow-[0_4px_20px_rgba(250,204,21,0.05)]'
                            : 'bg-zinc-950/60 border-zinc-900 hover:border-yellow-400/30 hover:bg-[#121214]/60'
                        }`}
                      >
                        {/* Name - NEW */}
                        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest truncate w-full px-1">
                          {currentSelectedProfessor.name}
                        </span>
                        {/* Icon */}
                        <div className="flex justify-center items-center w-full">
                          <Users className="w-5 h-5 text-yellow-400" />
                        </div>

                        {/* Large count */}
                        <div className="my-2 select-none w-full text-center">
                          <span className={`text-4xl font-display font-black block tracking-tight ${hasVoted ? 'text-yellow-400' : 'text-white'}`}>
                            {currentSelectedProfessor.yoTeConozcoCount || 0}
                          </span>
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-widest mt-1 block ${hasVoted ? 'text-yellow-400/80' : 'text-zinc-500'}`}>
                            Yo te conozco
                          </span>
                        </div>
                      </button>
                    );
                  })()}

                  {/* Card 2: Fan */}
                  {(() => {
                    const hasVoted = (userVotes[currentSelectedProfessor.id] || { fan: false }).fan;
                    return (
                      <button
                        onClick={() => handleVoteProfessorType(currentSelectedProfessor.id, 'fan')}
                        disabled={isVotingProf}
                        className={`p-6 rounded-2xl border text-center transition-all duration-300 relative group flex flex-col justify-between items-center h-48 cursor-pointer w-full outline-none ${
                          hasVoted
                            ? 'bg-red-500/5 border-red-500/50 shadow-[0_4px_20px_rgba(239,68,68,0.05)]'
                            : 'bg-zinc-950/60 border-zinc-900 hover:border-red-500/30 hover:bg-[#121214]/60'
                        }`}
                      >
                        {/* Name - NEW */}
                        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest truncate w-full px-1">
                          {currentSelectedProfessor.name}
                        </span>
                        {/* Icon */}
                        <div className="flex justify-center items-center w-full">
                          <Heart className="w-5 h-5 text-red-600 fill-current" />
                        </div>

                        {/* Large count */}
                        <div className="my-2 select-none w-full text-center">
                          <span className={`text-4xl font-display font-black block tracking-tight ${hasVoted ? 'text-red-500' : 'text-white'}`}>
                            {currentSelectedProfessor.fanCount || 0}
                          </span>
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-widest mt-1 block ${hasVoted ? 'text-red-500/80' : 'text-zinc-500'}`}>
                            Fan
                          </span>
                        </div>
                      </button>
                    );
                  })()}

                </div>

                {/* 4 Tags / Tabs row selector */}
                <div className="flex justify-center mt-6">
                  <div className="bg-[#121214] border border-zinc-900 rounded-2xl p-1.5 flex gap-1.5 overflow-x-auto max-w-full">
                    {[
                      { id: 'Wiki' as const, label: 'Wiki', icon: <BookOpen className="w-3.5 h-3.5" /> },
                      { id: 'Reseñas' as const, label: 'Reseñas', icon: <Star className="w-3.5 h-3.5" /> },
                      { id: 'Crushes' as const, label: 'Crushes', icon: <Heart className="w-3.5 h-3.5" /> },
                      { id: 'Ship' as const, label: 'Ship', icon: <Flame className="w-3.5 h-3.5" /> },
                    ].map((t) => {
                      const isActive = activeProfSubTab === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setActiveProfSubTab(t.id)}
                          className={`flex items-center gap-1.5 px-4.5 py-2.5 text-[11px] font-mono font-black uppercase rounded-xl transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 ${
                            isActive
                              ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/10'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                          }`}
                        >
                          {t.icon}
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tab content 1: Reseñas */}
                {activeProfSubTab === 'Reseñas' && (() => {
                  const ratedReviews = profReviews.filter(r => typeof r.rating === 'number');
                  
                  let totalVotes = typeof currentSelectedProfessor.ratingCount === 'number' 
                    ? currentSelectedProfessor.ratingCount 
                    : 0;
                  
                  let averageRating = typeof currentSelectedProfessor.rating === 'number' 
                    ? currentSelectedProfessor.rating.toFixed(1) 
                    : "0.0";

                  let starDistribution: Record<number, number> = {
                    5: currentSelectedProfessor.rating_5_count || 0,
                    4: currentSelectedProfessor.rating_4_count || 0,
                    3: currentSelectedProfessor.rating_3_count || 0,
                    2: currentSelectedProfessor.rating_2_count || 0,
                    1: currentSelectedProfessor.rating_1_count || 0,
                  };

                  // Fallback for backward compatibility
                  if (totalVotes === 0 && ratedReviews.length > 0) {
                    totalVotes = ratedReviews.length;
                    averageRating = (ratedReviews.reduce((sum, r) => sum + r.rating, 0) / totalVotes).toFixed(1);
                    ratedReviews.forEach(r => {
                      const rVal = Math.round(r.rating);
                      if (rVal >= 1 && rVal <= 5) {
                        starDistribution[rVal]++;
                      }
                    });
                  }

                  return (
                    <div className="mt-8 max-w-2xl mx-auto text-left space-y-6">
                      
                      {/* Resumen de Estrellas */}
                      <div className="space-y-4">
                        <h3 className="font-display font-black text-lg text-white tracking-tight uppercase">Resumen de Estrellas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Left Panel */}
                          <div className="bg-[#121214]/60 border border-zinc-900 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                            <span className="text-4xl md:text-5xl font-display font-black text-yellow-400 mb-2">
                              {averageRating}
                            </span>
                            <div className="flex gap-1 mb-3">
                              {[1, 2, 3, 4, 5].map((starVal) => {
                                const numericAvg = parseFloat(averageRating);
                                const isFilled = starVal <= Math.round(numericAvg);
                                return (
                                  <Star 
                                    key={starVal} 
                                    className={`w-4 h-4 ${isFilled ? 'text-yellow-400 fill-current' : 'text-zinc-700'}`} 
                                  />
                                );
                              })}
                            </div>
                            <span className="text-[10px] tracking-widest font-mono font-black text-zinc-500 uppercase select-none">
                              {totalVotes} {totalVotes === 1 ? 'VOTO TOTAL' : 'VOTOS TOTALES'}
                            </span>
                          </div>

                          {/* Right Panel */}
                          <div className="md:col-span-2 bg-[#121214]/30 border border-[#18181b]/30 rounded-2xl p-6 flex flex-col justify-center space-y-3">
                            {[5, 4, 3, 2, 1].map((starNum) => {
                              const count = starDistribution[starNum] || 0;
                              const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                              return (
                                <div key={starNum} className="flex items-center gap-3">
                                  <span className="text-xs font-mono font-bold text-zinc-400 w-3 text-right">
                                    {starNum}
                                  </span>
                                  <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-900/40">
                                    <div 
                                      className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono text-zinc-500 w-6 text-right">
                                    {count}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Califica y gana rachas */}
                      <div className="bg-[#121214]/60 border border-zinc-900 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center gap-4 border-b border-zinc-900/60 pb-4">
                          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                            <Flame className="w-5 h-5 text-yellow-500 fill-current" />
                          </div>
                          <div>
                            <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                              ¡CALIFICA Y GANA RACHAS!
                            </h3>
                            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                              CADA VOTO CUENTA PARA EL RANKING
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center py-2 space-y-4">
                          {/* Oportunidades badge */}
                          <div className="bg-zinc-950/80 border border-zinc-900 px-4 py-1.5 rounded-full flex items-center gap-1.5">
                            <span className="text-yellow-400 text-xs">⚡</span>
                            <span className="text-[10px] tracking-widest font-mono font-black text-zinc-400 uppercase">
                              OPORTUNIDADES: {ratingOpportunities}/6
                            </span>
                          </div>

                          <h4 className="text-[10px] tracking-widest font-mono font-black text-zinc-400 uppercase select-none pt-2">
                            ¿QUÉ PUNTUACIÓN LE DAS?
                          </h4>

                          {/* 5 Big Stars */}
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((starVal) => {
                              const isLit = (ratingHover !== null ? starVal <= ratingHover : (selectedRating !== null ? starVal <= selectedRating : false));
                              return (
                                <button
                                  key={starVal}
                                  type="button"
                                  onMouseEnter={() => setRatingHover(starVal)}
                                  onMouseLeave={() => setRatingHover(null)}
                                  onClick={() => handleSubmitReview(starVal)}
                                  disabled={ratingOpportunities === 0 || isSubmittingReview}
                                  className="p-1.5 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed group transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                                >
                                  <Star 
                                    className={`w-9 h-9 transition-all duration-200 ${
                                      isLit 
                                        ? 'text-yellow-400 fill-current drop-shadow-[0_0_8px_rgba(250,204,21,0.25)]' 
                                        : 'text-zinc-700 hover:text-zinc-600'
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>

                          {/* Tus Votos de Hoy */}
                          <div className="pt-4 flex flex-col items-center space-y-3">
                            <div className="flex items-center gap-1.5 text-zinc-550 select-none">
                              <History className="w-3.5 h-3.5" />
                              <span className="text-[10px] tracking-widest font-mono font-black uppercase">
                                Tus votos de hoy
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {Array.from({ length: 6 }).map((_, idx) => {
                                const hasVote = idx < userTodayVotes.length;
                                const ratingValue = hasVote ? userTodayVotes[idx] : null;

                                return (
                                  <div
                                    key={idx}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                      hasVote
                                        ? 'bg-yellow-400/10 border border-yellow-400/30 shadow-[0_0_8px_rgba(250,204,21,0.08)]'
                                        : 'bg-zinc-950/40 border border-dashed border-zinc-800/80'
                                    }`}
                                  >
                                    {hasVote ? (
                                      <span className="text-sm font-mono font-black text-yellow-400">
                                        {ratingValue}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-zinc-700 font-bold select-none">
                                        ⚡
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Tab content 2: Wiki */}
                {activeProfSubTab === 'Wiki' && (
                  <div className="mt-8 max-w-2xl mx-auto text-left space-y-6">
                    {/* Biografia / Datos Personales */}
                    <div className="bg-[#121214]/60 border border-zinc-900 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-yellow-400" />
                          <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">DATOS BIOGRÁFICOS (WIKI)</h3>
                        </div>
                        <button
                          onClick={handleOpenEditWiki}
                          className="px-3 py-1.5 bg-zinc-900/80 hover:bg-yellow-400/15 text-zinc-400 hover:text-yellow-400 border border-zinc-800 hover:border-yellow-400/20 rounded-xl text-xs font-mono font-black uppercase transition-all duration-300 cursor-pointer flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar Wiki</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div>
                          <span className="text-zinc-500 block uppercase text-[10px]">EDAD</span>
                          <span className="text-zinc-200 uppercase font-black">
                            {currentSelectedProfessor.edad || 'No especificada'}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase text-[10px]">ALTURA</span>
                          <span className="text-zinc-200 uppercase font-black">
                            {currentSelectedProfessor.altura || 'No especificada'}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase text-[10px]">PESO</span>
                          <span className="text-zinc-200 uppercase font-black">
                            {currentSelectedProfessor.peso || 'No especificado'}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase text-[10px]">ESTADO CIVIL</span>
                          <span className="text-zinc-200 uppercase font-black">
                            {currentSelectedProfessor.estadoCivil || 'No especificado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#121214]/60 border border-zinc-900 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">INSIGNIAS MÁS VOTADAS POR ESTUDIANTES</h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { label: 'Explicación Clara', count: 42, icon: '💡' },
                          { label: 'Muy Comprensivo', count: 29, icon: '🤝' },
                          { label: 'Clases Divertidas', count: 35, icon: '🎭' },
                          { label: 'Súper Puntual', count: 18, icon: '⏱️' }
                        ].map((badge, i) => (
                          <div key={i} className="bg-[#0b0b0c] border border-zinc-900 p-3 rounded-xl text-center space-y-1 hover:border-yellow-400/10 transition-colors">
                            <span className="text-lg block">{badge.icon}</span>
                            <span className="text-[10px] text-zinc-300 font-sans font-bold block leading-tight">{badge.label}</span>
                            <span className="text-[9px] text-yellow-400 font-mono font-black uppercase">×{badge.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab content 3: Crushes */}
                {activeProfSubTab === 'Crushes' && (() => {
                  const userId = auth.currentUser?.uid || getGuestId();
                  const myCrush = profCrushes.find(c => c.authorId === userId);
                  return (
                    <div className="mt-8 max-w-2xl mx-auto text-left space-y-6">
                      {/* Crush Voting Toggle */}
                      {(() => {
                        const hasCrush = (userVotes[currentSelectedProfessor.id] || { crush: false }).crush;
                        return (
                          <div className="bg-[#121214]/60 border border-zinc-900 rounded-2xl p-8 text-center space-y-4">
                            <h3 className="font-display font-black text-lg text-white">¿ES TU AMOR SECRETO?</h3>
                            <button
                              onClick={() => handleToggleCrush(currentSelectedProfessor.id)}
                              disabled={isVotingProf}
                              className={`mx-auto p-4 rounded-full transition-all duration-300 ${hasCrush ? 'bg-pink-500/20' : 'bg-zinc-900'}`}
                            >
                              <Heart className={`w-12 h-12 ${hasCrush ? 'text-pink-500 fill-current' : 'text-zinc-600'}`} />
                            </button>
                            <p className="text-sm text-zinc-400 font-mono">
                              {hasCrush ? '¡Le has dado un crush!' : '¿Sientes una conexión especial?'}
                            </p>
                            <div className="text-center">
                              <span className="text-3xl font-display font-black block text-white">
                                {currentSelectedProfessor.crushesCount || 0}
                              </span>
                              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                                CRUSHES TOTALES
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Add Crush Form / Active Crush Display */}
                      {myCrush ? (
                        <div className="bg-[#121214]/60 border border-zinc-900 rounded-2xl p-6 space-y-4">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                            <div className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-red-500 fill-current animate-pulse" />
                              <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">TU CONFESIÓN ACTIVA</h3>
                            </div>
                            <span className="text-[9px] font-mono bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2.5 py-1 rounded-full uppercase font-black animate-pulse">
                              PUBLICADO EN EL MURO
                            </span>
                          </div>
                          
                          <div className="bg-gradient-to-br from-[#120a10]/40 to-black border border-pink-500/10 p-5 rounded-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl" />
                            <p className="text-xs text-pink-100 leading-relaxed font-sans italic font-medium">
                              "{myCrush.text}"
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-2">
                              <span>Publicado como:</span>
                              <span className="text-zinc-300 font-bold">{myCrush.authorName || 'Anónimo'}</span>
                              <span className="text-pink-500/80 font-bold lowercase">(tu mensaje)</span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <span className="text-[10px] font-mono text-zinc-500">
                              Para escribir una confesión diferente, primero debes eliminar tu mensaje actual.
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCrush(myCrush.id)}
                              disabled={isSubmittingCrush}
                              className="w-full sm:w-auto bg-zinc-900/80 hover:bg-red-950/40 hover:text-red-400 text-zinc-400 border border-zinc-800 hover:border-red-500/20 font-mono font-bold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 uppercase shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar confesión</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleSubmitCrush} className="bg-[#121214]/60 border border-zinc-900 rounded-2xl p-6 space-y-4">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                            <div className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-red-500 fill-current" />
                              <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">CONFESAR UN CRUSH ANÓNIMO</h3>
                            </div>
                            <span className="text-[9px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full uppercase font-black">
                              100% CONFIDENCIAL
                            </span>
                          </div>
                          <textarea
                            value={newCrushText}
                            onChange={(e) => setNewCrushText(e.target.value)}
                            placeholder="Escribe algo lindo sobre este docente (ej: 'Me encanta su paciencia al explicar' o 'Su estilo de vestir es impecable')..."
                            maxLength={180}
                            rows={3}
                            className="w-full bg-black border border-zinc-900 rounded-xl p-4 text-xs font-sans text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-red-500/40 resize-none transition-all duration-300"
                            required
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-zinc-550">
                              {180 - newCrushText.length} caracteres restantes
                            </span>
                            <button
                              type="submit"
                              disabled={isSubmittingCrush || !newCrushText.trim()}
                              className="bg-red-500 hover:bg-red-400 disabled:opacity-40 text-white font-mono font-black text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-300 uppercase shadow-md shadow-red-500/15"
                            >
                              <Send className="w-3.5 h-3.5 text-white" />
                              <span>Enviar Crush</span>
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Crushes Feed */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] tracking-widest font-mono font-black text-zinc-500 uppercase">Muro de Afecto Estudiantil ({profCrushes.length})</h4>
                        {profCrushes.length === 0 ? (
                          <div className="bg-[#121214]/30 border border-zinc-900/40 p-8 rounded-2xl text-center space-y-1.5">
                            <Heart className="w-5 h-5 text-zinc-600 mx-auto" />
                            <p className="text-xs text-zinc-550 font-mono italic">Aún no hay mensajes de crush en el muro. ¡Sé el primero en confesar algo lindo!</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {profCrushes.map((crush) => {
                              const isMyCrushItem = crush.authorId === userId;
                              return (
                                <div key={crush.id} className="bg-gradient-to-br from-[#0c0c0e] to-black border border-zinc-900 p-5 rounded-2xl relative overflow-hidden group hover:border-red-500/10 transition-colors">
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/2 rounded-full blur-2xl group-hover:bg-red-500/5 transition-all" />
                                  <div className="flex items-start justify-between gap-4 relative z-10">
                                    <div className="space-y-2">
                                      <p className="text-xs text-zinc-300 leading-relaxed font-sans italic font-medium">
                                        "{crush.text}"
                                      </p>
                                      <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500">
                                        <span className="text-red-400">♥</span>
                                        <span>
                                          {crush.authorName || 'Anónimo'}
                                          {isMyCrushItem && (
                                            <span className="text-pink-500/80 font-bold font-sans text-[8px] tracking-normal lowercase ml-1.5">(tu mensaje)</span>
                                          )}
                                        </span>
                                        <span>•</span>
                                        <span>{new Date(crush.createdAt || Date.now()).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 shrink-0 self-center">
                                      {isMyCrushItem && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteCrush(crush.id)}
                                          disabled={isSubmittingCrush}
                                          className="p-1.5 text-zinc-500 hover:text-red-400 bg-zinc-950/50 hover:bg-red-950/20 border border-zinc-900 hover:border-red-500/20 rounded-lg transition-all duration-300 cursor-pointer"
                                          title="Eliminar mi mensaje"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <span className="text-lg shrink-0 select-none">💌</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Tab content 4: Ship */}
                {activeProfSubTab === 'Ship' && null}

              </div>

            </div>
          </motion.div>
        )}

      </main>

      {/* Floating Action Button for registering institutions, only shown on main screen */}
      {!selectedInstituteId && !selectedAlumnoId && (
        <div className="fixed bottom-6 right-6 z-40">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setCreateInstituteStep(1);
              setNewInstituteName('');
              setIsCreateInstituteModalOpen(true);
            }}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-350 text-black font-mono font-black text-xs px-5 py-4 rounded-full shadow-[0_4px_24px_rgba(250,204,21,0.25)] hover:shadow-[0_8px_32px_rgba(250,204,21,0.35)] transition-all cursor-pointer uppercase tracking-wider outline-none"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>Registrar Institución</span>
          </motion.button>
        </div>
      )}

      {/* --- FOOTER --- */}
      <footer className="bg-black border-t border-zinc-950 py-12 px-4 text-center mt-20 relative z-10 text-xs font-mono text-zinc-650">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex justify-center items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shadow-[0_0_10px_rgba(250,204,21,0.05)]">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/wikistars5-465e1.firebasestorage.app/o/wikistars5logo.png?alt=media&token=026f822e-3b69-4538-b0ef-28dacb65551e" 
                alt="WikiStars Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-display font-black text-white text-xs tracking-widest uppercase">WIKISTARS 5</span>
          </div>
          <p className="max-w-md mx-auto leading-relaxed text-[11px] text-zinc-500 font-sans font-medium">
            Foro democrático estudiantil para registrar y reconocer las estrellas más valoradas del centro educativo. Diseñado en amarillo y negro.
          </p>
          <div className="pt-4 border-t border-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-zinc-550">
            <span>© 2026 WikiStars5 Corporation. Sin fines de lucro.</span>
            <span>Versión 1.0 (Fase Frontend de Pruebas de Calificación)</span>
          </div>
        </div>
      </footer>

      {/* --- MODAL 2: UNIRSE (REGISTRO ESTUDIANTE) --- */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div id="join-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => setIsJoinModalOpen(false)}
            />
            {/* Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 max-w-md w-full relative z-10 space-y-6 shadow-2xl"
            >
              <button 
                onClick={() => setIsJoinModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">
                  Genera tu Pasaporte Wiki Stars 5
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-sans font-medium">
                  Obtén tu credencial firmada para emitir testimonios de calidad y calificar alumnos de forma oficial.
                </p>
              </div>

              {/* Google Sign-In button */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full bg-[#121212] hover:bg-zinc-900 border border-zinc-800 text-white font-mono font-bold text-xs py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer shadow-md hover:-translate-y-0.5 active:translate-y-0 hover:border-yellow-400/40"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>INICIAR SESIÓN CON GOOGLE</span>
                </button>

                <div className="flex items-center gap-3 py-1 select-none">
                  <div className="h-px bg-zinc-900 flex-1" />
                  <span className="text-[10px] text-zinc-600 font-mono font-bold tracking-wider uppercase">o pasaporte manual</span>
                  <div className="h-px bg-zinc-900 flex-1" />
                </div>
              </div>

              <form onSubmit={handleJoinSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    maxLength={35}
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="Ej. Sofía Larrea"
                    className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-colors duration-200 font-sans font-medium placeholder-zinc-700"
                  />
                </div>

                {/* Nickname */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Apodo Estudiantil (Alias)</label>
                  <input
                    type="text"
                    maxLength={20}
                    value={joinNickname}
                    onChange={(e) => setJoinNickname(e.target.value)}
                    placeholder="Ej. SofiPoetry (Opcional)"
                    className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-colors duration-200 font-sans font-medium placeholder-zinc-700"
                  />
                </div>



                <button
                  type="submit"
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black text-xs py-3.5 rounded-xl transition-all duration-300 uppercase tracking-widest mt-4 cursor-pointer shadow-lg shadow-yellow-400/10 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Confirmar Identidad & Unirse
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: NOMINAR ESTRELLA (ADD ALUMNO FORM) --- */}
      <AnimatePresence>
        {isNominateModalOpen && (
          <div id="nominate-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => setIsNominateModalOpen(false)}
            />
            {/* Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative z-10 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsNominateModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h3 className="text-lg font-display font-black text-white uppercase tracking-tight">
                  Nominar Alumno Destacado (WikiStar)
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-sans font-medium">
                  Ingresa las credenciales y anécdotas de un compañero para postularlo al podio de popularidad de la escuela.
                </p>
              </div>

              <form onSubmit={handleNominateSubmit} className="space-y-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                
                {/* Name */}
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={nominateName}
                    onChange={(e) => setNominateName(e.target.value)}
                    placeholder="Ej. Sergio Ramírez"
                    className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-colors duration-200 font-sans font-medium placeholder-zinc-700"
                  />
                </div>

                {/* Nickname */}
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Alias / Apodo</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={nominateNickname}
                    onChange={(e) => setNominateNickname(e.target.value)}
                    placeholder="Ej. Checho99"
                    className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-colors duration-200 font-sans font-medium placeholder-zinc-700"
                  />
                </div>

                {/* Course Grade */}
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Curso / Grado / Semestre *</label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={nominateCourse}
                    onChange={(e) => setNominateCourse(e.target.value)}
                    placeholder="Ej. 5to de Secundaria - Letras"
                    className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-colors duration-200 font-sans font-medium placeholder-zinc-700"
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Categoría Wiki Destacada</label>
                  <select
                    value={nominateCategory}
                    onChange={(e) => setNominateCategory(e.target.value as any)}
                    className="w-full bg-[#0d0d0d] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-300 outline-none transition-all duration-200 font-mono font-bold font-semibold"
                  >
                    <option value="Artista" className="bg-zinc-950 text-white">Artista (Música, Canto, Arte visual)</option>
                    <option value="Deportista" className="bg-zinc-950 text-white">Deportista (Fútbol, Basket, Gimnasio)</option>
                    <option value="Académico" className="bg-zinc-950 text-white">Académico (Exámenes, Matemáticas, IA)</option>
                    <option value="Influencer" className="bg-zinc-950 text-white">Influencer (TikTok, Redes, Carisma)</option>
                    <option value="Gaming" className="bg-zinc-950 text-white">Gaming (eSports, Torneos, Minecraft)</option>
                    <option value="Líder" className="bg-zinc-950 text-white">Líder (Presidente del consejo, Delegado)</option>
                  </select>
                </div>

                {/* Choose Avatar illustration seed */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Asignar Avatar del Alumno</label>
                  <div className="flex items-center gap-3 py-1.5 overflow-x-auto">
                    {[
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
                      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
                      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
                      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200'
                    ].map((av, idx) => {
                      const isSelected = nominateAvatar === av;
                      return (
                        <img 
                          key={idx}
                          src={av} 
                          alt="Option Avatar" 
                          onClick={() => setNominateAvatar(av)}
                          className={`w-12 h-12 rounded-full cursor-pointer object-cover border-2 transition-all shrink-0 ${
                            isSelected ? 'border-yellow-400 scale-108 ring-2 ring-yellow-400/20' : 'border-zinc-800 opacity-60 hover:opacity-100'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Brief Biography */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] text-zinc-550 uppercase font-mono tracking-wider font-black block">Biografía Corta (Qué hace, gustos)</label>
                  <input
                    type="text"
                    maxLength={140}
                    value={nominateBio}
                    onChange={(e) => setNominateBio(e.target.value)}
                    placeholder="Ej. Ama programar autómatas y escuchar música indie por las tardes en el patio..."
                    className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium placeholder-zinc-700"
                  />
                </div>

                {/* Nomination reason */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] text-zinc-550 uppercase font-mono tracking-wider font-black block">¿Por qué merece ser una WikiStar? *</label>
                  <textarea
                    required
                    maxLength={200}
                    value={nominateReason}
                    onChange={(e) => setNominateReason(e.target.value)}
                    placeholder="Menciona algún hecho que represente por qué es influyente (ej: Organizó la rifa benéfica del mes o nos guió en el concurso de fútbol)..."
                    className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium placeholder-zinc-700 h-16 resize-none"
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black text-xs py-3.5 rounded-xl transition-all duration-300 uppercase tracking-widest cursor-pointer shadow-lg shadow-yellow-400/10 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Publicar Nominación en la Wiki
                  </button>
                  <p className="text-[10px] text-zinc-500 text-center mt-2.5 font-mono font-bold uppercase tracking-wider">
                    * Todos los alumnos nominados inician con calificación base de 4.0 ⭐
                  </p>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 4: CREAR CENTRO EDUCATIVO --- */}
      <AnimatePresence>
        {isCreateInstituteModalOpen && (
          <div id="create-institute-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm shadow-2xl"
              onClick={() => setIsCreateInstituteModalOpen(false)}
            />
            {/* Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 w-full relative z-10 space-y-6 shadow-2xl transition-all duration-300 ${
                createInstituteStep === 1 ? 'max-w-lg' : 'max-w-md'
              }`}
            >
              <button 
                onClick={() => setIsCreateInstituteModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {createInstituteStep === 1 ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <span className="text-[10px] font-mono font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Paso 1 de 2
                    </span>
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-tight mt-3">
                      Seleccionar Tipo de Institución
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 font-sans font-medium">
                      Elige el tipo de centro educativo que deseas registrar en la Wiki.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {/* Option 1: Colegio/Escuela */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewInstituteTipo('colegio');
                        setCreateInstituteStep(2);
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-900 bg-zinc-950/40 hover:border-yellow-400/40 hover:bg-[#121214]/60 text-left transition-all duration-300 group cursor-pointer outline-none"
                    >
                      <div className="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 group-hover:scale-105 transition-transform shrink-0">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider group-hover:text-yellow-400 transition-colors">
                          Escuela / Colegio
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-sans font-medium leading-normal">
                          Para educación primaria, secundaria, institutos escolares o bachilleratos.
                        </p>
                      </div>
                    </button>

                    {/* Option 2: Instituto */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewInstituteTipo('instituto');
                        setCreateInstituteStep(2);
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-900 bg-zinc-950/40 hover:border-yellow-400/40 hover:bg-[#121214]/60 text-left transition-all duration-300 group cursor-pointer outline-none"
                    >
                      <div className="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 group-hover:scale-105 transition-transform shrink-0">
                        <Building className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider group-hover:text-yellow-400 transition-colors">
                          Instituto
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-sans font-medium leading-normal">
                          Para educación tecnológica, técnica de nivel superior o pedagógica.
                        </p>
                      </div>
                    </button>

                    {/* Option 3: Universidad */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewInstituteTipo('universidad');
                        setCreateInstituteStep(2);
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-900 bg-zinc-950/40 hover:border-yellow-400/40 hover:bg-[#121214]/60 text-left transition-all duration-300 group cursor-pointer outline-none"
                    >
                      <div className="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 group-hover:scale-105 transition-transform shrink-0">
                        <Landmark className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider group-hover:text-yellow-400 transition-colors">
                          Universidad
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-sans font-medium leading-normal">
                          Para universidades públicas, facultades o centros universitarios de posgrado.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setCreateInstituteStep(1)}
                      className="text-[10px] font-mono text-zinc-550 hover:text-yellow-400 transition-colors uppercase tracking-wider flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      ← Volver a Selección de Tipo
                    </button>
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-tight mt-3">
                      Crear Nueva Institución
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 font-sans font-medium">
                      Ingresa el nombre oficial para registrar el centro educativo.
                    </p>
                  </div>

                  <form onSubmit={handleCreateInstituteSubmit} className="space-y-5">
                    {/* Selected Type Badge Display */}
                    <div className="p-3.5 bg-[#0d0d0d] border border-zinc-900 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black text-zinc-500 uppercase tracking-widest">Tipo Elegido:</span>
                      <span className="text-xs font-mono font-black text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                        {newInstituteTipo === 'colegio' ? (
                          <>
                            <GraduationCap className="w-3.5 h-3.5" />
                            Escuela / Colegio
                          </>
                        ) : newInstituteTipo === 'instituto' ? (
                          <>
                            <Building className="w-3.5 h-3.5" />
                            Instituto
                          </>
                        ) : (
                          <>
                            <Landmark className="w-3.5 h-3.5" />
                            Universidad
                          </>
                        )}
                      </span>
                    </div>

                    {/* School Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Nombre de la Institución *</label>
                      <input
                        type="text"
                        required
                        value={newInstituteName}
                        onChange={(e) => setNewInstituteName(e.target.value)}
                        placeholder={
                          newInstituteTipo === 'colegio' 
                            ? "Ej. Colegio Emblemático Coronel Bolognesi" 
                            : newInstituteTipo === 'instituto'
                            ? "Ej. Instituto de Educación Superior Pedagógico de Uchiza"
                            : "Ej. Universidad Nacional del Altiplano"
                        }
                        className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium placeholder-zinc-700"
                        autoFocus
                      />
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setCreateInstituteStep(1)}
                        className="w-1/3 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white font-mono font-black text-xs py-3.5 rounded-xl transition-all duration-300 uppercase tracking-widest cursor-pointer"
                      >
                        Atrás
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingInstitute}
                        className="w-2/3 bg-yellow-400 hover:bg-yellow-350 disabled:bg-zinc-850 disabled:text-zinc-500 text-black font-mono font-black text-xs py-3.5 rounded-xl transition-all duration-300 uppercase tracking-widest cursor-pointer shadow-lg shadow-yellow-400/10 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-1.5"
                      >
                        {isSubmittingInstitute ? (
                          'Creando...'
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 text-black" />
                            <span>Crear Institución</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 5: AGREGAR PROFESOR --- */}
      <AnimatePresence>
        {isAddProfessorModalOpen && (
          <div id="add-professor-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm shadow-2xl"
              onClick={() => setIsAddProfessorModalOpen(false)}
            />
            {/* Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 max-w-md w-full relative z-10 space-y-6 shadow-2xl"
            >
              <button 
                onClick={() => setIsAddProfessorModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">
                  Agregar Profesor al Campus
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-sans font-medium">
                  Añade un nuevo docente al directorio de esta institución.
                </p>
              </div>

              <form onSubmit={handleAddProfessor} className="space-y-4 pt-2">
                {/* Professor Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={newProfNombre}
                      onChange={(e) => setNewProfNombre(e.target.value)}
                      placeholder="Ej. Alberto"
                      className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium placeholder-zinc-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Apellidos *</label>
                    <input
                      type="text"
                      required
                      value={newProfApellidos}
                      onChange={(e) => setNewProfApellidos(e.target.value)}
                      placeholder="Ej. Valdivia Santillán"
                      className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium placeholder-zinc-700"
                    />
                  </div>
                </div>

                {/* Professor Gender Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Género *</label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      { value: 'male', label: 'Masculino 👨‍🏫' },
                      { value: 'female', label: 'Femenino 👩‍🏫' }
                    ].map(g => {
                      const isSelected = newProfGender === g.value;
                      return (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setNewProfGender(g.value as any)}
                          className={`py-3 px-2 border rounded-xl font-mono text-xs font-black uppercase transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_4px_12px_rgba(250,204,21,0.15)] scale-[1.02]' 
                              : 'bg-[#0d0d0d]/80 text-zinc-400 border-zinc-900 hover:border-zinc-800'
                          }`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmittingProf}
                    className="w-full bg-yellow-400 hover:bg-yellow-350 disabled:bg-zinc-850 disabled:text-zinc-500 text-black font-mono font-black text-xs py-3.5 rounded-xl transition-all duration-300 uppercase tracking-widest cursor-pointer shadow-lg shadow-yellow-400/10 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {isSubmittingProf ? 'Guardando...' : 'Guardar Profesor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: EDITAR WIKI --- */}
      <AnimatePresence>
        {isEditWikiModalOpen && (
          <div id="edit-wiki-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm shadow-2xl"
              onClick={() => setIsEditWikiModalOpen(false)}
            />
            {/* Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0b0c] border border-zinc-900 rounded-3xl p-6 sm:p-8 max-w-xl w-full relative z-10 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button 
                type="button"
                onClick={() => setIsEditWikiModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h3 className="text-xl font-display font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
                  <Edit className="w-5 h-5 text-yellow-400" />
                  Editar Wiki del Docente
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-sans font-medium">
                  Cualquier estudiante puede editar esta información. ¡Mantengamos la wiki actualizada!
                </p>
              </div>

              <form onSubmit={handleSubmitWiki} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fecha de Nacimiento (Edad) */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Fecha de Nacimiento (Edad)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Año */}
                      <select
                        value={editWikiYear}
                        onChange={(e) => setEditWikiYear(e.target.value)}
                        className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium cursor-pointer"
                      >
                        <option value="">Año</option>
                        {Array.from({ length: 2026 - 1960 + 1 }, (_, i) => 2026 - i).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>

                      {/* Mes */}
                      <select
                        value={editWikiMonth}
                        onChange={(e) => setEditWikiMonth(e.target.value)}
                        className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium cursor-pointer"
                      >
                        <option value="">Mes</option>
                        {[
                          { value: '1', label: 'Enero' },
                          { value: '2', label: 'Febrero' },
                          { value: '3', label: 'Marzo' },
                          { value: '4', label: 'Abril' },
                          { value: '5', label: 'Mayo' },
                          { value: '6', label: 'Junio' },
                          { value: '7', label: 'Julio' },
                          { value: '8', label: 'Agosto' },
                          { value: '9', label: 'Septiembre' },
                          { value: '10', label: 'Octubre' },
                          { value: '11', label: 'Noviembre' },
                          { value: '12', label: 'Diciembre' },
                        ].map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>

                      {/* Día */}
                      <select
                        value={editWikiDay}
                        onChange={(e) => setEditWikiDay(e.target.value)}
                        className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium cursor-pointer"
                      >
                        <option value="">Día</option>
                        {Array.from({ length: getDaysInMonth(editWikiYear, editWikiMonth) }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Altura */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Altura</label>
                    <select
                      value={editWikiAltura}
                      onChange={(e) => setEditWikiAltura(e.target.value)}
                      className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium cursor-pointer"
                    >
                      <option value="">No especificada</option>
                      {Array.from({ length: 200 - 100 + 1 }, (_, i) => 200 - i).map((h) => (
                        <option key={h} value={`${h} cm`}>{h} cm</option>
                      ))}
                    </select>
                  </div>

                  {/* Peso */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Peso</label>
                    <select
                      value={editWikiPeso}
                      onChange={(e) => setEditWikiPeso(e.target.value)}
                      className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium cursor-pointer"
                    >
                      <option value="">No especificado</option>
                      {Array.from({ length: 100 - 40 + 1 }, (_, i) => 100 - i).map((w) => (
                        <option key={w} value={`${w} kg`}>{w} kg</option>
                      ))}
                    </select>
                  </div>

                  {/* Estado Civil */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">Estado Civil</label>
                    <select
                      value={editWikiEstadoCivil}
                      onChange={(e) => setEditWikiEstadoCivil(e.target.value)}
                      className="w-full bg-[#0d0d0d] focus:bg-[#121212] border border-zinc-900 focus:border-yellow-400 text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium cursor-pointer"
                    >
                      <option value="">No especificado</option>
                      {['Soltero/a', 'Divorciado/a', 'Casado/a', 'Viudo/a', 'Con Novio/a'].map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditWikiModalOpen(false)}
                    className="w-1/2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-mono font-black text-xs py-3.5 rounded-xl transition-all duration-300 uppercase tracking-widest cursor-pointer border border-zinc-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingWiki}
                    className="w-1/2 bg-yellow-400 hover:bg-yellow-350 disabled:bg-zinc-850 disabled:text-zinc-500 text-black font-mono font-black text-xs py-3.5 rounded-xl transition-all duration-300 uppercase tracking-widest cursor-pointer shadow-lg shadow-yellow-400/10 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {isSubmittingWiki ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) removed */}

      {/* --- BOTTOM NAVIGATION --- */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] bg-black border-t border-zinc-900 flex justify-around p-3">
        <button onClick={() => setActiveBottomTab('feed')} className={`flex flex-col items-center gap-1 ${activeBottomTab === 'feed' ? 'text-yellow-400' : 'text-zinc-500'}`}>
          <Home className="w-5 h-5" />
          <span className="text-[10px] uppercase font-bold">Feed</span>
        </button>
        <button onClick={() => setActiveBottomTab('profile')} className={`flex flex-col items-center gap-1 ${activeBottomTab === 'profile' ? 'text-yellow-400' : 'text-zinc-500'}`}>
          <User className="w-5 h-5" />
          <span className="text-[10px] uppercase font-bold">Mi Perfil</span>
        </button>
      </div>

      {activeBottomTab === 'profile' && userProfile && (
        <div className="fixed inset-0 z-40 bg-black overflow-y-auto pt-20 pb-24 p-4 sm:p-6">
          <div className="max-w-md mx-auto space-y-6">
            <button 
              onClick={() => setActiveBottomTab('feed')} 
              className="text-zinc-400 hover:text-white flex items-center gap-2 text-xs font-mono uppercase tracking-wider cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al Feed
            </button>
            
            <div className="flex justify-between items-center">
              <h2 className="text-white font-sans font-black text-2xl tracking-tight">Mi Perfil</h2>
              {currentUser && (
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-400 hover:text-red-300 font-mono uppercase tracking-wider bg-red-950/25 border border-red-900/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Cerrar Sesión
                </button>
              )}
            </div>

            {/* Account Card */}
            <div className="bg-[#0b0b0c] border border-zinc-900 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <img 
                  src={userProfile.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} 
                  className="w-20 h-20 rounded-full border-2 border-yellow-400/80 object-cover shadow-lg shadow-yellow-400/5" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-black text-black">
                  ★
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-white font-sans font-black text-lg">
                  {userProfile.displayName || 'Estudiante Invitado'}
                </h3>
                <p className="text-zinc-500 font-mono text-xs">
                  @{userProfile.nickname || 'anonimo'}
                </p>
              </div>
            </div>

            {/* Google Authentication Linking / Register Section */}
            {(!currentUser || !currentUser.email || currentUser.userId.startsWith('user-') || currentUser.userId === 'anonymous') ? (
              <div className="bg-gradient-to-br from-zinc-950 to-[#0a0a0b] border border-zinc-900 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="space-y-1.5 text-left">
                  <h3 className="text-yellow-400 font-sans font-bold text-sm tracking-tight flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Vincular Cuenta
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Guarda tu progreso de racha, votos de popularidad e historial de participación del campus de forma permanente vinculando tu cuenta de Google.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white hover:bg-zinc-100 text-black font-sans font-bold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-lg shadow-white/5 active:scale-[0.98]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Registrarse con Google
                </button>
              </div>
            ) : (
              <div className="bg-[#0b0b0c] border border-zinc-900 rounded-2xl p-4 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500">Cuenta de Google</span>
                    <span className="text-xs font-sans text-zinc-300 font-medium">{currentUser.email}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  VINCULADA
                </span>
              </div>
            )}

            {/* Profile Fields Editor Form */}
            <form onSubmit={handleSaveProfileSubmit} className="space-y-5 text-left">
              <div className="bg-[#0b0b0c] border border-zinc-900 rounded-2xl p-6 space-y-5">
                <h3 className="text-white font-sans font-bold text-sm tracking-tight border-b border-zinc-900 pb-3">
                  Editar Datos de Usuario
                </h3>

                {/* Nombre de usuario */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">
                    Nombre de Usuario (Nickname)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">@</span>
                    <input
                      type="text"
                      value={editProfileNickname}
                      onChange={(e) => setEditProfileNickname(e.target.value)}
                      placeholder="usuario"
                      className={`w-full bg-[#0c0c0d] border ${profileErrors.nickname ? 'border-red-500 focus:border-red-500' : 'border-zinc-850 focus:border-yellow-400'} text-xs p-3.5 pl-7 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium`}
                    />
                  </div>
                  {profileErrors.nickname && (
                    <p className="text-red-500 font-mono text-[9px] mt-0.5 leading-tight">
                      ⚠️ {profileErrors.nickname}
                    </p>
                  )}
                </div>

                {/* Nombre completo real */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">
                    Nombre Completo Real
                  </label>
                  <input
                    type="text"
                    value={editProfileName}
                    onChange={(e) => setEditProfileName(e.target.value)}
                    placeholder="Escribe tu nombre completo"
                    className={`w-full bg-[#0c0c0d] border ${profileErrors.name ? 'border-red-500 focus:border-red-500' : 'border-zinc-850 focus:border-yellow-400'} text-xs p-3.5 rounded-xl text-zinc-100 outline-none transition-all duration-200 font-sans font-medium`}
                  />
                  {profileErrors.name && (
                    <p className="text-red-500 font-mono text-[9px] mt-0.5 leading-tight">
                      ⚠️ {profileErrors.name}
                    </p>
                  )}
                </div>

                {/* Sexo (Género) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-black block">
                    Sexo
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditProfileSexo('femenino')}
                      className={`p-3.5 rounded-xl border font-sans font-semibold text-xs transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                        editProfileSexo === 'femenino'
                          ? 'bg-pink-500/10 border-pink-500 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.1)]'
                          : 'bg-[#0c0c0d] border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-750'
                      }`}
                    >
                      <span className="text-sm">♀</span> Femenino
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditProfileSexo('masculino')}
                      className={`p-3.5 rounded-xl border font-sans font-semibold text-xs transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                        editProfileSexo === 'masculino'
                          ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.1)]'
                          : 'bg-[#0c0c0d] border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-750'
                      }`}
                    >
                      <span className="text-sm">♂</span> Masculino
                    </button>
                  </div>
                </div>
              </div>

              {/* Botón de Guardar */}
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full bg-yellow-400 hover:bg-yellow-350 disabled:bg-zinc-850 disabled:text-zinc-500 text-black font-mono font-black text-xs py-4 rounded-xl transition-all duration-300 uppercase tracking-widest cursor-pointer shadow-lg shadow-yellow-400/10 active:scale-[0.99]"
              >
                {isSavingProfile ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
