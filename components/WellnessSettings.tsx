
import React, { useState, useEffect } from 'react';
import { getWellnessSettings, saveWellnessSettings, getWeeklyWellnessHistory } from '../services/storageService';
import { WellnessSettings } from '../types';
import { motion } from 'framer-motion';

const WellnessSettingsComp: React.FC = () => {
  const [settings, setSettings] = useState<WellnessSettings>({
    enableSleep: false,
    enableSteps: false,
    enableHabits: false
  });
  
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    setSettings(getWellnessSettings());
    setHistory(getWeeklyWellnessHistory());
  }, []);

  const toggle = (key: keyof WellnessSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    saveWellnessSettings(newSettings);
  };

  // Helper to render history bars
  const HistoryBar: React.FC<{ 
      dataKey: 'sleep' | 'steps' | 'completedHabits', 
      color: string, 
      unit: string,
      maxVal: number 
  }> = ({ dataKey, color, unit, maxVal }) => (
      <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Historial (7 Días)</h4>
          <div className="flex items-end justify-between h-16 gap-1">
              {history.map((day, i) => {
                  const val = day[dataKey];
                  const hPercent = Math.min((val / maxVal) * 100, 100);
                  return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                          <div className="w-full h-full flex items-end bg-gray-50 rounded overflow-hidden relative">
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${hPercent}%` }}
                                className={`w-full ${color} opacity-80 group-hover:opacity-100`}
                              ></motion.div>
                          </div>
                          <span className="text-[9px] text-gray-400 font-medium">{day.dayName}</span>
                      </div>
                  )
              })}
          </div>
          <div className="text-right mt-2 text-[10px] text-gray-400">
              Último: {history[history.length-1][dataKey]} {unit}
          </div>
      </div>
  );

  return (
    <div className="p-4 space-y-6 pb-24 animate-fadeIn">
      <div className="bg-white border-b border-gray-100 pb-4 mb-2">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          ⚙️ Ajustes de Bienestar
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Activa módulos para verlos en tu Dashboard y monitorear tu progreso semanal aquí.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100">
        
        {/* Sleep Module */}
        <div className="p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-2xl bg-indigo-50 w-10 h-10 flex items-center justify-center rounded-full text-indigo-600">😴</div>
                    <div>
                    <h3 className="font-bold text-gray-800">Monitor de Sueño</h3>
                    <p className="text-xs text-gray-500">El Chef adaptará recomendaciones si duermes poco.</p>
                    </div>
                </div>
                <button 
                    onClick={() => toggle('enableSleep')}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableSleep ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.enableSleep ? 'left-7' : 'left-1'}`}></div>
                </button>
            </div>
            {settings.enableSleep && (
                <HistoryBar dataKey="sleep" color="bg-indigo-500" unit="h" maxVal={9} />
            )}
        </div>

        {/* Steps Module */}
        <div className="p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-2xl bg-cyan-50 w-10 h-10 flex items-center justify-center rounded-full text-cyan-600">🦶</div>
                    <div>
                    <h3 className="font-bold text-gray-800">Contador de Pasos</h3>
                    <p className="text-xs text-gray-500">Registra tu movimiento diario.</p>
                    </div>
                </div>
                <button 
                    onClick={() => toggle('enableSteps')}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableSteps ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.enableSteps ? 'left-7' : 'left-1'}`}></div>
                </button>
            </div>
            {settings.enableSteps && (
                <HistoryBar dataKey="steps" color="bg-cyan-500" unit="pasos" maxVal={10000} />
            )}
        </div>

        {/* Habits Module */}
        <div className="p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-2xl bg-pink-50 w-10 h-10 flex items-center justify-center rounded-full text-pink-600">✨</div>
                    <div>
                    <h3 className="font-bold text-gray-800">Hábitos</h3>
                    <p className="text-xs text-gray-500">Lista de tareas diarias (Leer, Meditar, etc).</p>
                    </div>
                </div>
                <button 
                    onClick={() => toggle('enableHabits')}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableHabits ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.enableHabits ? 'left-7' : 'left-1'}`}></div>
                </button>
            </div>
            {settings.enableHabits && (
                <HistoryBar dataKey="completedHabits" color="bg-pink-500" unit="hábitos" maxVal={5} />
            )}
        </div>

      </div>
    </div>
  );
};

export default WellnessSettingsComp;
