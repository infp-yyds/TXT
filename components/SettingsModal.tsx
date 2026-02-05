
import React, { useState } from 'react';
import { AppSettings } from '../types';
import { X, Cpu, Globe, Key, Layers, ChevronDown, ChevronUp, Zap, Settings2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const BRAND_TEMPLATES = [
  { 
    id: 'gemini',
    label: 'Google Gemini', 
    provider: 'gemini' as const,
    model: 'gemini-3-pro-preview', 
    base: 'google',
    color: 'bg-blue-50 text-blue-600 border-blue-100'
  },
  { 
    id: 'deepseek',
    label: 'DeepSeek', 
    provider: 'openai' as const,
    model: 'deepseek-chat', 
    base: 'https://api.deepseek.com',
    color: 'bg-zinc-50 text-zinc-900 border-zinc-200'
  },
  { 
    id: 'zhipu',
    label: '智谱 ZhipuAI', 
    provider: 'openai' as const,
    model: 'glm-4', 
    base: 'https://open.bigmodel.cn/api/paas/v4',
    color: 'bg-purple-50 text-purple-600 border-purple-100'
  },
  { 
    id: 'qwen',
    label: '通义千问', 
    provider: 'openai' as const,
    model: 'qwen-max', 
    base: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100'
  },
  { 
    id: 'openai',
    label: 'OpenAI', 
    provider: 'openai' as const,
    model: 'gpt-4o', 
    base: 'https://api.openai.com/v1',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  }
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
  const [showAdvanced, setShowAdvanced] = useState(false);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleApplyTemplate = (template: typeof BRAND_TEMPLATES[0]) => {
    setLocalSettings({
      ...localSettings,
      provider: template.provider,
      modelName: template.model,
      apiKey: '', // Clear API key when applying a template, user should re-enter
      apiBaseUrl: template.base === 'google' ? localSettings.apiBaseUrl : template.base, // Keep Gemini base as-is, apply others
    });
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-900 text-white rounded-2xl shadow-lg shadow-zinc-200">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight">线团元丹</h2>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">能量核心配置</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh]">
          {/* Brand Selection */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Layers size={14} /> 核心模版 (Templates)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BRAND_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className={`px-4 py-3 rounded-2xl text-xs font-bold border transition-all duration-200 text-center ${
                    (localSettings.provider === tmpl.provider && 
                     (tmpl.provider === 'gemini' || localSettings.apiBaseUrl === tmpl.base))
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xl shadow-zinc-200 scale-[0.98]'
                      : `${tmpl.color} hover:shadow-md hover:scale-[1.02]`
                  }`}
                >
                  {tmpl.label}
                </button>
              ))}
              <button
                onClick={() => setLocalSettings({
                  ...localSettings, 
                  provider: 'openai', // Assuming custom means OpenAI-compatible
                  apiKey: '',         // Clear API key
                  apiBaseUrl: '',     // Clear Base URL
                  modelName: '',      // Clear Model name
                })}
                className={`px-4 py-3 rounded-2xl text-xs font-bold border transition-all duration-200 bg-white text-zinc-600 border-zinc-100 hover:border-zinc-300 ${
                    localSettings.provider === 'openai' && !BRAND_TEMPLATES.some(t => t.base === localSettings.apiBaseUrl) ? 'ring-2 ring-zinc-900' : ''
                }`}
              >
                自定义接入
              </button>
            </div>
          </div>

          {/* Critical Input: API Key */}
          <div className="space-y-4 p-6 bg-zinc-50 rounded-[1.5rem] border border-zinc-100">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Key size={14} /> 能源密钥 (API Key)
              </label>
              <div className="relative group">
                <input 
                  type="password"
                  disabled={localSettings.provider === 'gemini'}
                  value={localSettings.provider === 'gemini' ? '••••••••••••••••' : localSettings.apiKey}
                  onChange={(e) => setLocalSettings({...localSettings, apiKey: e.target.value})}
                  placeholder="在此注入密钥..."
                  className="w-full px-5 py-4 bg-white border border-zinc-200 rounded-2xl text-sm focus:ring-4 focus:ring-zinc-900/5 focus:border-zinc-900 outline-none transition-all disabled:opacity-50 font-mono"
                />
                {localSettings.provider === 'gemini' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-zinc-400 font-bold bg-white px-2">Gemini 由主系统托管</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="pt-2">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors uppercase tracking-widest"
            >
              <Settings2 size={14} />
              高级设置 (Advanced)
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAdvanced && (
              <div className="mt-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Globe size={14} /> 接入地址 (Base URL)
                  </label>
                  <input 
                    type="text"
                    disabled={localSettings.provider === 'gemini'}
                    value={localSettings.provider === 'gemini' ? 'Google Standard' : localSettings.apiBaseUrl}
                    onChange={(e) => setLocalSettings({...localSettings, apiBaseUrl: e.target.value})}
                    placeholder="https://api.your-provider.com/v1"
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm focus:border-zinc-900 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Cpu size={14} /> 模型标识 (Model ID)
                  </label>
                  <input 
                    type="text"
                    value={localSettings.modelName}
                    onChange={(e) => setLocalSettings({...localSettings, modelName: e.target.value})}
                    placeholder="e.g. gpt-4, glm-4, deepseek-chat"
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm focus:border-zinc-900 outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-8 py-6 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
            配置已锁定至本地浏览器
          </p>
          <button 
            onClick={handleSave}
            className="bg-zinc-900 text-white px-10 py-4 rounded-2xl text-sm font-bold hover:bg-zinc-800 active:scale-95 transition-all shadow-xl shadow-zinc-200"
          >
            同步元丹
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;