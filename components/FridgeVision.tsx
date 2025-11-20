import React, { useState, useRef } from 'react';
import { analyzeFridgeImage } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

const FridgeVision: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Basic validation
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen es demasiado grande. Máximo 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String);
        setResult(null); // Clear previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setLoading(true);
    try {
        // Extract pure base64 and mime type
        const matches = image.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error("Invalid image format");
        }
        const mimeType = matches[1];
        const base64Data = matches[2];

        const analysis = await analyzeFridgeImage(base64Data, mimeType);
        setResult(analysis);
    } catch (error) {
      alert("Hubo un error analizando la imagen. Intenta de nuevo.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setImage(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-nutri-green-100 text-nutri-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Sube una foto de tu refri</h2>
          <p className="text-sm text-gray-500 mt-1">
            Analizaremos los ingredientes y te daremos ideas.
          </p>
        </div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          id="fridge-upload"
        />

        {!image ? (
          <label
            htmlFor="fridge-upload"
            className="inline-flex items-center px-6 py-3 bg-nutri-green-600 text-white rounded-lg cursor-pointer hover:bg-nutri-green-700 transition-colors shadow-md"
          >
            Seleccionar Foto
          </label>
        ) : (
            <div className="space-y-4">
                 <div className="relative rounded-lg overflow-hidden max-h-64 mx-auto shadow-md border border-gray-200">
                    <img src={image} alt="Preview" className="w-full h-full object-contain bg-black" />
                    <button 
                        onClick={handleClear}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {!result && (
                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="w-full px-6 py-3 bg-nutri-orange-500 text-white rounded-lg font-medium hover:bg-nutri-orange-600 transition-colors shadow-md disabled:bg-gray-400"
                    >
                        {loading ? 'Analizando Ingredientes...' : 'Analizar y Sugerir Recetas'}
                    </button>
                )}
            </div>
        )}
      </div>

      {loading && (
          <div className="animate-pulse flex flex-col items-center space-y-4 py-8">
              <div className="h-2 bg-gray-200 rounded w-3/4"></div>
              <div className="h-2 bg-gray-200 rounded w-2/4"></div>
              <div className="h-2 bg-gray-200 rounded w-5/6"></div>
              <p className="text-sm text-nutri-green-600 font-medium">El Chef está mirando tu refri...</p>
          </div>
      )}

      {result && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Resultados del Chef</h3>
            <div className="prose prose-green max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
            </div>
            <button 
                onClick={handleClear}
                className="mt-6 w-full py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
                Intentar otra foto
            </button>
        </div>
      )}
    </div>
  );
};

export default FridgeVision;