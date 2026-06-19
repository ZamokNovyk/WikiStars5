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
  Star, 
  Crown, 
  Gamepad2, 
  Trophy, 
  Music, 
  Brain, 
  Shield, 
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Institute, Alumno, AlumnoComment } from './types';
import { INITIAL_INSTITUTES, INITIAL_ALUMNOS, INITIAL_COMMENTS } from './data';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

export default function App() {
  // Load state from localStorage or use initial values
  const [institutes] = useState<Institute[]>(INITIAL_INSTITUTES);
  const [alumnos, setAlumnos] = useState<Alumno[]>(INITIAL_ALUMNOS);
  const [comments, setComments] = useState<AlumnoComment[]>(INITIAL_COMMENTS);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    nickname: string;
    instituteId: string;
    category: string;
    userId: string;
    photoURL?: string;
    email?: string;
  } | null>(() => {
    const saved = localStorage.getItem('wikistars_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Navigation and filters
  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);
  const [selectedAlumnoId, setSelectedAlumnoId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('Todos');

  // Modals state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);

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
    const unsubscribeAlumnos = onSnapshot(collection(db, 'alumnos'), async (snapshot) => {
      if (snapshot.empty) {
        // If the database has no alumnos yet, seed it with initial values!
        try {
          for (const al of INITIAL_ALUMNOS) {
            const mappedAlumno = {
              id: al.id,
              name: al.name,
              nickname: al.nickname || '',
              instituteId: al.instituteId,
              avatar: al.avatar,
              course: al.course,
              category: al.category,
              bio: al.bio,
              starsPopularity: al.starsPopularity,
              starsCharisma: al.starsCharisma,
              starsTalent: al.starsTalent,
              views: al.views,
              points: al.points,
              isVerified: al.isVerified || false,
              instagram: al.instagram || '',
              tiktok: al.tiktok || ''
            };
            await setDoc(doc(db, 'alumnos', al.id), mappedAlumno);
          }
        } catch (err) {
          console.error("Failed to seed initial alumnos:", err);
        }
      } else {
        const list: Alumno[] = [];
        snapshot.forEach((snapDoc) => {
          list.push(snapDoc.data() as Alumno);
        });
        setAlumnos(list);
      }
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

    return () => {
      unsubscribeAlumnos();
      unsubscribeComments();
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('wikistars_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('wikistars_user');
    }
  }, [currentUser]);

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
      nominationReason: nominateReason || ''
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

  // Filters computed
  const filteredInstitutes = useMemo(() => {
    if (!globalSearch.trim()) return institutes;
    const term = globalSearch.toLowerCase();
    return institutes.filter(inst => 
      inst.name.toLowerCase().includes(term) || 
      inst.shortName.toLowerCase().includes(term) ||
      inst.description.toLowerCase().includes(term)
    );
  }, [globalSearch, institutes]);

  const filteredAlumnosGlobally = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const term = globalSearch.toLowerCase();
    return alumnos.filter(al => 
      al.name.toLowerCase().includes(term) || 
      (al.nickname && al.nickname.toLowerCase().includes(term)) ||
      al.bio.toLowerCase().includes(term) ||
      al.course.toLowerCase().includes(term)
    );
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
      const term = studentSearch.toLowerCase();
      pool = pool.filter(al => 
        al.name.toLowerCase().includes(term) || 
        (al.nickname && al.nickname.toLowerCase().includes(term)) ||
        al.bio.toLowerCase().includes(term) ||
        al.course.toLowerCase().includes(term)
      );
    }

    // Sort by points desc
    return pool.sort((a, b) => b.points - a.points);
  }, [selectedInstituteId, activeCategoryFilter, studentSearch, alumnos]);

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
            <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center font-display font-black text-black text-xl transition-all duration-300 group-hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
              W
            </div>
            <div className="flex items-baseline font-display text-lg tracking-widest font-black text-white">
              WIKISTARS
              <span className="text-yellow-400 ml-1 text-2xl font-black drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">5</span>
            </div>
          </div>

          {/* Actions & Profiles */}
          <div className="flex items-center gap-3">
            
            {/* Install button */}
            <button
              id="btn-install"
              onClick={() => setIsInstallModalOpen(true)}
              className="hidden sm:flex items-center gap-2 border border-yellow-400/20 hover:border-yellow-400 text-yellow-400 text-xs px-4 py-2 rounded-full font-bold font-mono tracking-wider transition-all duration-300 cursor-pointer bg-yellow-400/5 hover:bg-yellow-400/10 hover:-translate-y-0.5"
            >
              <Download className="w-3.5 h-3.5 text-yellow-400" />
              INSTALAR APP
            </button>

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
            className="relative px-4 pt-20 pb-14 lg:pb-20 text-center z-10 max-w-5xl mx-auto"
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
              La primera wiki social para calificar, nominar y descubrir a los estudiantes más populares, carismáticos e influyentes de tu centro de estudios. Diseñada con la máxima intensidad en amarillo y negro.
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
                <div className="mb-8">
                  <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-yellow-400" />
                    Alumnos Encontrados ({filteredAlumnosGlobally.length})
                  </h3>
                  {filteredAlumnosGlobally.length === 0 ? (
                    <p className="text-xs text-zinc-500 font-mono italic">No se hallaron estudiantes con este nombre o apodo.</p>
                  ) : (
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
                  )}
                </div>

                {/* Sub-block 2: Institutes matching */}
                <div>
                  <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    <School className="w-5 h-5 text-yellow-400" />
                    Institutos Encontrados ({filteredInstitutes.length})
                  </h3>
                  {filteredInstitutes.length === 0 ? (
                    <p className="text-xs text-zinc-500 font-mono italic">No se hallaron instituciones educativas con este nombre.</p>
                  ) : (
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
                  )}
                </div>
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
                  <div className="text-zinc-500 text-[10px] uppercase font-mono bg-zinc-950 px-3.5 py-1.8 rounded-xl border border-zinc-900 self-start sm:self-auto text-right font-bold tracking-wider">
                    CONEXIÓN EN VIVO A: <span className="text-yellow-400">3 SUBCAMPUS</span>
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

                        <div className="mt-5 pt-4 border-t border-zinc-900 space-y-2.5">
                          {/* Location */}
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono font-medium">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                            <span className="truncate">{inst.location}</span>
                          </div>

                          {/* Category popularity detail & Alumnos count */}
                          <div className="flex items-center justify-between text-[11px] font-mono bg-zinc-900/40 border border-zinc-900/60 p-2.5 rounded-xl">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse glow-yellow-sm" />
                              <span className="text-zinc-400 font-bold">{inst.popularCategory}</span>
                            </div>
                            <span className="text-zinc-500">
                              <span className="text-white font-black">{inst.studentCount}</span> alumnos
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Link Button */}
                      <div className="bg-zinc-950 px-5 py-4 border-t border-zinc-900/60 flex items-center justify-between text-xs font-bold tracking-wider font-mono text-zinc-400 group-hover:text-yellow-400 group-hover:bg-yellow-400/5 transition-all">
                        <span>INGRESAR AL CAMPUS HUB</span>
                        <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 group-hover:bg-yellow-400 group-hover:border-yellow-400 group-hover:text-black transition-all flex items-center justify-center text-zinc-400 text-[10px]">
                          →
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
        {selectedInstituteId && currentSelectedInstitute && !selectedAlumnoId && (
          <motion.div 
            id="campus-hub-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            
            {/* Navigation back */}
            <button 
              id="btn-back-global"
              onClick={() => {
                setSelectedInstituteId(null);
                setActiveCategoryFilter('Todos');
                setStudentSearch('');
              }}
              className="group flex items-center gap-2 text-xs text-zinc-400 hover:text-yellow-400 font-mono tracking-widest font-black uppercase cursor-pointer pb-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              VOLVER AL DIRECTORIO DE INSTITUTOS
            </button>

            {/* School Profile Hero Cover */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden relative shadow-2xl">
              <div className="h-48 md:h-64 relative bg-zinc-950">
                <img 
                  src={currentSelectedInstitute.image} 
                  alt={currentSelectedInstitute.name} 
                  className="w-full h-full object-cover opacity-50" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                
                {/* Visual float elements */}
                <div className="absolute bottom-6 left-6 md:left-10 flex flex-col md:flex-row md:items-end justify-between right-6 md:right-10 gap-4">
                  <div>
                    <span className="text-[9px] text-yellow-400 font-mono tracking-widest font-black uppercase bg-yellow-400/10 border border-yellow-400/30 px-3 py-1 rounded-lg inline-block mb-3 shadow-md">
                      CAMPUS ACTIVO DE ESTUDIOS
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-display font-black text-white uppercase tracking-tight">
                      {currentSelectedInstitute.name}
                    </h2>
                    <p className="text-zinc-300 text-xs mt-1.5 font-mono font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-yellow-400" />
                      {currentSelectedInstitute.location}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-zinc-950/90 border border-zinc-900 px-5 py-3 rounded-2xl text-center shadow-lg min-w-[90px]">
                      <span className="block text-[8px] text-zinc-500 font-mono font-bold uppercase tracking-wider">Estrellas</span>
                      <span className="text-base font-black text-white font-mono">
                        {alumnos.filter(a => a.instituteId === selectedInstituteId).length}
                      </span>
                    </div>
                    <div className="bg-zinc-950/90 border border-zinc-900 px-5 py-3 rounded-2xl text-center shadow-lg min-w-[110px]">
                      <span className="block text-[8px] text-zinc-500 font-mono font-bold uppercase tracking-wider">Promedio campus</span>
                      <span className="text-base font-black text-yellow-405 text-yellow-400 font-mono flex items-center gap-0.5 justify-center">
                        ★ {currentSelectedInstitute.ratingAverage}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description bar */}
              <div className="p-6 bg-zinc-950 border-t border-zinc-900/60 text-xs sm:text-sm text-zinc-400 leading-relaxed md:flex md:items-center justify-between gap-8">
                <span className="block max-w-3xl font-sans font-medium text-zinc-400">
                  {currentSelectedInstitute.description}
                </span>
                
                {/* Nominate button */}
                <button
                  id="btn-nominate-student"
                  onClick={() => setIsNominateModalOpen(true)}
                  className="mt-4 md:mt-0 bg-yellow-400 text-black hover:bg-yellow-300 font-black text-xs px-6 py-3.5 rounded-full flex items-center justify-center gap-2.5 transition-all duration-300 font-mono tracking-wider shadow-[0_4px_20px_rgba(250,204,21,0.25)] hover:shadow-[0_4px_25px_rgba(250,204,21,0.45)] shrink-0 hover:-translate-y-0.5 cursor-pointer uppercase"
                >
                  <PlusCircle className="w-4 h-4 text-black" />
                  NOMINAR UNA ESTRELLA 🌟
                </button>
              </div>
            </div>

            {/* Search and Category Filters Inside Campus */}
            <div className="bg-[#0b0b0b] border border-zinc-900 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Mini Search input */}
                <div className="relative flex-1 max-w-md group">
                  <div className="absolute inset-y-0 left-3 flex items-center text-zinc-400 group-focus-within:text-yellow-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    id="campus-search-input"
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Filtrar alumnos por nombre o curso..."
                    className="w-full bg-[#121212] focus:bg-[#161616] border border-zinc-800 focus:border-yellow-400/50 text-xs py-2.5 pl-9 pr-4 rounded-xl text-zinc-200 outline-none placeholder-zinc-500 transition-colors"
                  />
                  {studentSearch && (
                    <button 
                      onClick={() => setStudentSearch('')}
                      className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-white"
                    >
                      <X className="w-3" />
                    </button>
                  )}
                </div>

                <div className="text-[11px] font-mono text-zinc-500 text-right">
                  Mostrando <span className="text-zinc-200 font-bold">{filteredAlumnosInCampus.length}</span> estudiantes
                </div>
              </div>

              {/* Category selector pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
                <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 mr-2 shrink-0">Categoría:</span>
                {['Todos', 'Artista', 'Deportista', 'Académico', 'Influencer', 'Gaming', 'Líder'].map(cat => {
                  const isActive = activeCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategoryFilter(cat)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all shrink-0 font-mono ${
                        isActive 
                          ? 'bg-yellow-400 text-black border-yellow-400 font-bold shadow-md' 
                          : getCategoryThemeColor(cat as Alumno['category'])
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List of Student entries in Campus */}
            {filteredAlumnosInCampus.length === 0 ? (
              <div id="no-students-fallback" className="bg-[#0b0b0b] border border-zinc-900 border-dashed rounded-3xl p-16 text-center text-zinc-500 space-y-4">
                <Users className="w-12 h-12 text-zinc-600 mx-auto animate-pulse" />
                <h4 className="font-display font-bold text-white text-base">Aún no hay estrellas de esta categoría</h4>
                <p className="text-xs max-w-md mx-auto">
                  Sé el primero en postular o nominar al alumno más popular de esta categoría en tu división. ¡Presiona "Nominar una Estrella 🌟" arriba!
                </p>
                <button
                  onClick={() => setIsNominateModalOpen(true)}
                  className="bg-zinc-900 border border-zinc-800 text-yellow-400 text-xs px-3.5 py-2 rounded-xl hover:bg-zinc-800 transition-all font-mono"
                >
                  Nominar Estudiante
                </button>
              </div>
            ) : (
              <div id="students-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAlumnosInCampus.map((al, index) => {
                  return (
                    <motion.div
                      key={al.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -5 }}
                      className="bg-zinc-950 border border-zinc-900 hover:border-yellow-400/35 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between shadow-2xl transition-all duration-300 hover:shadow-[0_12px_30px_rgba(250,204,21,0.05)]"
                    >
                      {/* Top banner rating badges */}
                      <div className="flex items-start justify-between gap-2">
                        {/* Course info */}
                        <div className="text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-805 border-zinc-800/80 px-2.5 py-1 rounded-lg text-zinc-400 max-w-[180px] truncate">
                          {al.course.split(' - ')[0]}
                        </div>
                        
                        {/* Vote count */}
                        <div className="text-[9px] font-mono font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 shadow-sm">
                          <Flame className="w-3.5 h-3.5 text-amber-500 fill-current animate-pulse" />
                          <span className="font-extrabold">{al.points} pt</span>
                        </div>
                      </div>

                      {/* Main profile section */}
                      <div className="mt-4 flex items-start gap-4">
                        <img 
                          src={al.avatar} 
                          alt={al.name} 
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-full object-cover border-2 border-yellow-400/30 shrink-0 shadow-md" 
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-display font-black text-sm text-zinc-100 uppercase tracking-tight capitalize">
                              {al.name}
                            </h4>
                            {al.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                          </div>
                          {al.nickname && (
                            <span className="text-[10px] text-yellow-500 font-mono font-semibold">@{al.nickname}</span>
                          )}
                          
                          {/* Category Badge with icon */}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="p-0.5 rounded bg-zinc-900 inline-block border border-zinc-900">
                              {getCategoryIcon(al.category)}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-400 tracking-wider uppercase font-bold">
                              {al.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Snippet and details */}
                      <p className="mt-4 text-[11px] text-zinc-400 leading-relaxed italic line-clamp-2 font-sans font-medium">
                        "{al.bio}"
                      </p>

                      {/* Interactive metrics block */}
                      <div className="mt-5 pt-3.5 border-t border-zinc-900/60 grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono text-zinc-500">
                        <div className="bg-zinc-900/30 border border-zinc-900/50 p-2 rounded-xl">
                          <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wide">Popu</span>
                          <span className="text-white font-black text-xs">★ {al.starsPopularity}</span>
                        </div>
                        <div className="bg-zinc-900/30 border border-zinc-900/50 p-2 rounded-xl">
                          <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wide">Caris</span>
                          <span className="text-white font-black text-xs">★ {al.starsCharisma}</span>
                        </div>
                        <div className="bg-zinc-900/30 border border-zinc-900/50 p-2 rounded-xl">
                          <span className="block text-[8px] text-zinc-500 font-bold uppercase tracking-wide">Talen</span>
                          <span className="text-white font-black text-xs">★ {al.starsTalent}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-1.5 flex gap-2">
                        {/* Vote up button */}
                        <button
                          onClick={() => handleUpvote(al.id)}
                          className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-mono font-black py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-yellow-400/10 hover:-translate-y-0.5 active:translate-y-0"
                        >
                          <Flame className="w-3.5 h-3.5 text-amber-600 fill-current" />
                          <span>VOTAR</span>
                        </button>

                        {/* View Wiki details button */}
                        <button
                          onClick={() => {
                            setSelectedAlumnoId(al.id);
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 hover:border-zinc-700 text-xs font-mono font-bold py-2.5 rounded-xl transition-all text-center cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                        >
                          WIKI COMPLETA
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

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

      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-black border-t border-zinc-950 py-12 px-4 text-center mt-20 relative z-10 text-xs font-mono text-zinc-650">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex justify-center items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center font-black font-display text-base border border-yellow-400/30 shadow-[0_0_10px_rgba(250,204,21,0.1)]">W</span>
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

      {/* --- MODAL 1: INSTALL APP BANNER --- */}
      <AnimatePresence>
        {isInstallModalOpen && (
          <div id="install-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => setIsInstallModalOpen(false)}
            />
            {/* Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 max-w-md w-full relative z-10 space-y-6 shadow-2xl"
            >
              <button 
                onClick={() => setIsInstallModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-yellow-400 text-black flex items-center justify-center font-black text-2xl font-display shadow-lg shadow-yellow-400/10">
                  W
                </div>
                <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">INSTALA WIKISTARS 5</h3>
                <p className="text-xs text-zinc-400 font-sans font-medium">
                  Lleva la wiki social a tu pantalla de inicio para recibir alertas inmediatas de variación en tu popularidad y la de tus amigos.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="bg-[#090909] p-3.5 rounded-2xl border border-zinc-900 text-xs flex gap-3">
                  <span className="text-yellow-400 font-mono font-black">⚡</span>
                  <div>
                    <strong className="block text-zinc-200 font-bold">Actualizaciones ultrarrápidas</strong>
                    <span className="text-[11px] text-zinc-500 font-sans font-medium">Grados y calificaciones se asientan sin demoras.</span>
                  </div>
                </div>
                <div className="bg-[#090909] p-3.5 rounded-2xl border border-zinc-900 text-xs flex gap-3">
                  <span className="text-yellow-400 font-mono font-black">🔔</span>
                  <div>
                    <strong className="block text-zinc-200 font-bold">Alertas de Murmullo</strong>
                    <span className="text-[11px] text-zinc-500 font-sans font-medium">Entérate si alguien te calificó o te dejó un testimonio.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsInstallModalOpen(false);
                  triggerNotice('¡Atajo configurado! WikiStars5 se agregó a tu dispositivo ficticiamente.');
                }}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black text-xs py-3.5 rounded-xl transition-all duration-300 uppercase tracking-widest cursor-pointer shadow-lg shadow-yellow-400/15 hover:-translate-y-0.5 active:translate-y-0"
              >
                Añadir a Pantalla de Inicio
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

    </div>
  );
}
