import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  School, 
  ArrowLeft, 
  SlidersHorizontal, 
  User, 
  LayoutGrid, 
  List, 
  Check, 
  MapPin, 
  Sparkles, 
  GraduationCap, 
  BookOpen 
} from 'lucide-react';

interface ResultadosViewProps {
  globalSearch: string;
  filteredAlumnosGlobally: any[];
  filteredInstitutes: any[];
  filteredPerfiles: any[];
  institutes: any[];
  setGlobalSearch: (s: string) => void;
  setSelectedInstituteId: (id: string | null) => void;
  setSelectedAlumnoId: (id: string | null) => void;
  setSelectedProfessorId: (id: string | null) => void;
  setShowResults: (b: boolean) => void;
}

export const ResultadosView: React.FC<ResultadosViewProps> = ({
  globalSearch,
  filteredAlumnosGlobally,
  filteredInstitutes,
  filteredPerfiles = [],
  institutes,
  setGlobalSearch,
  setSelectedInstituteId,
  setSelectedAlumnoId,
  setSelectedProfessorId,
  setShowResults
}) => {
  // 1. Filter state: 'all' | 'profesor' | 'instituto' | 'colegio' | 'universidad'
  const [filterType, setFilterType] = useState<'all' | 'profesor' | 'instituto' | 'colegio' | 'universidad'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // 2. View Mode state: 'grid' (mosaico) | 'list' (lista)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter intelligent logic reading from 'tipo' field, limited to a maximum of 5 results
  const displayedInstitutes = useMemo(() => {
    const filtered = filteredInstitutes.filter(inst => {
      const type = inst.tipo || (inst.name?.toLowerCase().includes('colegio') ? 'colegio' : inst.name?.toLowerCase().includes('universidad') ? 'universidad' : 'instituto');
      if (filterType === 'all') return true;
      return type === filterType;
    });
    return filtered.slice(0, 5);
  }, [filteredInstitutes, filterType]);

  const displayedProfessors = useMemo(() => {
    if (filterType === 'all' || filterType === 'profesor') {
      return filteredPerfiles.slice(0, 5);
    }
    return [];
  }, [filteredPerfiles, filterType]);

  const displayedAlumnos = useMemo(() => {
    // Alumnos are shown when 'all' is active
    if (filterType === 'all') {
      return filteredAlumnosGlobally.slice(0, 5);
    }
    return [];
  }, [filteredAlumnosGlobally, filterType]);

  const totalResults = displayedInstitutes.length + displayedProfessors.length + displayedAlumnos.length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      id="resultados-view" 
      className="space-y-8 pt-6 min-h-screen bg-black text-white px-1 sm:px-4"
    >
      {/* Back Button */}
      <button 
        onClick={() => {
          setShowResults(false);
          setGlobalSearch('');
        }}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all font-mono text-xs mb-4 group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Volver al Inicio
      </button>

      <div className="space-y-6">
        {/* Title and Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-4xl font-display font-black tracking-tight uppercase">
            Resultados para <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(250,204,21,0.2)]">"{globalSearch}"</span>
          </h1>
        </div>
        
        {/* Actions bar with Filters and Layout Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900 relative">
          <p className="text-xs sm:text-sm text-zinc-400 font-mono">
            Se encontraron <span className="text-yellow-400 font-bold">{totalResults}</span> resultados {filterType !== 'all' && `filtrados por ${filterType}`}.
          </p>
          
          <div className="flex items-center gap-3">
            {/* Filter Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-mono transition-all cursor-pointer ${isFilterOpen ? 'border-yellow-400 text-yellow-400 bg-yellow-400/5' : 'border-zinc-800 text-zinc-300 hover:border-zinc-700 bg-zinc-950'}`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> 
                Filtrar: <span className="text-white capitalize">{filterType === 'all' ? 'Todos' : filterType}</span>
              </button>

              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl p-2 z-30 space-y-1 font-mono text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-[10px] text-zinc-500 px-3 py-1.5 uppercase font-bold tracking-wider border-b border-zinc-900 mb-1">Filtrar por tipo</p>
                    
                    {[
                      { value: 'all', label: 'Todo' },
                      { value: 'profesor', label: 'Profesor' },
                      { value: 'instituto', label: 'Instituto' },
                      { value: 'colegio', label: 'Colegio' },
                      { value: 'universidad', label: 'Universidad' }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setFilterType(opt.value as any);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${filterType === opt.value ? 'bg-yellow-400/10 text-yellow-400 font-bold' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                      >
                        <span>{opt.label}</span>
                        {filterType === opt.value && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* View Mode Switcher (Lista vs Mosaico) */}
            <div className="flex items-center border border-zinc-900 bg-zinc-950 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-zinc-900 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Vista Mosaico"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-zinc-900 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Vista Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {totalResults === 0 && (
          <div className="text-center py-16 bg-[#09090b] border border-zinc-900/60 rounded-3xl p-8 space-y-3">
            <p className="text-zinc-400 font-mono text-sm">No se encontraron resultados para "{globalSearch}" con el filtro seleccionado.</p>
            {filterType !== 'all' && (
              <button 
                onClick={() => setFilterType('all')}
                className="text-xs text-yellow-400 hover:underline font-mono"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        )}

        {/* 1. Instituciones results block */}
        {displayedInstitutes.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-lg sm:text-xl text-zinc-400 flex items-center gap-2 tracking-wide uppercase">
              <School className="w-4 h-4 text-yellow-400" />
              Instituciones ({displayedInstitutes.length})
            </h3>
            
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "flex flex-col gap-3.5"
            }>
              {displayedInstitutes.map(inst => {
                const tipoValue = inst.tipo || (inst.name?.toLowerCase().includes('colegio') ? 'colegio' : inst.name?.toLowerCase().includes('universidad') ? 'universidad' : 'instituto');
                
                return (
                  <motion.div 
                    layout
                    key={inst.id}
                    onClick={() => {
                      setSelectedInstituteId(inst.id);
                      setShowResults(false);
                    }}
                    className={`bg-zinc-950 hover:bg-[#0c0c0e] border border-zinc-900 rounded-2xl cursor-pointer transition-all duration-300 flex hover:border-yellow-400/20 group relative overflow-hidden ${
                      viewMode === 'grid' 
                        ? 'p-5 flex-col gap-4 text-center items-center' 
                        : 'p-4 flex-row items-center justify-between gap-4 w-full'
                    }`}
                  >
                    {/* Background glow hover decoration */}
                    <div className="absolute inset-0 bg-yellow-400/[0.01] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    
                    {viewMode === 'grid' ? (
                      // === MOSAICO (GRID) ===
                      // Prioritizes a much larger visual representation at the top and layout information below
                      <>
                        <div className="w-full h-44 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 relative group-hover:scale-[1.02] transition-transform duration-300 shadow-md">
                          <img 
                            src={inst.image} 
                            alt={inst.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        
                        <div className="w-full space-y-2 flex flex-col items-center">
                          <div className="flex items-center gap-1.5 justify-center flex-wrap">
                            <span className={`text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full font-bold font-mono ${
                              tipoValue === 'universidad' 
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/10'
                                : tipoValue === 'colegio'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                            }`}>
                              {tipoValue}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{inst.shortName}</span>
                          </div>
                          <h4 className="font-bold text-base text-white mt-1 group-hover:text-yellow-400 transition-colors line-clamp-2 leading-tight">
                            {inst.name}
                          </h4>
                          <p className="text-xs text-zinc-400 font-mono line-clamp-2 text-center px-2">
                            {inst.description || "Sin descripción disponible."}
                          </p>
                        </div>

                        <div className="w-full border-t border-zinc-900 pt-3 mt-1 flex items-center justify-between font-mono text-[10px] text-zinc-400">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                            <span className="truncate max-w-[120px]">{inst.location || 'Sede Principal'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-zinc-600" />
                            <span>{inst.studentCount} alumnos</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      // === LISTA (LIST) ===
                      // A sleek horizontal compact row, prioritizing reading of the names on the left and data inline
                      <>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex-shrink-0">
                            <img 
                              src={inst.image} 
                              alt={inst.name} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold font-mono ${
                                tipoValue === 'universidad' 
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/10'
                                  : tipoValue === 'colegio'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                              }`}>
                                {tipoValue}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">{inst.shortName}</span>
                            </div>
                            <h4 className="font-bold text-sm text-white mt-1 group-hover:text-yellow-400 transition-colors truncate">
                              {inst.name}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 font-mono text-[10px] text-zinc-400 flex-shrink-0">
                          <div className="hidden sm:flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-zinc-600" />
                            <span>{inst.location || 'Sede Principal'}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                            <Users className="w-3 h-3 text-yellow-400" />
                            <span>{inst.studentCount} alumnos</span>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Profesores results block */}
        {displayedProfessors.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-lg sm:text-xl text-zinc-400 flex items-center gap-2 tracking-wide uppercase">
              <GraduationCap className="w-4 h-4 text-yellow-400" />
              Profesores ({displayedProfessors.length})
            </h3>
            
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "flex flex-col gap-3.5"
            }>
              {displayedProfessors.map(prof => {
                const schoolObj = institutes.find(i => i.id === prof.instituteId);
                return (
                  <motion.div 
                    layout
                    key={prof.id}
                    onClick={() => {
                      setSelectedProfessorId(prof.id);
                      if (prof.instituteId) {
                        setSelectedInstituteId(prof.instituteId);
                      }
                      setShowResults(false);
                    }}
                    className={`bg-zinc-950 hover:bg-[#0c0c0e] border border-zinc-900 rounded-2xl cursor-pointer transition-all duration-300 flex hover:border-yellow-400/20 group relative overflow-hidden ${
                      viewMode === 'grid' 
                        ? 'p-5 flex-col gap-4 text-center items-center' 
                        : 'p-4 flex-row items-center justify-between gap-4 w-full'
                    }`}
                  >
                    <div className="absolute inset-0 bg-yellow-400/[0.01] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    
                    {viewMode === 'grid' ? (
                      // === MOSAICO (GRID) ===
                      // Prioritizes a larger representation of the visual character/avatar and layout information below
                      <>
                        <div className="w-full h-32 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-5xl mb-1 relative group-hover:scale-[1.02] transition-all duration-300 shadow-inner">
                          {prof.gender === 'male' ? '👨‍🏫' : '👩‍🏫'}
                        </div>
                        
                        <div className="w-full space-y-2 flex flex-col items-center">
                          <div className="flex items-center gap-1.5 justify-center flex-wrap">
                            <span className="text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full font-bold font-mono bg-yellow-400/10 text-yellow-400 border border-yellow-400/10">
                              profesor
                            </span>
                            {schoolObj && (
                              <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 truncate max-w-[120px]">
                                {schoolObj.shortName}
                              </span>
                            )}
                          </div>
                          
                          <h4 className="font-bold text-base text-white mt-1 group-hover:text-yellow-400 transition-colors leading-tight">
                            {prof.nombreCompleto}
                          </h4>
                          <span className="text-xs text-zinc-400 font-mono bg-zinc-900/60 px-3 py-1 rounded-lg border border-zinc-900">
                            {prof.materia || prof.especialidad || 'Profesor(a)'}
                          </span>
                        </div>

                        <div className="w-full border-t border-zinc-900 pt-3 mt-1 flex items-center justify-center gap-1.5 font-mono text-[10px] text-zinc-500">
                          <BookOpen className="w-3.5 h-3.5 text-zinc-600" />
                          <span>Especialidad Académica</span>
                        </div>
                      </>
                    ) : (
                      // === LISTA (LIST) ===
                      // A sleek horizontal compact row, prioritizing reading of the names on the left and data inline
                      <>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="text-xl bg-zinc-900 p-2.5 rounded-lg border border-zinc-850 flex-shrink-0">
                            {prof.gender === 'male' ? '👨‍🏫' : '👩‍🏫'}
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold font-mono bg-yellow-400/10 text-yellow-400 border border-yellow-400/10">
                                profesor
                              </span>
                              {schoolObj && (
                                <span className="text-[10px] text-zinc-500 font-mono">{schoolObj.shortName}</span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm text-white mt-1 group-hover:text-yellow-400 transition-colors truncate">
                              {prof.nombreCompleto}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-xs text-zinc-400 font-mono flex items-center gap-1.5 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                            <BookOpen className="w-3.5 h-3.5 text-yellow-400/70" /> {prof.materia || prof.especialidad || 'Profesor(a)'}
                          </span>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Alumnos results block */}
        {displayedAlumnos.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-lg sm:text-xl text-zinc-400 flex items-center gap-2 tracking-wide uppercase">
              <Users className="w-4 h-4 text-yellow-400" />
              Alumnos ({displayedAlumnos.length})
            </h3>
            
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "flex flex-col gap-3.5"
            }>
              {displayedAlumnos.map(al => {
                const schoolObj = institutes.find(i => i.id === al.instituteId);
                return (
                  <motion.div 
                    layout
                    key={al.id}
                    onClick={() => {
                      setSelectedInstituteId(al.instituteId);
                      setSelectedAlumnoId(al.id);
                      setShowResults(false);
                    }}
                    className={`bg-zinc-950 hover:bg-[#0c0c0e] border border-zinc-900 rounded-2xl cursor-pointer transition-all duration-300 flex hover:border-yellow-400/20 group relative overflow-hidden ${
                      viewMode === 'grid' 
                        ? 'p-5 flex-col gap-4 text-center items-center' 
                        : 'p-4 flex-row items-center justify-between gap-4 w-full'
                    }`}
                  >
                    <div className="absolute inset-0 bg-yellow-400/[0.01] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    
                    {viewMode === 'grid' ? (
                      // === MOSAICO (GRID) ===
                      // Prioritizes a larger representation of the pupil/avatar in the center, layout information below
                      <>
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 relative group-hover:scale-[1.02] transition-transform duration-300 shadow-md">
                          <img 
                            src={al.avatar} 
                            alt={al.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        
                        <div className="w-full space-y-2 flex flex-col items-center">
                          <div className="flex items-center gap-1.5 justify-center flex-wrap">
                            <span className="text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full font-bold font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                              {al.category || 'alumno'}
                            </span>
                            {schoolObj && (
                              <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                {schoolObj.shortName}
                              </span>
                            )}
                          </div>
                          
                          <h4 className="font-bold text-base text-white mt-1 group-hover:text-yellow-400 transition-colors leading-tight">
                            {al.name}
                          </h4>
                          <span className="text-xs text-zinc-500 font-mono">
                            {al.nickname ? `@${al.nickname}` : al.course}
                          </span>
                        </div>

                        <div className="w-full border-t border-zinc-900 pt-3 mt-1 flex items-center justify-between font-mono text-[10px] text-zinc-400">
                          <span className="text-zinc-600">Puntaje Wiki</span>
                          <div className="flex items-center gap-1 text-[#facc15] font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{al.points || 0} pts</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      // === LISTA (LIST) ===
                      // A sleek horizontal compact row, prioritizing reading of the names on the left and data inline
                      <>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex-shrink-0">
                            <img 
                              src={al.avatar} 
                              alt={al.name} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                                {al.category || 'alumno'}
                              </span>
                              {schoolObj && (
                                <span className="text-[10px] text-zinc-500 font-mono">{schoolObj.shortName}</span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm text-white mt-1 group-hover:text-yellow-400 transition-colors truncate">
                              {al.name}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 font-mono text-xs flex-shrink-0">
                          <span className="text-zinc-500 hidden sm:inline">
                            {al.nickname ? `@${al.nickname}` : al.course}
                          </span>
                          <div className="flex items-center gap-1 bg-yellow-400/5 text-yellow-400 border border-yellow-400/10 px-2.5 py-1 rounded-lg font-bold">
                            <Sparkles className="w-3 h-3" />
                            <span>{al.points || 0} pts</span>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
