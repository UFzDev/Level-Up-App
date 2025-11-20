
import React, { useEffect, useState } from 'react';
import { getWeeklyDetailedStats } from '../services/storageService';
import { WeeklyStatsData } from '../types';

const Stats: React.FC = () => {
  const [data, setData] = useState<WeeklyStatsData[]>([]);

  useEffect(() => {
    setData(getWeeklyDetailedStats());
  }, []);

  const renderBarChart = (
      title: string, 
      dataKey: keyof WeeklyStatsData, 
      colorClass: string, 
      maxValue: number,
      unit: string
    ) => (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
        <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide flex justify-between">
            {title} <span className="text-gray-400 text-xs font-normal">Últimos 7 días</span>
        </h3>
        <div className="flex justify-between items-end h-32 gap-2">
            {data.map((d, i) => {
                const val = d[dataKey] as number;
                const height = Math.min((val / maxValue) * 100, 100);
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                         <div className="relative w-full h-full flex items-end bg-gray-50 rounded-t-md overflow-hidden">
                             <div 
                                className={`w-full rounded-t-md transition-all duration-700 ${colorClass} group-hover:opacity-80`}
                                style={{ height: `${height}%` }}
                             ></div>
                         </div>
                         <span className="text-[10px] font-bold text-gray-400">{d.day}</span>
                    </div>
                );
            })}
        </div>
        <div className="mt-2 text-right">
            <p className="text-xs text-gray-400">
                Promedio: {Math.round(data.reduce((a, b) => a + (b[dataKey] as number), 0) / 7)} {unit}
            </p>
        </div>
    </div>
  );

  return (
    <div className="p-4 space-y-2 pb-24 animate-fadeIn">
      <div className="bg-white border-b border-gray-100 pb-4 mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📊 Estadísticas V11
        </h2>
        <p className="text-gray-500 text-sm">Tu rendimiento detallado.</p>
      </div>

      {renderBarChart("🥗 Nutrición (XP)", "nutritionXP", "bg-nutri-green-500", 500, "XP")}
      {renderBarChart("💪 Ejercicio (Min)", "exerciseMins", "bg-orange-500", 60, "min")}
      {renderBarChart("💧 Hidratación (Vasos)", "waterCups", "bg-blue-500", 8, "vasos")}
      
    </div>
  );
};

export default Stats;
