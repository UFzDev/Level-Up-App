
import React from 'react';
import { AppTab } from '../types';

interface NavBarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const NavBar: React.FC<NavBarProps> = ({ activeTab, onTabChange }) => {
  // Primary navigation items
  const navItems = [
    { id: AppTab.DASHBOARD, label: 'Inicio', icon: '🏠' },
    { id: AppTab.CHAT, label: 'Chef', icon: '👨‍🍳' },
    { id: AppTab.HISTORY, label: 'Historial', icon: '📅' },
    { id: AppTab.MENU, label: 'Menú', icon: '🍔' },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 pb-safe z-50 shadow-lg">
      <div className="flex justify-between items-center h-16 w-full px-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex-1 flex flex-col items-center justify-center h-full transition-all active:scale-95 ${
              activeTab === item.id ? 'text-nutri-green-600 font-bold' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-2xl mb-0.5">{item.icon}</span>
            <span className="text-[10px] uppercase tracking-wide">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default NavBar;
