import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Key, 
  Cpu, 
  FileUp, 
  Send, 
  Layers, 
  Copy, 
  Check, 
  ArrowLeftRight, 
  Scale, 
  HelpCircle, 
  History, 
  Trash2, 
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface AiStudioPlaygroundProps {
  onSwitchToWono: () => void;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  prompt: string;
  model: string;
  response: string;
  fileName?: string;
}

export const AiStudioPlayground: React.FC<AiStudioPlaygroundProps> = ({ onSwitchToWono }) => {
  // Settings & Core State
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_playground_key') || '');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [temperature, setTemperature] = useState(0.7);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Multimodal File State
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('gemini_playground_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Save API Key
  useEffect(() => {
    localStorage.setItem('gemini_playground_key', apiKey);
  }, [apiKey]);

  // Save History
  useEffect(() => {
    localStorage.setItem('gemini_playground_history', JSON.stringify(history));
  }, [history]);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const processFile = (selected: File) => {
    setFile(selected);
    setFileMimeType(selected.type);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setFileBase64(base64String.split(',')[1]);
      
      if (selected.type.startsWith('image/')) {
        setFilePreview(base64String);
      } else {
        setFilePreview(null);
      }
    };
    reader.readAsDataURL(selected);
  };

  const clearFile = () => {
    setFile(null);
    setFileBase64(null);
    setFileMimeType(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Run Generation
  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setResponse('');

    try {
      // Use local API Key if available, or fall back to system key
      const keyToUse = apiKey.trim() || import.meta.env.VITE_GEMINI_API_KEY || '';
      
      if (!keyToUse) {
        throw new Error(
          'Chave de API do Gemini não configurada. Por favor, insira sua chave no campo superior ou peça para o administrador configurar o arquivo .env.'
        );
      }

      // Initialize the official Google Gen AI Client
      const ai = new GoogleGenAI({ apiKey: keyToUse });
      
      const contents: any[] = [];
      const parts: any[] = [{ text: prompt }];

      if (fileBase64 && fileMimeType) {
        parts.push({
          inlineData: {
            mimeType: fileMimeType,
            data: fileBase64
          }
        });
      }

      contents.push({ parts });

      const result = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
          temperature: temperature,
        }
      });

      const responseText = result.text || 'Nenhum resultado retornado pelo modelo.';
      setResponse(responseText);

      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        prompt: prompt,
        model: model,
        response: responseText,
        fileName: file?.name
      };
      setHistory(prev => [newHistoryItem, ...prev]);

    } catch (err: any) {
      console.error(err);
      setResponse(`🔴 Erro na geração:\n\n${err.message || err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearHistory = () => {
    if (window.confirm('Tem certeza de que deseja limpar o histórico local?')) {
      setHistory([]);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setPrompt(item.prompt);
    setModel(item.model);
    setResponse(item.response);
  };

  const templates = [
    {
      title: 'Analisar Imagem',
      prompt: 'Descreva em detalhes o que você observa nesta imagem. Identifique textos, padrões, cores e possíveis significados.',
      icon: <ImageIcon className="w-4.5 h-4.5 text-amber-400" />
    },
    {
      title: 'Resumir Documento',
      prompt: 'Por favor, crie um resumo executivo estruturado com os pontos principais e lições essenciais do texto fornecido.',
      icon: <FileText className="w-4.5 h-4.5 text-blue-400" />
    },
    {
      title: 'Revisão Jurídica',
      prompt: 'Analise o texto a seguir em busca de inconsistências, ambiguidades e sugira melhorias com base no Código de Processo Civil brasileiro.',
      icon: <Scale className="w-4.5 h-4.5 text-emerald-400" />
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Dynamic Top Micro Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs z-10">
        <span className="flex items-center gap-2 text-amber-300 font-bold tracking-wide">
          <Sparkles className="w-4.5 h-4.5 text-amber-400 animate-pulse shrink-0" />
          ESTE É O COMPILADO DO GOOGLE AI STUDIO WEB STARTER PLAYGROUND
        </span>
        <button
          onClick={onSwitchToWono}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-1.5 rounded-xl transition cursor-pointer shadow-md shadow-amber-900/10 hover:scale-[1.02] text-xs uppercase"
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span>Acessar Wono Advocacia (Gestão)</span>
        </button>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Setup & Inputs */}
        <div className="lg:col-span-7 space-y-5 flex flex-col">
          
          {/* Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-amber-400 uppercase tracking-tight flex items-center gap-2">
              Google AI Studio Playground
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Desenvolva prompts, teste arquivos multimodais e interaja diretamente com os modelos avançados de IA da linha Gemini da Google.
            </p>
          </div>

          {/* Settings Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                Chave de API do Gemini
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Insira sua API Key obtida no AI Studio..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-3 py-2 text-xs text-slate-200"
              />
              <p className="text-[9px] text-slate-500">
                Sua chave fica armazenada com segurança localmente em seu navegador.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                Modelo Gemini
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-3 py-2 text-xs text-slate-200 cursor-pointer"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Veloz e Versátil)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Raciocínio Avançado)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Multimodal Clássico)</option>
              </select>
            </div>

            <div className="md:col-span-2 border-t border-slate-800/60 pt-3 flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Temperatura: {temperature}
              </span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-2/3 accent-amber-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Templates Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {templates.map((tpl, i) => (
              <button
                key={i}
                onClick={() => setPrompt(tpl.prompt)}
                className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-xl text-left transition cursor-pointer flex flex-col gap-1.5 text-xs group"
              >
                <span className="group-hover:scale-105 transition">{tpl.icon}</span>
                <span className="font-extrabold text-slate-200 group-hover:text-amber-300 transition">{tpl.title}</span>
                <span className="text-[10px] text-slate-500 line-clamp-2">{tpl.prompt}</span>
              </button>
            ))}
          </div>

          {/* Playground Interface Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex-1 flex flex-col">
            
            <div className="flex-1 flex flex-col space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Prompt / Instruções para o Gemini
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Escreva sua pergunta ou instrução para a IA aqui..."
                className="flex-1 w-full min-h-[140px] bg-slate-950 border border-slate-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 rounded-xl p-3 text-xs sm:text-sm text-slate-200 resize-none"
              />
            </div>

            {/* Multimodal Preview & Input Area */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,application/pdf,text/plain"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <FileUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>Anexar Arquivo</span>
                </button>
                
                {file && (
                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                    <span className="truncate max-w-[120px] font-bold">{file.name}</span>
                    <button onClick={clearFile} className="text-rose-400 hover:text-rose-300 cursor-pointer text-xs font-black">×</button>
                  </span>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black px-5 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-amber-900/10 disabled:shadow-none font-bold text-xs uppercase ml-auto"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Gerando...' : 'Gerar Resposta'}</span>
              </button>
            </div>

            {filePreview && (
              <div className="relative w-max max-w-full">
                <img
                  src={filePreview}
                  alt="Preview"
                  className="max-h-36 rounded-lg border border-slate-800 object-contain shadow-md"
                />
                <button
                  onClick={clearFile}
                  className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shadow cursor-pointer hover:bg-rose-600"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Response & Logs */}
        <div className="lg:col-span-5 flex flex-col space-y-5">
          
          {/* Response Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Resultado da Geração
              </span>
              
              {response && (
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition cursor-pointer flex items-center gap-1 text-[10px]"
                  title="Copiar Resposta"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[450px] pr-1.5 text-slate-300 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans scrollbar">
              {isGenerating ? (
                <div className="space-y-3 py-2">
                  <div className="h-4 bg-slate-800 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-slate-800 rounded animate-pulse"></div>
                  <div className="h-4 bg-slate-800 rounded w-5/6 animate-pulse"></div>
                  <p className="text-[10px] text-slate-500 animate-pulse mt-4 font-mono">
                    Conectando ao modelo {model} via Google API...
                  </p>
                </div>
              ) : response ? (
                response
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 py-10">
                  <Sparkles className="w-8 h-8 text-slate-700" />
                  <p className="text-xs">Escreva as instruções no painel e clique em gerar para ver o resultado.</p>
                </div>
              )}
            </div>
          </div>

          {/* Prompt History Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[220px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-amber-400" />
                Histórico Recente ({history.length})
              </span>
              
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[10px] text-rose-400 hover:text-rose-300 transition cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 scrollbar pr-1">
              {history.length === 0 ? (
                <p className="text-[10px] text-slate-500 font-bold uppercase text-center py-6">
                  Nenhum prompt disparado nesta sessão.
                </p>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="p-2 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-850 hover:border-slate-750 transition cursor-pointer text-left text-[10px] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-500 text-[9px] uppercase">{item.model}</span>
                      <span className="text-[8px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 font-medium truncate">{item.prompt}</p>
                    {item.fileName && (
                      <span className="text-[8px] text-slate-500 block truncate">📎 {item.fileName}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
