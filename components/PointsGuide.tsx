
import React from 'react';

interface PointsGuideProps {
  onBack: () => void;
}

const PointsGuide: React.FC<PointsGuideProps> = ({ onBack }) => {
  return (
    <div className="p-4 space-y-6 pb-24 animate-fadeIn">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 pb-4 mb-2">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          🎮 Manual de Juego
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Guía oficial de puntos y reglas para subir de nivel.
        </p>
      </div>

      {/* Nutrition Section */}
      <div className="bg-white rounded-2xl border border-nutri-green-200 shadow-sm overflow-hidden">
        <div className="bg-nutri-green-50 p-4 border-b border-nutri-green-100 flex justify-between items-center">
          <h3 className="font-bold text-nutri-green-800 flex items-center gap-2">
            <span className="text-2xl">🥗</span> Nutrición
          </h3>
          <span className="text-xs font-bold bg-white text-nutri-green-600 px-3 py-1 rounded-full border border-nutri-green-200">
            Meta: 500 XP
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-lg">
              +100
            </div>
            <div>
              <p className="font-bold text-gray-800">Comida Saludable</p>
              <p className="text-xs text-gray-500">Platos balanceados, verduras, proteínas magras.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold text-lg">
              +50
            </div>
            <div>
              <p className="font-bold text-gray-800">Comida Balanceada</p>
              <p className="text-xs text-gray-500">Opciones normales, porciones controladas.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">
              -50
            </div>
            <div>
              <p className="font-bold text-gray-800">Chatarra / Antojo</p>
              <p className="text-xs text-gray-500">Ultraprocesados, azúcares altos, frituras.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Exercise Section */}
      <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
        <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center">
          <h3 className="font-bold text-orange-800 flex items-center gap-2">
            <span className="text-2xl">💪</span> Ejercicio
          </h3>
          <span className="text-xs font-bold bg-white text-orange-600 px-3 py-1 rounded-full border border-orange-200">
            Meta: 300 XP
          </span>
        </div>
        <div className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xl">
              x5
            </div>
            <div>
              <p className="font-bold text-gray-800">XP por Minuto</p>
              <p className="text-xs text-gray-500">
                Cada minuto de actividad cuenta. <br/>
                <span className="font-semibold text-orange-600">Ej: 60 mins = 300 XP (Meta cumplida)</span>
              </p>
            </div>
        </div>
      </div>

      {/* Hydration Section */}
      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
        <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
          <h3 className="font-bold text-blue-800 flex items-center gap-2">
            <span className="text-2xl">💧</span> Hidratación
          </h3>
          <span className="text-xs font-bold bg-white text-blue-600 px-3 py-1 rounded-full border border-blue-200">
            Meta: 200 XP
          </span>
        </div>
        <div className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
              +25
            </div>
            <div>
              <p className="font-bold text-gray-800">XP por Vaso</p>
              <p className="text-xs text-gray-500">
                Agua simple (250ml aprox). <br/>
                <span className="font-semibold text-blue-600">Meta diaria: 8 vasos para el 100%.</span>
              </p>
            </div>
        </div>
      </div>

      <button 
        onClick={onBack}
        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg shadow-lg hover:scale-[0.98] transition-transform mt-4"
      >
        Entendido, ¡Volver!
      </button>
    </div>
  );
};

export default PointsGuide;
