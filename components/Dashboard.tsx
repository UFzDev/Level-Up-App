
import React, { useEffect, useState } from 'react';
import { getDailyBreakdown, getStreaks, updateWater, logMeal, logExercise } from '../services/storageService';
import { analyzeFoodImpact, estimateCaloriesBurned } from '../services/geminiService';
import { DailyBreakdown, Streaks, Intensity } from '../types';
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

const Dashboard: React.FC = () => {
  const [breakdown, setBreakdown] = useState<DailyBreakdown | null>(null);
  const [streaks, setStreaks] = useState<Streaks>({ nutrition: 0, exercise: 0, hydration: 0 });
  
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
  };

  useEffect(() => {
    refreshData();
    const now = new Date();
    setExTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  }, []);

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

  if (!breakdown) return <div className="p-10 text-center">Cargando métricas...</div>;

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* TOTAL SCORE HEADER - ANIMATED */}
      <div className="text-center py-4">
          <h1 className="text-5xl font-black text-gray-800 tracking-tight flex justify-center items-baseline gap-1">
              <AnimatedNumber value={breakdown.totalXP} />
              <span className="text-lg font-medium text-gray-400">/ 1000 XP</span>
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold mt-1">Puntaje Diario</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* 1. NUTRITION CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm relative overflow-hidden"
        >
            <div className="flex justify-between items-start mb-4 z-10 relative">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-nutri-green-100 text-nutri-green-600 rounded-full flex items-center justify-center text-xl">🥗</div>
                    <div>
                        <h3 className="font-bold text-gray-800">Nutrición</h3>
                        <p className="text-xs text-gray-400">Meta: 500 XP</p>
                    </div>
                </div>
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-1 rounded-lg text-xs font-bold"
                >
                    🔥 {streaks.nutrition} días
                </motion.div>
            </div>
            
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
        </motion.div>

        {/* 2. EXERCISE CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm relative overflow-hidden"
        >
            <div className="flex justify-between items-start mb-4 z-10 relative">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl">💪</div>
                    <div>
                        <h3 className="font-bold text-gray-800">Ejercicio</h3>
                        <p className="text-xs text-gray-400">Meta: 300 XP</p>
                    </div>
                </div>
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="flex items-center gap-1 bg-yellow-50 text-yellow-600 px-2 py-1 rounded-lg text-xs font-bold"
                >
                    ⚡ {streaks.exercise} días
                </motion.div>
            </div>

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
        </motion.div>

        {/* 3. HYDRATION CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-5 shadow-sm relative overflow-hidden"
        >
            <div className="flex justify-between items-start mb-4 z-10 relative">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl">💧</div>
                    <div>
                        <h3 className="font-bold text-gray-800">Hidratación</h3>
                        <p className="text-xs text-gray-400">Meta: 200 XP</p>
                    </div>
                </div>
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="flex items-center gap-1 bg-blue-100 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold"
                >
                    💧 {streaks.hydration} días
                </motion.div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleWater(-1)} className="w-10 h-10 bg-white shadow text-blue-500 rounded-full font-bold text-xl hover:scale-95 transition-transform">-</motion.button>
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
        </motion.div>
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
