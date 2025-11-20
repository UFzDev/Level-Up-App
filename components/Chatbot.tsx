import React, { useState, useRef, useEffect } from 'react';
import { chatWithChef } from '../services/geminiService';
import { getPantry, getUserRecipes, getRecentHistoryAsString, logMeal, getDailyScore, getStreak } from '../services/storageService';
import { Message, StructuredRecipe } from '../types';
import ReactMarkdown from 'react-markdown';

const RecipeCard: React.FC<{ data: StructuredRecipe, onCook: () => void }> = ({ data, onCook }) => {
  const [showMacros, setShowMacros] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden my-2 shadow-sm">
      <div className="bg-nutri-green-50 p-3 border-b border-nutri-green-100 flex justify-between items-center">
        <h3 className="font-bold text-gray-800">{data.title}</h3>
        <span className="text-xs font-medium bg-white px-2 py-1 rounded-full text-gray-600 border">⏱️ {data.time}</span>
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Ingredientes</p>
          <div className="flex flex-wrap gap-1">
            {data.ingredients.map((ing, i) => (
              <span 
                key={i} 
                className={`text-xs px-2 py-1 rounded-full border ${
                  ing.includes('[Compra Rápida]') 
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700' 
                    : 'bg-gray-50 border-gray-100 text-gray-700'
                }`}
              >
                {ing.replace('[Compra Rápida]', '⚡')}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Instrucciones</p>
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
            {data.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="flex gap-2 mt-3">
            <button 
                onClick={() => setShowMacros(!showMacros)}
                className="flex-1 text-xs font-bold text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 py-2 rounded-lg transition-colors"
            >
                {showMacros ? 'Ocultar Info' : '📊 Nutrición'}
            </button>
            <button 
                onClick={onCook}
                className="flex-1 text-xs font-bold text-white bg-nutri-green-600 hover:bg-nutri-green-700 py-2 rounded-lg transition-colors shadow-md flex items-center justify-center gap-1"
            >
                👨‍🍳 Preparar
            </button>
        </div>

        {showMacros && (
          <div className="grid grid-cols-4 gap-2 text-center mt-2 pt-2 border-t border-gray-100 animate-fadeIn">
            <div className="bg-gray-50 rounded p-1">
              <p className="text-[10px] text-gray-500">Calorías</p>
              <p className="text-xs font-bold text-gray-800">{data.macros.calories}</p>
            </div>
            <div className="bg-gray-50 rounded p-1">
              <p className="text-[10px] text-gray-500">Prot</p>
              <p className="text-xs font-bold text-gray-800">{data.macros.protein}</p>
            </div>
            <div className="bg-gray-50 rounded p-1">
              <p className="text-[10px] text-gray-500">Carbs</p>
              <p className="text-xs font-bold text-gray-800">{data.macros.carbs}</p>
            </div>
            <div className="bg-gray-50 rounded p-1">
              <p className="text-[10px] text-gray-500">Grasas</p>
              <p className="text-xs font-bold text-gray-800">{data.macros.fats}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Chatbot: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: '¡Hola! Soy tu Chef. ¿Qué se te antoja hoy?',
      timestamp: Date.now(),
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, parts: [{ text: m.text }] }));

      // Gather context for V3 Brain + Gamification
      const contextData = {
          pantry: getPantry(),
          recipes: getUserRecipes(),
          historyString: getRecentHistoryAsString(48),
          score: getDailyScore(),
          streak: getStreak()
      };

      const rawResponse = await chatWithChef(history, userMsg.text, contextData);
      
      let responseText = rawResponse;
      let recipeData: StructuredRecipe | undefined;

      const jsonMatch = rawResponse.match(/```json\s*({[\s\S]*?"type":\s*"recipe_card"[\s\S]*?})\s*```/);

      if (jsonMatch) {
        try {
            recipeData = JSON.parse(jsonMatch[1]);
            responseText = rawResponse.replace(jsonMatch[0], '').trim();
        } catch (e) {
            console.error("Failed to parse recipe JSON", e);
        }
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "Aquí tienes.",
        timestamp: Date.now(),
        recipeData: recipeData
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Ups, error de conexión.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCook = (recipe: StructuredRecipe) => {
    // Extract numeric calories from string "350 kcal" -> 350
    const calString = recipe.macros.calories || "400";
    const calNumber = parseInt(calString.replace(/\D/g, '')) || 400;
    
    // Save as PENDING
    logMeal(recipe.title, 'pending', true, calNumber, '');
    
    alert("✅ Receta enviada a 'En Cocina'. ¡Ve a la pestaña Historial cuando la termines!");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 pb-24">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.text && (
                <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === 'user'
                    ? 'bg-nutri-green-600 text-white rounded-br-none'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                }`}
                >
                <div className="prose prose-sm prose-green max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                </div>
            )}

            {msg.role === 'model' && msg.recipeData && (
                <div className="w-full max-w-[95%]">
                    <RecipeCard 
                        data={msg.recipeData} 
                        onCook={() => handleCook(msg.recipeData!)} 
                    />
                </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border w-16 flex justify-center">
             <span className="animate-pulse">...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200 sticky bottom-[64px]">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ej: Algo rápido con pollo..."
            className="flex-1 border-gray-300 border rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-nutri-green-500 bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-nutri-green-600 text-white rounded-full p-3 shadow-md hover:bg-nutri-green-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;