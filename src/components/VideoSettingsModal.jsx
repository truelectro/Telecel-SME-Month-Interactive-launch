import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Video, 
  Database, 
  Check, 
  RotateCcw, 
  ExternalLink, 
  Play, 
  Eye, 
  Layers,
  Sparkles,
  Link2,
  FolderOpen
} from 'lucide-react';
import { 
  getVideoConfig, 
  saveVideoConfig, 
  resetVideoConfig, 
  buildSupabasePublicUrl 
} from '../utils/videoService';

export default function VideoSettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'supabase'

  // Form State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [bucket, setBucket] = useState('launch-videos');
  const [video1Path, setVideo1Path] = useState('video1.mp4');
  const [video2Path, setVideo2Path] = useState('video2.mp4');
  const [video1Url, setVideo1Url] = useState('');
  const [video2Url, setVideo2Url] = useState('');
  const [video1Title, setVideo1Title] = useState('TELECEL SME MONTH • LAUNCH VIDEO');
  const [video2Title, setVideo2Title] = useState('TELECEL SME SOLUTIONS • SPOTLIGHT');

  const [previewVideoUrl, setPreviewVideoUrl] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load existing config on open
  useEffect(() => {
    if (isOpen) {
      const cfg = getVideoConfig();
      setSupabaseUrl(cfg.supabaseUrl || '');
      setSupabaseAnonKey(cfg.supabaseAnonKey || '');
      setBucket(cfg.bucket || 'launch-videos');
      setVideo1Path(cfg.video1Path || 'video1.mp4');
      setVideo2Path(cfg.video2Path || 'video2.mp4');
      setVideo1Url(cfg.directVideo1Url || '');
      setVideo2Url(cfg.directVideo2Url || '');
      setVideo1Title(cfg.video1.title);
      setVideo2Title(cfg.video2.title);
      setPreviewVideoUrl(null);
      setSavedSuccess(false);

      if (cfg.directVideo1Url || cfg.directVideo2Url) {
        setActiveTab('direct');
      } else if (cfg.supabaseUrl) {
        setActiveTab('supabase');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Compute live resolved Supabase URLs for preview
  const resolvedSupabase1 = buildSupabasePublicUrl(supabaseUrl, bucket, video1Path);
  const resolvedSupabase2 = buildSupabasePublicUrl(supabaseUrl, bucket, video2Path);

  const effectiveVideo1 = video1Url.trim() || resolvedSupabase1 || getVideoConfig().video1.url;
  const effectiveVideo2 = video2Url.trim() || resolvedSupabase2 || getVideoConfig().video2.url;

  const handleSave = (e) => {
    e?.preventDefault?.();
    const newConfig = {
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      bucket: bucket.trim(),
      video1Path: video1Path.trim(),
      video2Path: video2Path.trim(),
      video1Url: video1Url.trim(),
      video2Url: video2Url.trim(),
      video1Title: video1Title.trim(),
      video2Title: video2Title.trim(),
    };
    saveVideoConfig(newConfig);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    if (window.confirm('Reset video configuration to system defaults?')) {
      resetVideoConfig();
      const cfg = getVideoConfig();
      setSupabaseUrl('');
      setSupabaseAnonKey('');
      setBucket('launch-videos');
      setVideo1Path('video1.mp4');
      setVideo2Path('video2.mp4');
      setVideo1Url('');
      setVideo2Url('');
      setVideo1Title(cfg.video1.title);
      setVideo2Title(cfg.video2.title);
      setPreviewVideoUrl(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-rajdhani">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#22070e] via-[#140307] to-[#0d0205] border-2 border-[#ff1f43] rounded-2xl shadow-[0_0_50px_rgba(255,31,67,0.5)] sci-fi-cut flex flex-col max-h-[90vh] overflow-hidden text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#4d131d] bg-[#2d0a14]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#ff1f43]/20 border border-[#ff1f43] flex items-center justify-center">
              <Video size={16} className="text-[#ff1f43]" />
            </div>
            <div className="flex flex-col">
              <span className="font-orbitron font-black text-sm sm:text-base tracking-wider uppercase text-white drop-shadow-[0_0_8px_#ff1f43]">
                STAGE AV & SUPABASE VIDEO CONFIG
              </span>
              <span className="text-[10px] text-[#ff8095]">
                Configure the 2 videos playing immediately after launch confetti
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#20050b] border border-[#521520] hover:border-[#ff1f43] text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-[#3b0f17] bg-[#120306] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === 'direct'
                ? 'bg-[#ff1f43] text-white border-white shadow-[0_0_12px_#ff1f43]'
                : 'bg-[#1e050b] text-[#ff8095] border-[#47121b] hover:border-[#ff1f43]'
            }`}
          >
            <Link2 size={13} />
            <span>Direct Video URLs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === 'supabase'
                ? 'bg-[#ff1f43] text-white border-white shadow-[0_0_12px_#ff1f43]'
                : 'bg-[#1e050b] text-[#ff8095] border-[#47121b] hover:border-[#ff1f43]'
            }`}
          >
            <Database size={13} />
            <span>Supabase Storage Bucket</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-[#ff1f43]/40">
          
          {/* TAB 1: DIRECT VIDEO URLS */}
          {activeTab === 'direct' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-[#180408] border border-[#4d131d] rounded-xl p-3 text-xs text-[#ffccd5]">
                <span className="font-bold text-white uppercase block mb-1">
                  💡 Supabase Public Storage Tip:
                </span>
                You can upload your MP4 videos to a public Supabase Storage bucket, click <strong className="text-white">"Get URL"</strong> in Supabase, and paste the direct URLs below.
              </div>

              {/* Video 1 URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-orbitron font-bold text-[#ff8095] uppercase tracking-wider flex items-center justify-between">
                  <span>VIDEO 1 URL (Plays First Right After Confetti)</span>
                  <span className="text-[9px] text-green-400 font-mono">MP4 / WebM</span>
                </label>
                <input
                  type="url"
                  value={video1Url}
                  onChange={(e) => setVideo1Url(e.target.value)}
                  placeholder="https://your-project.supabase.co/storage/v1/object/public/videos/video1.mp4"
                  className="w-full bg-[#0d0205] border-2 border-[#521520] focus:border-[#ff1f43] rounded-xl px-3 py-2 text-white font-mono text-xs outline-none transition-colors"
                />
                <div className="flex items-center justify-between pt-1">
                  <input
                    type="text"
                    value={video1Title}
                    onChange={(e) => setVideo1Title(e.target.value)}
                    placeholder="Video 1 Title (e.g. Telecel SME Month Launch Video)"
                    className="w-[70%] bg-[#120306] border border-[#3b0f17] focus:border-[#ff1f43] rounded-lg px-2.5 py-1 text-[11px] text-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewVideoUrl(effectiveVideo1);
                      setPreviewTitle(video1Title);
                    }}
                    className="px-2.5 py-1 bg-[#330c14] border border-[#ff1f43] text-[#ff8095] hover:text-white rounded-lg text-[10px] font-orbitron font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={12} />
                    <span>PREVIEW 1</span>
                  </button>
                </div>
              </div>

              {/* Video 2 URL */}
              <div className="space-y-1.5 pt-2 border-t border-[#3b0f17]">
                <label className="text-[11px] font-orbitron font-bold text-[#ff8095] uppercase tracking-wider flex items-center justify-between">
                  <span>VIDEO 2 URL (Plays Automatically After Video 1)</span>
                  <span className="text-[9px] text-green-400 font-mono">MP4 / WebM</span>
                </label>
                <input
                  type="url"
                  value={video2Url}
                  onChange={(e) => setVideo2Url(e.target.value)}
                  placeholder="https://your-project.supabase.co/storage/v1/object/public/videos/video2.mp4"
                  className="w-full bg-[#0d0205] border-2 border-[#521520] focus:border-[#ff1f43] rounded-xl px-3 py-2 text-white font-mono text-xs outline-none transition-colors"
                />
                <div className="flex items-center justify-between pt-1">
                  <input
                    type="text"
                    value={video2Title}
                    onChange={(e) => setVideo2Title(e.target.value)}
                    placeholder="Video 2 Title (e.g. Telecel SME Solutions Spotlight)"
                    className="w-[70%] bg-[#120306] border border-[#3b0f17] focus:border-[#ff1f43] rounded-lg px-2.5 py-1 text-[11px] text-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewVideoUrl(effectiveVideo2);
                      setPreviewTitle(video2Title);
                    }}
                    className="px-2.5 py-1 bg-[#330c14] border border-[#ff1f43] text-[#ff8095] hover:text-white rounded-lg text-[10px] font-orbitron font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={12} />
                    <span>PREVIEW 2</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUPABASE STORAGE BUCKET CONFIG */}
          {activeTab === 'supabase' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-orbitron font-bold text-[#ff8095] uppercase">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full bg-[#0d0205] border-2 border-[#521520] focus:border-[#ff1f43] rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-orbitron font-bold text-[#ff8095] uppercase">
                    Storage Bucket Name
                  </label>
                  <input
                    type="text"
                    value={bucket}
                    onChange={(e) => setBucket(e.target.value)}
                    placeholder="launch-videos"
                    className="w-full bg-[#0d0205] border-2 border-[#521520] focus:border-[#ff1f43] rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-orbitron font-bold text-[#ff8095] uppercase">
                    Video 1 File Path in Bucket
                  </label>
                  <input
                    type="text"
                    value={video1Path}
                    onChange={(e) => setVideo1Path(e.target.value)}
                    placeholder="video1.mp4"
                    className="w-full bg-[#0d0205] border-2 border-[#521520] focus:border-[#ff1f43] rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-orbitron font-bold text-[#ff8095] uppercase">
                    Video 2 File Path in Bucket
                  </label>
                  <input
                    type="text"
                    value={video2Path}
                    onChange={(e) => setVideo2Path(e.target.value)}
                    placeholder="video2.mp4"
                    className="w-full bg-[#0d0205] border-2 border-[#521520] focus:border-[#ff1f43] rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
                  />
                </div>
              </div>

              {/* Resolved Preview URLs */}
              {supabaseUrl && bucket && (
                <div className="bg-[#150307] border border-[#4d131d] rounded-xl p-2.5 text-[10px] font-mono text-[#ff8095] space-y-1 truncate">
                  <div className="truncate">
                    <span className="text-gray-400">Resolved Video 1: </span>
                    <span className="text-white">{resolvedSupabase1}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-gray-400">Resolved Video 2: </span>
                    <span className="text-white">{resolvedSupabase2}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inline Video Preview Box (if user clicked Preview) */}
          {previewVideoUrl && (
            <div className="bg-black border-2 border-[#ff1f43] rounded-xl p-3 flex flex-col items-center gap-2 shadow-[0_0_25px_rgba(255,31,67,0.4)] animate-scale-up">
              <div className="flex items-center justify-between w-full text-xs font-orbitron font-bold text-white">
                <span className="truncate">{previewTitle || 'TEST VIDEO PREVIEW'}</span>
                <button
                  type="button"
                  onClick={() => setPreviewVideoUrl(null)}
                  className="text-[#ff8095] hover:text-white text-[10px] uppercase font-mono cursor-pointer"
                >
                  ✕ Close Preview
                </button>
              </div>
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full max-h-48 rounded-lg bg-black object-contain"
              />
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#4d131d] bg-[#1a0409] shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl border border-[#521520] hover:border-red-500 text-xs font-orbitron text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>RESET DEFAULTS</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-[#521520] text-xs font-orbitron text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              CANCEL
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-[#941026] via-[#ff1f43] to-[#941026] hover:from-[#b01430] hover:via-[#ff3d5e] hover:to-[#b01430] text-white font-orbitron font-bold text-xs uppercase tracking-wider shadow-neon-red flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              {savedSuccess ? <Check size={14} className="text-green-300" /> : <Sparkles size={14} />}
              <span>{savedSuccess ? 'SAVED!' : 'APPLY & SAVE'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
