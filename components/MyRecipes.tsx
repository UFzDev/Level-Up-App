import React, { useState, useEffect } from 'react';
import { getUserRecipes, addUserRecipe, removeUserRecipe } from '../services/storageService';
import { UserRecipe } from '../types';
import { estimateRecipeNutrition } from '../services/geminiService';

const MyRecipes: React.FC = () => {
  const [recipes, setRecipes] = useState<UserRecipe[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [macros, setMacros] = useState({ calories: '', protein: '', carbs: '', fats: '' });

  useEffect(() => {
    setRecipes(getUserRecipes());
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !ingredientsText.trim()) {
        alert("Por favor agrega un título e ingredientes.");
        return;
    }

    setIsEstimating(true);
    
    let finalMacros = macros;
    // Automatically estimate if macros are empty
    if (!macros.calories) {
        try {
            finalMacros = await estimateRecipeNutrition(title, ingredientsText);
            setMacros(finalMacros); // Update UI just in case
        } catch (e) {
            console.error(e);
        }
    }

    const newRecipe: UserRecipe = {
        id: Date.now().toString(),
        title: title.trim(),
        ingredients: ingredientsText.split(',').map(i => i.trim()).filter(i => i),
        instructions: instructions.trim(),
        macros: finalMacros
    };

    const updated = addUserRecipe(newRecipe);
    setRecipes(updated);
    setIsAdding(false);
    setIsEstimating(false);
    resetForm();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Borrar receta?')) {
        // CRITICAL FIX: Capture returned updated array and set state immediately
        const updated = removeUserRecipe(id);
        setRecipes(updated); 
    }
  };

  const handleManualEstimate = async () => {
    if (!title && !ingredientsText) {
        alert("Escribe al menos el título o los ingredientes.");
        return;
    }
    setIsEstimating(true);
    try {
        const data = await estimateRecipeNutrition(title, ingredientsText);
        setMacros(data);
    } catch (e) {
        alert("Error estimando nutrición.");
    } finally {
        setIsEstimating(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setIngredientsText('');
    setInstructions('');
    setMacros({ calories: '', protein: '', carbs: '', fats: '' });
  };

  const toggleExpand = (id: string) => {
      setExpandedRecipe(expandedRecipe === id ? null : id);
  };

  return (
    <div className="p-4 space-y-6 pb-24">
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span className="text-2xl">📖</span> Mis Recetas
            </h2>
            <p className="text-gray-600 text-sm">
                Guarda tus platos favoritos. El Chef estimará la nutrición automáticamente.
            </p>
        </div>

        {!isAdding ? (
             <button 
                onClick={() => setIsAdding(true)}
                className="w-full py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 font-semibold hover:bg-purple-50 transition-colors"
             >
                + Nueva Receta Propia
             </button>
        ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center">
                     <h3 className="font-bold text-gray-800">Agregar Receta</h3>
                     <button 
                        onClick={handleManualEstimate}
                        disabled={isEstimating}
                        className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold hover:bg-indigo-200 transition-colors"
                     >
                        {isEstimating ? '🔮' : '🪄 Pre-Visualizar IA'}
                     </button>
                </div>
                
                <input 
                    className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500" 
                    placeholder="Nombre del plato (ej: Avena Especial)" 
                    value={title} onChange={e => setTitle(e.target.value)}
                    disabled={isEstimating}
                />
                <textarea 
                    className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500" 
                    placeholder="Ingredientes separados por comas..." 
                    value={ingredientsText} onChange={e => setIngredientsText(e.target.value)}
                    disabled={isEstimating}
                />
                
                {/* Macro Preview */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs bg-gray-50 p-2 rounded border border-gray-100">
                    <div>
                        <p className="text-gray-500">Cal</p>
                        <input 
                            value={macros.calories} 
                            onChange={e => setMacros({...macros, calories: e.target.value})}
                            placeholder="-"
                            className="w-full bg-transparent text-center font-bold text-gray-800 outline-none"
                        />
                    </div>
                    <div>
                        <p className="text-gray-500">Prot</p>
                        <input 
                            value={macros.protein} 
                            onChange={e => setMacros({...macros, protein: e.target.value})}
                            placeholder="-"
                            className="w-full bg-transparent text-center font-bold text-gray-800 outline-none"
                        />
                    </div>
                    <div>
                        <p className="text-gray-500">Carbs</p>
                        <input 
                            value={macros.carbs} 
                            onChange={e => setMacros({...macros, carbs: e.target.value})}
                            placeholder="-"
                            className="w-full bg-transparent text-center font-bold text-gray-800 outline-none"
                        />
                    </div>
                    <div>
                        <p className="text-gray-500">Grasa</p>
                        <input 
                            value={macros.fats} 
                            onChange={e => setMacros({...macros, fats: e.target.value})}
                            placeholder="-"
                            className="w-full bg-transparent text-center font-bold text-gray-800 outline-none"
                        />
                    </div>
                </div>

                <textarea 
                    className="w-full border border-gray-300 p-2 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500" 
                    placeholder="Instrucciones breves..." 
                    value={instructions} onChange={e => setInstructions(e.target.value)}
                    disabled={isEstimating}
                />
                <div className="flex gap-2">
                    <button 
                        onClick={handleSave} 
                        disabled={isEstimating}
                        className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex justify-center"
                    >
                         {isEstimating ? 'Analizando y Guardando...' : 'Guardar Receta'}
                    </button>
                    <button onClick={() => { setIsAdding(false); resetForm(); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                </div>
            </div>
        )}

        <div className="space-y-3">
            {recipes.length === 0 && !isAdding && (
                <p className="text-center text-gray-400 py-8">No tienes recetas guardadas aún.</p>
            )}
            {recipes.map(recipe => (
                <div key={recipe.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm relative">
                    <button 
                        onClick={(e) => handleDelete(recipe.id, e)}
                        className="absolute top-3 right-3 text-gray-300 hover:text-red-500 hover:bg-gray-100 p-1 rounded z-10"
                    >
                        🗑️
                    </button>
                    <h3 className="font-bold text-gray-800 pr-8">{recipe.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{recipe.ingredients.join(', ')}</p>
                    
                    <div className="mt-3 flex justify-between items-end">
                        {recipe.macros ? (
                            <div className="flex gap-2">
                                <span className="text-[10px] bg-purple-50 px-2 py-1 rounded text-purple-700 font-bold">{recipe.macros.calories}</span>
                                <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-600">{recipe.macros.protein} prot</span>
                            </div>
                        ) : (
                            <span className="text-[10px] text-gray-400">Sin datos macro</span>
                        )}
                        
                        {recipe.macros && (
                             <button 
                                onClick={() => toggleExpand(recipe.id)}
                                className="text-xs text-purple-600 underline"
                             >
                                 {expandedRecipe === recipe.id ? 'Ocultar' : 'Ver Nutrición'}
                             </button>
                        )}
                    </div>

                    {expandedRecipe === recipe.id && recipe.macros && (
                        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-4 text-center animate-fadeIn">
                            <div>
                                <span className="block text-[10px] text-gray-400">Calorías</span>
                                <span className="text-xs font-bold text-gray-700">{recipe.macros.calories}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-gray-400">Proteína</span>
                                <span className="text-xs font-bold text-gray-700">{recipe.macros.protein}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-gray-400">Carbs</span>
                                <span className="text-xs font-bold text-gray-700">{recipe.macros.carbs}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-gray-400">Grasas</span>
                                <span className="text-xs font-bold text-gray-700">{recipe.macros.fats}</span>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
  );
};

export default MyRecipes;