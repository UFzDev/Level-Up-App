
import React, { useEffect, useState } from 'react';
import { HistoryItem, MealLog, ExerciseLog } from '../types';
import { getUnifiedHistory, confirmMeal, deleteItem } from '../services/storageService';

type TabType = 'pending' | 'meals' | 'exercises';

const History: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Modal State
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setHistory(getUnifiedHistory());
  }, []);

  const handleConfirmClick = (id: string) => {
    setConfirmingId(id);
    setNotes('');
  };

  const finalizeConfirm = () => {
    if (confirmingId) {
        const updated = confirmMeal(confirmingId, notes);
        setHistory(updated);
        setConfirmingId(null);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (window.confirm("¿Eliminar este registro?")) {
        const updated = deleteItem(id);
        setHistory(updated);
    }
  };

  // --- FILTERING LOGIC ---
  
  // 1. Pending Meals
  const pendingList = history.filter((m): m is MealLog => m.type === 'meal' && m.status === 'pending');
  
  // 2. Completed Meals (Diario)
  const mealList = history
    .filter((m): m is MealLog => m.type === 'meal' && m.status === 'completed')
    .sort((a, b) => (b.consumedAt || 0) - (a.consumedAt || 0));

  // 3. Exercises
  const exerciseList = history
    .filter((m): m is ExerciseLog => m.type === 'exercise')
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex flex-col h-full pb-24 bg-gray-50 min-h-screen">
        {/* 3-TAB NAVIGATION */}
        <div className="bg-white sticky top-[64px] z-30 border-b border-gray-200 flex overflow-x-auto">
            <button 
                onClick={() => setActiveTab('pending')}
                className={`flex-1 min-w-[100px] py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pending' ? 'border-nutri-green-500 text-nutri-green-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                👨‍🍳 En Cocina
            </button>
            <button 
                onClick={() => setActiveTab('meals')}
                className={`flex-1 min-w-[100px] py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'meals' ? 'border-nutri-green-500 text-nutri-green-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                🍱 Diario
            </button>
            <button 
                onClick={() => setActiveTab('exercises')}
                className={`flex-1 min-w-[100px] py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'exercises' ? 'border-blue-500 text-blue-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                💪 Ejercicios
            </button>
        </div>

        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            
            {/* TAB 1: PENDING KITCHEN */}
            {activeTab === 'pending' && (
                <div className="space-y-3 animate-fadeIn">
                    {pendingList.length === 0 && (
                        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            <p className="text-3xl mb-2">🍳</p>
                            <p>No hay nada en la estufa.</p>
                            <p className="text-xs mt-1">Pídele al Chef una receta.</p>
                        </div>
                    )}
                    {pendingList.map(meal => (
                        <div key={meal.id} className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-yellow-400 border-gray-100 relative transition-transform active:scale-[0.99]">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-800 pr-8 line-clamp-2">{meal.title}</h3>
                                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold whitespace-nowrap">Pendiente</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">Estimado: ~{meal.calories} kcal</p>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => handleDelete(meal.id, e)}
                                    className="text-red-400 p-2 hover:bg-red-50 rounded transition-colors"
                                    title="Eliminar"
                                >
                                    🗑️
                                </button>
                                <button 
                                    onClick={() => handleConfirmClick(meal.id)}
                                    className="flex-1 bg-nutri-green-600 text-white py-2 rounded-lg font-bold shadow-sm hover:bg-nutri-green-700 flex items-center justify-center gap-2"
                                >
                                    ✅ Comer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB 2: COMPLETED MEALS */}
            {activeTab === 'meals' && (
                <div className="space-y-3 animate-fadeIn">
                    {mealList.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            <p>No has registrado comidas aún.</p>
                        </div>
                    )}
                    {mealList.map(meal => {
                        const isNegative = (meal.scoreValue !== undefined && meal.scoreValue < 0);
                        return (
                            <div key={meal.id} className={`bg-white p-4 rounded-xl shadow-sm border border-l-4 ${isNegative ? 'border-l-red-500' : (meal.isHealthy ? 'border-l-green-500' : 'border-l-orange-500')} border-gray-100 relative`}>
                                <div className="flex justify-between items-start">
                                    <div className="pr-8">
                                        <h3 className="font-bold text-gray-800 line-clamp-2">{meal.title}</h3>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {new Date(meal.consumedAt!).toLocaleString()}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDelete(meal.id, e)} 
                                        className="absolute top-3 right-3 text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-gray-50"
                                        title="Eliminar"
                                    >
                                        🗑️
                                    </button>
                                </div>
                                
                                {meal.userNotes && (
                                    <div className="mt-2 bg-gray-50 p-2 rounded text-xs text-gray-600 italic">
                                        "{meal.userNotes}"
                                    </div>
                                )}

                                <div className="mt-2 flex gap-2">
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${isNegative ? 'bg-red-50 text-red-700' : (meal.isHealthy ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700')}`}>
                                        {meal.scoreValue ? `${meal.scoreValue > 0 ? '+' : ''}${meal.scoreValue} pts` : (meal.isHealthy ? 'Saludable' : 'Antojo')}
                                    </span>
                                    <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                        {meal.calories} kcal
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TAB 3: EXERCISES */}
            {activeTab === 'exercises' && (
                <div className="space-y-3 animate-fadeIn">
                    {exerciseList.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            <p className="text-3xl mb-2">👟</p>
                            <p>Sin actividad física registrada.</p>
                            <p className="text-xs mt-1">¡Muévete un poco hoy!</p>
                        </div>
                    )}
                    {exerciseList.map(item => (
                        <div key={item.id} className="bg-blue-50 p-4 rounded-xl shadow-sm border border-l-4 border-l-blue-500 border-blue-100 relative">
                             <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl shadow-inner">
                                        🏋️
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-blue-900">{item.name}</h3>
                                        <span className="text-[10px] text-blue-400 font-medium">Hace {item.time}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(item.id, e)} 
                                    className="absolute top-3 right-3 text-blue-300 hover:text-red-500 p-2 rounded-full hover:bg-blue-100"
                                    title="Eliminar"
                                >
                                    🗑️
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3 ml-12">
                                <div className="bg-white/50 rounded px-2 py-1 text-xs text-blue-800 border border-blue-100">
                                    ⏱️ <span className="font-bold">{item.duration} min</span>
                                </div>
                                <div className="bg-white/50 rounded px-2 py-1 text-xs text-blue-800 border border-blue-100">
                                    ⚡ <span className="font-bold">{item.intensity}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* CONFIRMATION MODAL */}
        {confirmingId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">🍽️ ¡Buen provecho!</h3>
                    <p className="text-sm text-gray-600 mb-4">¿Hubo algún cambio en la receta?</p>
                    
                    <textarea 
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-4 h-24 resize-none bg-white text-gray-900 focus:ring-2 focus:ring-nutri-green-500 outline-none"
                        placeholder="Ej: Usé menos aceite, agregué aguacate..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />

                    <div className="flex gap-2">
                        <button 
                            onClick={() => setConfirmingId(null)}
                            className="flex-1 py-2 text-gray-500 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={finalizeConfirm}
                            className="flex-1 py-2 bg-nutri-green-600 text-white font-bold rounded-lg shadow-md hover:bg-nutri-green-700 transition-colors"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default History;
