import React, { useState, useRef } from 'react';
import { analyzeFridgeImage, analyzeProductLabel } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

type ScanMode = 'fridge' | 'label';

const Scanner: React.FC = () => {
  const [mode, setMode] = useState<ScanMode>('label');
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("Máximo 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    try {
        const matches = image.match(/^data:(.+);base64,(.+)$/);
        if (!matches) throw new Error("Invalid image");
        
        const mimeType = matches[1];
        const base64Data = matches[2];

        let analysis = "";
        if (mode === 'fridge') {
            analysis = await analyzeFridgeImage(base64Data, mimeType);
        } else {
            analysis = await analyzeProductLabel(base64Data, mimeType);
        }
        setResult(analysis);
    } catch (error) {
      alert("Error analizando imagen.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setImage(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 space-y-6 pb-24">
        {/* Mode Toggle */}
        <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
            <button 
                onClick={() => { setMode('fridge'); handleClear(); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'fridge' ? 'bg-nutri-green-100 text-nutri-green-700' : 'text-gray-500'}`}
            >
                📸 Refrigerador
            </button>
            <button 
                onClick={() => { setMode('label'); handleClear(); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'label' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
            >
                🏷️ Etiqueta Super
            </button>
        </div>

        <div className={`border rounded-xl p-6 shadow-sm text-center ${mode === 'fridge' ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-100'}`}>
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                    {mode === 'fridge' ? 'Análisis de Despensa' : 'Escáner "¿Lo Compro?"'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {mode === 'fridge' ? 'Sube una foto de tus ingredientes.' : 'Sube la tabla nutricional. Te diré si cumple el 80/20.'}
                </p>
            </div>

            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                id="scanner-upload"
            />

            {!image ? (
                <label
                    htmlFor="scanner-upload"
                    className={`inline-flex items-center px-6 py-3 text-white rounded-lg cursor-pointer shadow-md transition-colors ${mode === 'fridge' ? 'bg-nutri-green-600 hover:bg-nutri-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {mode === 'fridge' ? 'Foto de Refri' : 'Foto de Etiqueta'}
                </label>
            ) : (
                <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden max-h-64 mx-auto shadow-md">
                        <img src={image} alt="Preview" className="w-full h-full object-contain bg-black" />
                        <button onClick={handleClear} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full">✕</button>
                    </div>
                    {!result && (
                        <button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className={`w-full px-6 py-3 text-white rounded-lg font-medium shadow-md ${mode === 'fridge' ? 'bg-nutri-orange-500 hover:bg-nutri-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                        >
                            {loading ? 'Analizando...' : 'Analizar Ahora'}
                        </button>
                    )}
                </div>
            )}
        </div>

        {result && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
                    {mode === 'fridge' ? 'Ideas del Chef' : 'Veredicto Nutricional'}
                </h3>
                <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{result}</ReactMarkdown>
                </div>
                <button onClick={handleClear} className="mt-6 w-full py-2 border border-gray-300 rounded-lg text-gray-600">
                    Nuevo Escaneo
                </button>
            </div>
        )}
    </div>
  );
};

export default Scanner;