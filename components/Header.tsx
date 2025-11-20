import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-nutri-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
            🚀
          </div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight">Level Up!</h1>
        </div>
        <div className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
          80/20 Mode
        </div>
      </div>
    </header>
  );
};

export default Header;