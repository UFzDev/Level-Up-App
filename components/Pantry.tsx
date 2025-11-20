import React, { useState, useEffect } from 'react';
import { getPantry, addToPantry, removeFromPantry } from '../services/storageService';

const Pantry: React.FC = () => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    setIngredients(getPantry());
  }, []);

  const handleAdd = () => {
    if (newItem.trim()) {
      const updated = addToPantry(newItem.trim());
      setIngredients(updated);
      setNewItem('');
    }
  };

  const handleRemove = (item: string) => {
    const updated = removeFromPantry(item);
    setIngredients(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="bg-nutri-green-50 border border-nutri-green-100 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span className="text-2xl">🍱</span> Mi Despensa
        </h2>
        <p className="text-gray-600 text-sm">
          Mantén tu inventario actualizado. El Chef usará esta lista para sugerirte recetas personalizadas.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-[72px] z-10">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Agregar ingrediente (ej: Lentejas)"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-nutri-green-500"
          />
          <button
            onClick={handleAdd}
            disabled={!newItem.trim()}
            className="bg-nutri-green-600 text-white px-4 py-2 rounded-lg hover:bg-nutri-green-700 disabled:opacity-50 font-medium"
          >
            Agregar
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide px-1">
          Ingredientes ({ingredients.length})
        </h3>
        
        {ingredients.length === 0 ? (
          <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">
            <p>Tu despensa está vacía.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ingredients.map((item, index) => (
              <div 
                key={`${item}-${index}`} 
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-4 pr-2 py-2 shadow-sm group hover:border-nutri-green-300 transition-colors"
              >
                <span className="text-gray-800 capitalize">{item}</span>
                <button
                  onClick={() => handleRemove(item)}
                  className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                  aria-label={`Eliminar ${item}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pantry;