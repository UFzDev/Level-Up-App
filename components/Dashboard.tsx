
import React, { useEffect, useState } from 'react';
import { getDailyBreakdown, getStreaks, updateWater, logMeal, logExercise, getWellnessSettings, logSleep, getTodaySleep, logSteps, getTodaySteps, getHabits, addHabit, deleteHabit, toggleHabitForToday, getTodayHabitLogs } from '../services/storageService';
import { analyzeFoodImpact, estimateCaloriesBurned } from '../services/geminiService';
import { DailyBreakdown, Streaks, Intensity, WellnessSettings, Habit } from '../../types';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';

// Helper for counting up numbers
const AnimatedNumber = ({ value }: { value: number }) => {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
};

const CollapsibleCard: React.FC<{
    title: string;
    icon: string;
    metaLabel?: string;
    streak?: number;
    colorTheme: 'green' | 'orange' | 'blue' | 'indigo' | 'cyan' | 'pink';
    children: React.ReactNode;
}> = ({ title, icon, metaLabel, streak, colorTheme, children }) => {
    // V13 Change: Default to collapsed (false)
    const [isOpen, setIsOpen] = useState(false);

    const colors = {
        green: { bgIcon: 'bg-nutri-green-100', textIcon: 'text-nutri-green-600', streakBg: 'bg-nutri-green-50', streakText: 'text-nutri-green-600' },
        orange: { bgIcon: 'bg-orange-100', textIcon: 'text-orange-600', streakBg: 'bg-orange-50', streakText: 'text-orange-600' },
        blue: { bgIcon: 'bg-blue-100', textIcon: 'text-blue-600', streakBg: 'bg-blue-50', streakText: 'text-blue-600' },
        indigo: { bgIcon: 'bg-indigo-100', textIcon: 'text-indigo-600', streakBg: 'bg-indigo-50', streakText: 'text-indigo-600' },
        cyan: { bgIcon: 'bg-cyan-100', textIcon: 'text-cyan-600', streakBg: 'bg-cyan-50', streakText: 'text-cyan-600' },
        pink: { bgIcon: 'bg-pink-100', textIcon: 'text-pink-600', streakBg: 'bg-pink-50', streakText: 'text-pink-600' },
    };
    const theme = colors[colorTheme];

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm overflow-hidden"
        >
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                 <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${theme.bgIcon} ${theme.textIcon} rounded-full flex items-center justify-center text-xl`}>{icon}</div>
                    <div>
                        <h3 className="font-bold text-gray-800">{title}</h3>
                        {metaLabel && <p className="text-xs text-gray-400">{metaLabel}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {streak !== undefined && (
                        <div className={`flex items-center gap-1 ${theme.streakBg} ${theme.streakText} px-2 py-1 rounded-lg text-xs font-bold`}>
                            🔥 {streak}
                        </div>
                    )}
                    <span className="text-gray-300 text-xs transform transition-transform duration-300" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const Dashboard: React.FC = () => {
  const [breakdown, setBreakdown] = useState<DailyBreakdown | null>(null);
  const [streaks, setStreaks] = useState<Streaks>({ nutrition: 0, exercise: 0, hydration: 0, habits: 0 });
  const [settings, setSettings] = useState<WellnessSettings | null>(null);
  
  // New Modules State
  const [sleepHours, setSleepHours] = useState<number | ''>('');
  const [stepsCount, setStepsCount] = useState<number | ''>('');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<string[]>([]);
  const [newHabitTitle, setNewHabitTitle] = useState('');

  // Quick Log State
  const [quickTitle, setQuickTitle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Exercise Modal
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [isSavingExercise, setIsSavingExercise] = useState(false);
  const [exName, setExName] = useState('');
  const [exTime, setExTime] = useState('');
  const [exIntensity, setExIntensity] = useState<Intensity>('Media');
  const [exDuration, setExDuration] = useState<number>(30);
  const [exCalories, setExCalories] = useState('');

  const EXERCISE_CHIPS = ["💃 Danza", "💪 Gym", "🪢 Cuerda", "🚴 Bici"];

  const refreshData = () => {
    setBreakdown(getDailyBreakdown());
    setStreaks(getStreaks());
    setSettings(getWellnessSettings());
    
    // Refresh Module Data
    const s = getTodaySleep();
    setSleepHours(s !== null ? s : '');
    setStepsCount(getTodaySteps() || '');
    setHabits(getHabits());
    setHabitLogs(getTodayHabitLogs());
  };

  useEffect(() => {
    refreshData();
    const now = new Date();
    setExTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  }, []);

  // HANDLERS

  const handleQuickLog = async () => {
    if (!quickTitle.trim()) return;
    setIsAnalyzing(true);
    try {
        const verdict = await analyzeFoodImpact(quickTitle);
        logMeal(quickTitle.trim(), 'completed', verdict.isHealthy, verdict.calories, 'Juez IA', verdict.scoreImpact);
        setQuickTitle('');
        refreshData();
        alert(`${verdict.isHealthy ? '✅' : '🚨'} ${verdict.reason}\n\nImpacto: ${verdict.scoreImpact > 0 ? '+' : ''}${verdict.scoreImpact} XP`);
    } catch (error) {
        logMeal(quickTitle.trim(), 'completed', false, 300, 'Manual');
        refreshData();
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleWater = (change: number) => {
      updateWater(change);
      refreshData();
  };

  const handleSaveExercise = async () => {
      if(!exName.trim()) return;
      setIsSavingExercise(true);
      try {
        let finalCalories = parseInt(exCalories);
        if (isNaN(finalCalories) || finalCalories <= 0) {
            finalCalories = await estimateCaloriesBurned(exName, exDuration, exIntensity);
        }
        logExercise(exName, exTime, exIntensity, exDuration, finalCalories);
        setShowExerciseModal(false);
        setExName('');
        refreshData();
        alert(`💪 +${exDuration * 5} XP ganados!`);
      } catch (error) {
        alert("Error guardando ejercicio.");
      } finally {
        setIsSavingExercise(false);
      }
  };

  const handleSaveSleep = () => {
      if (sleepHours !== '') {
          logSleep(Number(sleepHours));
          alert("💤 Sueño registrado.");
          refreshData();
      }
  };

  const handleSaveSteps = () => {
      if (stepsCount !== '') {
          logSteps(Number(stepsCount));
          alert("👣 Pasos actualizados.");
          refreshData();
      }
  };

  const handleAddHabit = () => {
      if (newHabitTitle.trim()) {
          addHabit(newHabitTitle.trim());
          setNewHabitTitle('');
          refreshData();
      }
  };

  const handleDeleteHabit = (id: string) => {
      if (window.confirm('¿Borrar hábito?')) {
          deleteHabit(id);
          refreshData();
      }
  };

  const handleToggleHabit = (id: string) => {
      toggleHabitForToday(id);
      refreshData();
  };

  if (!breakdown || !settings) return <div className="p-10 text-center">Cargando métricas...</div>;

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* TOTAL SCORE HEADER */}
      <div className="text-center py-4">
          <h1 className="text-5xl font-black text-gray-800 tracking-tight flex justify-center items-baseline gap-1">
              <AnimatedNumber value={breakdown.totalXP} />
              <span className="text-lg font-medium text-gray-400">/ 1000 XP</span>
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold mt-1">Puntaje Diario</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        
        {/* 1. NUTRITION CARD (Collapsible) */}
        <CollapsibleCard title="Nutrición" icon="🥗" metaLabel="Meta: 500 XP" streak={streaks.nutrition} colorTheme="green">
            <div className="mb-2 flex justify-between text-xs font-bold text-gray-600">
                <span>{breakdown.nutrition.label}</span>
                <span>{Math.round(breakdown.nutrition.percent * 100)}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                    className="h-full bg-nutri-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${breakdown.nutrition.percent * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                ></motion.div>
            </div>
        </CollapsibleCard>

        {/* 2. EXERCISE CARD (Collapsible) */}
        <CollapsibleCard title="Ejercicio" icon="💪" metaLabel="Meta: 300 XP" streak={streaks.exercise} colorTheme="orange">
            <div className="mb-2 flex justify-between text-xs font-bold text-gray-600">
                <span>{breakdown.exercise.label}</span>
                <span>{Math.round(breakdown.exercise.percent * 100)}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                <motion.div 
                    className="h-full bg-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${breakdown.exercise.percent * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                ></motion.div>
            </div>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowExerciseModal(true)}
              className="w-full py-2 bg-orange-50 text-orange-600 font-bold rounded-xl text-sm hover:bg-orange-100 transition-colors"
            >
                Registrar Actividad
            </motion.button>
        </CollapsibleCard>

        {/* 3. HYDRATION CARD (Collapsible) */}
        <CollapsibleCard title="Hidratación" icon="💧" metaLabel="Meta: 200 XP" streak={streaks.hydration} colorTheme="blue">
             <div className="flex items-center justify-between mb-4">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleWater(-1)} className="w-10 h-10 bg-white shadow text-blue-500 rounded-full font-bold text-xl hover:scale-95 transition-transform border border-blue-100">-</motion.button>
                <div className="text-center">
                    <motion.span 
                      key={breakdown.hydration.label}
                      initial={{ scale: 1.2, color: '#3b82f6' }}
                      animate={{ scale: 1, color: '#1e3a8a' }}
                      className="text-3xl font-black text-blue-900 block"
                    >
                        {breakdown.hydration.label.split('/')[0]}
                    </motion.span>
                    <span className="text-xs text-blue-400 block font-bold">VASOS</span>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleWater(1)} className="w-10 h-10 bg-blue-500 shadow text-white rounded-full font-bold text-xl hover:scale-95 transition-transform">+</motion.button>
            </div>
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <motion.div 
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${breakdown.hydration.percent * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                ></motion.div>
            </div>
        </CollapsibleCard>

        {/* --- OPTIONAL MODULES --- */}

        {/* SLEEP MODULE */}
        {settings.enableSleep && (
            <CollapsibleCard title="Horas de Sueño" icon="😴" colorTheme="indigo">
                <div className="flex gap-2">
                    <input 
                        type="number" 
                        placeholder="Horas (ej: 7.5)" 
                        value={sleepHours} 
                        onChange={(e) => setSleepHours(e.target.value ? Number(e.target.value) : '')}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white text-black text-sm"
                    />
                    <button 
                        onClick={handleSaveSleep}
                        className="bg-indigo-600 text-white px-4 rounded-lg font-bold text-sm"
                    >
                        Guardar
                    </button>
                </div>
            </CollapsibleCard>
        )}

        {/* STEPS MODULE */}
        {settings.enableSteps && (
            <CollapsibleCard title="Pasos" icon="🦶" colorTheme="cyan">
                 <div className="flex gap-2 mb-2">
                    <input 
                        type="number" 
                        placeholder="Total hoy" 
                        value={stepsCount} 
                        onChange={(e) => setStepsCount(e.target.value ? Number(e.target.value) : '')}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white text-black text-sm"
                    />
                    <button 
                        onClick={handleSaveSteps}
                        className="bg-cyan-600 text-white px-4 rounded-lg font-bold text-sm"
                    >
                        Actualizar
                    </button>
                </div>

                {/* --- NUEVO: CÁLCULO DE CALORÍAS --- */}
                {stepsCount !== '' && Number(stepsCount) > 0 && (
                    <p className="text-xs text-cyan-600 font-bold mb-2 text-center bg-cyan-50 p-1 rounded border border-cyan-100">
                        🔥 Aprox. {Math.round(Number(stepsCount) * 0.04)} kcal quemadas
                    </p>
                )}
                {/* ----------------------------------- */}

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((Number(stepsCount) || 0) / 10000) * 100, 100)}%` }}
                    ></motion.div>
                </div>
                <p className="text-[10px] text-gray-400 text-right mt-1">Meta: 10,000</p>
            </CollapsibleCard>
        )}

        {/* HABITS MODULE */}
        {settings.enableHabits && (
            <CollapsibleCard title="Hábitos" icon="✨" streak={streaks.habits} colorTheme="pink">
                <div className="space-y-2 mb-4">
                    {habits.length === 0 && <p className="text-xs text-gray-400 italic">Agrega hábitos para monitorear.</p>}
                    {habits.map(habit => {
                        const isDone = habitLogs.includes(habit.id);
                        return (
                            <div key={habit.id} className="flex items-center justify-between bg-pink-50 p-2 rounded-lg">
                                <span className={`text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-700'}`}>{habit.title}</span>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        checked={isDone} 
                                        onChange={() => handleToggleHabit(habit.id)}
                                        className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                                    />
                                    <button onClick={() => handleDeleteHabit(habit.id)} className="text-gray-400 text-xs">✕</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex gap-2">
                    <input 
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        placeholder="Nuevo hábito..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1 bg-white text-black text-xs"
                    />
                    <button onClick={handleAddHabit} className="bg-pink-500 text-white px-3 rounded-lg text-xs font-bold">+</button>
                </div>
            </CollapsibleCard>
        )}

      </div>

      {/* QUICK LOG */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase">Registro Rápido de Comida</h3>
        <div className="flex gap-2">
            <input 
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-nutri-green-500 outline-none bg-white text-gray-900"
                placeholder="Ej: 2 tacos de asada"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickLog()}
            />
            <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={handleQuickLog}
                disabled={isAnalyzing || !quickTitle.trim()}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
            >
                {isAnalyzing ? '...' : 'OK'}
            </motion.button>
        </div>
      </div>

      {/* EXERCISE MODAL */}
      <AnimatePresence>
      {showExerciseModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl"
              >
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-800">Registrar Ejercicio</h3>
                      <button onClick={() => setShowExerciseModal(false)} className="text-gray-400">✕</button>
                  </div>
                  <div className="space-y-4">
                      <div className="flex gap-2 flex-wrap">
                          {EXERCISE_CHIPS.map(c => (
                              <button key={c} onClick={() => setExName(c)} className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600 hover:bg-orange-100 hover:text-orange-600">{c}</button>
                          ))}
                      </div>
                      <input value={exName} onChange={e => setExName(e.target.value)} placeholder="Actividad" className="w-full border border-gray-300 p-2 rounded bg-white text-black" />
                      <div className="grid grid-cols-2 gap-2">
                          <input type="time" value={exTime} onChange={e => setExTime(e.target.value)} className="border border-gray-300 p-2 rounded bg-white text-black" />
                          <input type="number" value={exDuration} onChange={e => setExDuration(Number(e.target.value))} className="border border-gray-300 p-2 rounded bg-white text-black" placeholder="Mins" />
                      </div>
                      <div className="mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Calorías (Opcional)</label>
                        <input 
                            type="number" 
                            value={exCalories} 
                            onChange={e => setExCalories(e.target.value)} 
                            className="w-full border border-gray-300 p-2 rounded bg-white text-black mt-1" 
                            placeholder="Dejar vacío para estimar con IA" 
                        />
                      </div>
                      <div className="flex border rounded overflow-hidden">
                          {(['Baja','Media','Alta'] as Intensity[]).map(l => (
                              <button key={l} onClick={() => setExIntensity(l)} className={`flex-1 py-2 text-xs font-bold ${exIntensity === l ? 'bg-orange-500 text-white' : 'bg-gray-50'}`}>{l}</button>
                          ))}
                      </div>
                      <motion.button 
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveExercise} 
                        disabled={isSavingExercise} 
                        className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg"
                      >
                          {isSavingExercise ? 'Guardando...' : 'Guardar'}
                      </motion.button>
                  </div>
              </motion.div>
          </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
