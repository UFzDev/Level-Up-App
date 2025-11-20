
import React, { useState } from 'react';
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
import { AppTab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);

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
        
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans relative">
      <Header />
      
      <main className="max-w-lg mx-auto">
        {renderContent()}
      </main>

      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
