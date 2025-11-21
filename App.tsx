
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import NavBar from './components/NavBar';
import Dashboard from './components/Dashboard';
import Chatbot from './components/Chatbot';
import Scanner from './components/Scanner';
import MyRecipes from './components/MyRecipes';
import Pantry from './components/Pantry';
import History from './components/History';
import MoreMenu from './components/MoreMenu';
import Stats from './components/Stats';
import PointsGuide from './components/PointsGuide';
import WellnessSettingsComp from './components/WellnessSettings';
import { AppTab } from './types';
import { initializeGemini } from './services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  
  // API Key Logic
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      initializeGemini(storedKey);
      setIsApiKeySet(true);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim().length > 10) {
      localStorage.setItem('gemini_api_key', apiKeyInput.trim());
      initializeGemini(apiKeyInput.trim());
      setIsApiKeySet(true);
    } else {
      alert("Por favor ingresa una API Key válida.");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.DASHBOARD:
        return <Dashboard />;
      case AppTab.CHAT:
        return <Chatbot />;
      case AppTab.HISTORY:
        return <History />;
      case AppTab.MENU:
        return <MoreMenu onNavigate={setActiveTab} />;
      
      // Sub-pages (Accessed via Menu)
      case AppTab.STATS:
        return <Stats />;
      case AppTab.PANTRY:
        return <Pantry />;
      case AppTab.RECIPES:
        return <MyRecipes />;
      case AppTab.SCANNER:
        return <Scanner />;
      case AppTab.POINTS_GUIDE:
        return <PointsGuide onBack={() => setActiveTab(AppTab.MENU)} />;
      case AppTab.WELLNESS_SETTINGS:
        return <WellnessSettingsComp />;
        
      default:
        return <Dashboard />;
    }
  };

  if (!isApiKeySet) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 border border-gray-100"
        >
          <div className="w-16 h-16 bg-nutri-green-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-6 shadow-lg">
            🚀
          </div>
          <h1 className="text-2xl font-black text-gray-800 text-center mb-2">Bienvenido a Level Up!</h1>
          <p className="text-gray-500 text-center text-sm mb-6">
            Tu asistente nutricional inteligente. Para comenzar, necesitamos tu llave de acceso personal.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Gemini API Key</label>
              <input 
                type="password" 
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Pega tu clave aquí..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-nutri-green-500 bg-white text-gray-900"
              />
            </div>
            
            <button 
              onClick={handleSaveApiKey}
              className="w-full bg-nutri-green-600 hover:bg-nutri-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[0.99]"
            >
              Comenzar Aventura
            </button>

            <div className="text-center pt-4 border-t border-gray-100 mt-4">
              <p className="text-xs text-gray-400 mb-1">¿No tienes una clave?</p>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-nutri-green-600 text-xs font-bold hover:underline flex items-center justify-center gap-1"
              >
                Obtener clave gratis en Google AI Studio ↗
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans relative transition-colors duration-200">
      <Header />
      
      <main className="max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
