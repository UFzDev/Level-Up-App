import React, { useState } from 'react';
import { searchNutritionInfo } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { SearchResult } from '../types';

const SearchTool: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await searchNutritionInfo(query);
      setResult({
        text: data.text || "No se encontraron resultados.",
        sources: data.sources || []
      });
    } catch (error) {
      alert("Error en la búsqueda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span className="text-2xl">🌐</span> Buscador Verificado
            </h2>
            <p className="text-gray-600 text-sm">
                Encuentra datos de nutrición actualizados y recetas específicas de la web usando Google Search.
            </p>
        </div>

        <div className="flex gap-2">
            <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ej: Beneficios de la chía..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
                {loading ? '...' : 'Buscar'}
            </button>
        </div>

        {result && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                 <div className="prose prose-blue max-w-none mb-6">
                    <ReactMarkdown>{result.text}</ReactMarkdown>
                </div>
                
                {result.sources.length > 0 && (
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-2">Fuentes:</h4>
                        <ul className="space-y-2">
                            {result.sources.map((source, idx) => (
                                <li key={idx}>
                                    <a 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        🔗 {source.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default SearchTool;
