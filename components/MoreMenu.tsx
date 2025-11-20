
import React, { useRef } from 'react';
import { AppTab } from '../types';
import { exportFullData, importFullData } from '../services/storageService';

interface MoreMenuProps {
  onNavigate: (tab: AppTab) => void;
}

const MoreMenu: React.FC<MoreMenuProps> = ({ onNavigate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const menuItems = [
    {
      id: 'guide',
      label: 'Cómo sumar puntos',
      desc: 'Reglas del juego y valores XP',
      icon: 'ℹ️',
      action: () => onNavigate(AppTab.POINTS_GUIDE),
      color: 'bg-gray-100 text-gray-600'
    },
    {
      id: 'stats',
      label: 'Ver Estadísticas',
      desc: 'Gráficos de calorías y consistencia',
      icon: '📈',
      action: () => onNavigate(AppTab.STATS),
      color: 'bg-blue-50 text-blue-600'
    },
    {
        id: 'pantry',
        label: 'Mi Despensa',
        desc: 'Gestiona tus ingredientes',
        icon: '🍱',
        action: () => onNavigate(AppTab.PANTRY),
        color: 'bg-nutri-green-50 text-nutri-green-600'
    },
    {
        id: 'recipes',
        label: 'Mis Recetas',
        desc: 'Tus platos guardados',
        icon: '📖',
        action: () => onNavigate(AppTab.RECIPES),
        color: 'bg-purple-50 text-purple-600'
    },
    {
        id: 'scanner',
        label: 'Escáner Nutricional',
        desc: 'Analiza productos y refri',
        icon: '🔎',
        action: () => onNavigate(AppTab.SCANNER),
        color: 'bg-orange-50 text-orange-600'
    },
  ];

  const handleExport = () => {
    const data = exportFullData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `nutri-flex-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            const success = importFullData(json);
            if (success) {
                alert("¡Copia de seguridad restaurada con éxito! La aplicación se reiniciará.");
                window.location.reload();
            } else {
                alert("Error: El archivo no parece una copia de seguridad válida.");
            }
        } catch (error) {
            alert("Error al leer el archivo.");
        }
    };
    reader.readAsText(file);
    // Reset input value to allow re-selecting same file if needed
    e.target.value = ''; 
  };

  return (
    <div className="p-4 space-y-6 pb-24 animate-fadeIn">
      <div className="bg-white border-b border-gray-100 pb-4 mb-4 flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Menú</h2>
            <p className="text-gray-500 text-sm">Más herramientas para tu bienestar.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all text-left group"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${item.color} group-hover:scale-110 transition-transform`}>
              {item.icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{item.label}</h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
            <div className="ml-auto text-gray-300 group-hover:text-gray-400">
              ➜
            </div>
          </button>
        ))}
      </div>

      {/* DATA MANAGEMENT SECTION */}
      <div className="mt-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Zona de Datos</h3>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-2 grid grid-cols-2 gap-2">
              <button 
                onClick={handleExport}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                  <span className="text-2xl mb-1">💾</span>
                  <span className="text-xs font-bold text-gray-700">Exportar Backup</span>
              </button>
              
              <button 
                onClick={handleImportClick}
                className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                  <span className="text-2xl mb-1">📂</span>
                  <span className="text-xs font-bold text-gray-700">Restaurar Datos</span>
              </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
      </div>

      <div className="mt-8 text-center text-xs text-gray-400">
        <p>Nutri-Flex v11.0</p>
        <p>Tu Asistente 80/20</p>
      </div>
    </div>
  );
};

export default MoreMenu;
