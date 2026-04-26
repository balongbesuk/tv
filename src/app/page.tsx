"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Search, 
  Menu, 
  Star, 
  RefreshCw, 
  Shield, 
  Download, 
  Tv, 
  Zap, 
  Layout, 
  ShieldCheck, 
  Loader2,
  X,
  ExternalLink,
  Copy,
  CheckCircle2,
  FileDown,
  Share2,
  Activity,
  Cpu,
  Sparkles,
  Radio,
  WifiOff,
  ChevronDown,
  Filter,
  Globe,
  Settings,
  Trash2,
  History,

  Settings2,
  Layers,
  ChevronRight,
  Info,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Channel, parseM3U } from '@/utils/iptv';

const STABLE_SOURCES = [
  { name: 'Indonesia (Utama)', url: 'https://iptv-org.github.io/iptv/languages/ind.m3u' },
  { name: 'Indonesia (Entertainment)', url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u' },
  { name: 'Movies & Cinema', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' },
  { name: 'Global (English)', url: 'https://iptv-org.github.io/iptv/languages/eng.m3u' },
  { name: 'News Channels', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
];

export default function Home() {
  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const stopScanRef = useRef(false);

  // --- State ---
  const [channels, setChannels] = useState<Channel[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [currentFilter, setCurrentFilter] = useState('Semua');
  const [currentGroup, setCurrentGroup] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [m3uUrl, setM3uUrl] = useState(STABLE_SOURCES[0].url);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'standby' | 'loading' | 'playing' | 'error'>('standby');
  const [isMounted, setIsMounted] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [playlistRaw, setPlaylistRaw] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [showSettings, setShowSettings] = useState(false);
  
  // Quality Selection States
  const [levels, setLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Auto-open sidebar on desktop
    if (window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
    
    const savedFavs = localStorage.getItem('vibestream_favs');
    const savedHistory = localStorage.getItem('vibestream_history');
    const savedUrl = localStorage.getItem('vibestream_url');

    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedUrl) setM3uUrl(savedUrl);

    loadPlaylist(savedUrl || STABLE_SOURCES[0].url);
    
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, []);

  // --- Actions ---
  const loadPlaylist = async (url: string) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const text = await response.text();
      setPlaylistRaw(text);
      const parsed = parseM3U(text);
      
      const cachedStatusRaw = localStorage.getItem('vibestream_status_cache');
      const cachedStatuses = cachedStatusRaw ? JSON.parse(cachedStatusRaw) : {};
      
      setChannels(parsed.map(c => ({ 
        ...c, 
        status: cachedStatuses[c.id] || 'unknown' 
      })));
      
      setM3uUrl(url);
      localStorage.setItem('vibestream_url', url);
    } catch (error: any) {
      console.error(error);
      setFetchError(error.message || 'Gagal memuat playlist');
    } finally {
      setIsLoading(false);
    }
  };



  const addToHistory = (id: string) => {
    const newHistory = [id, ...history.filter(h => h !== id)].slice(0, 15);
    setHistory(newHistory);
    localStorage.setItem('vibestream_history', JSON.stringify(newHistory));
  };

  const playChannel = async (channel: Channel) => {
    setCurrentChannel(channel);
    addToHistory(channel.id);
    setLevels([]);
    setCurrentLevel(-1);
    setStreamStatus('loading');
    
    const tryPlay = (url: string): Promise<boolean> => {
      return new Promise((resolve) => {
        let resolved = false;
        const safeResolve = (value: boolean) => {
          if (resolved) return;
          resolved = true;
          resolve(value);
        };

        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            manifestLoadingTimeOut: 10000,
            manifestLoadingMaxRetry: 1,
            fragLoadingTimeOut: 10000,
            levelLoadingTimeOut: 10000,
          });
          hlsRef.current = hls;

          hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
            if (!data.fatal) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              hls.destroy();
              hlsRef.current = null;
              if (resolved) setStreamStatus('error');
              else safeResolve(false);
            }
          });

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLevels(hls.levels);
            videoRef.current?.play().catch(() => {});
            safeResolve(true);
          });

          hls.on(Hls.Events.LEVEL_SWITCHED, (_: any, data: any) => {
            setCurrentLevel(data.level);
          });

          if (videoRef.current) {
            hls.attachMedia(videoRef.current);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
              hls.loadSource(url);
              hls.startLoad();
            });
          } else {
            safeResolve(false);
          }

          setTimeout(() => {
            if (!resolved) {
              hls.destroy();
              hlsRef.current = null;
              safeResolve(false);
            }
          }, 12000);

        } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = url;
          const onPlay = () => {
            videoRef.current?.removeEventListener('playing', onPlay);
            videoRef.current?.removeEventListener('error', onError);
            safeResolve(true);
          };
          const onError = () => {
            videoRef.current?.removeEventListener('playing', onPlay);
            videoRef.current?.removeEventListener('error', onError);
            safeResolve(false);
          };
          videoRef.current.addEventListener('playing', onPlay);
          videoRef.current.addEventListener('error', onError);
          videoRef.current.play().catch(() => safeResolve(false));
        } else {
          safeResolve(false);
        }
      });
    };

    const ok = await tryPlay(channel.url);
    if (ok) {
      setStreamStatus('playing');
      setActiveUrl(channel.url);
      updateChannelStatus(channel.id, 'online');
    } else {
      setStreamStatus('error');
      updateChannelStatus(channel.id, 'offline');
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavs = favorites.includes(id) 
      ? favorites.filter(fid => fid !== id) 
      : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('vibestream_favs', JSON.stringify(newFavs));
  };

  const updateChannelStatus = (id: string, status: Channel['status']) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    const cachedStatusRaw = localStorage.getItem('vibestream_status_cache');
    const cached = cachedStatusRaw ? JSON.parse(cachedStatusRaw) : {};
    cached[id] = status;
    localStorage.setItem('vibestream_status_cache', JSON.stringify(cached));
  };

  const scanChannels = async () => {
    if (isScanning) {
      stopScanRef.current = true;
      setIsScanning(false);
      return;
    }
    setIsScanning(true);
    stopScanRef.current = false;
    const targetChannels = [...channels];
    setScanProgress({ current: 0, total: targetChannels.length });
    
    const batchSize = 3;
    for (let i = 0; i < targetChannels.length; i += batchSize) {
      if (stopScanRef.current) break;
      const batch = targetChannels.slice(i, i + batchSize);
      setChannels(prev => prev.map(c => batch.some(b => b.id === c.id) ? { ...c, status: 'checking' } : c));
      
      const batchResults = await Promise.all(batch.map(async (ch) => {
        let found = false;
        try {
          const res = await fetch(ch.url, { method: 'HEAD', mode: 'no-cors' });
          if (res.type === 'opaque' || res.ok) found = true;
        } catch (e) {}
        return { id: ch.id, status: (found ? 'online' : 'offline') as Channel['status'] };
      }));

      batchResults.forEach(r => updateChannelStatus(r.id, r.status));
      setScanProgress(prev => ({ ...prev, current: i + batch.length }));
      await new Promise(r => setTimeout(r, 150));
    }
    setIsScanning(false);
  };

  const exportFavorites = () => {
    const favChannels = channels.filter(c => favorites.includes(c.id));
    if (favChannels.length === 0) return alert('Daftar favorit masih kosong.');
    
    let m3u = '#EXTM3U\n';
    favChannels.forEach(ch => {
      m3u += `#EXTINF:-1 tvg-logo="${ch.logo || ''}" group-title="${ch.groups?.join(';') || 'Lainnya'}",${ch.name}\n${ch.url}\n`;
    });
    const blob = new Blob([m3u], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vibestream_favorites.m3u';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };



  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    });
  };

  const openInVLC = () => {
    if (currentChannel) {
      const url = activeUrl || currentChannel.url;
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      if (isAndroid) {
        // More reliable Android Intent for VLC
        const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=${url.split(':')[0]};package=org.videolan.vlc;S.title=${encodeURIComponent(currentChannel.name)};end`;
        window.location.href = intentUrl;
      } else {
        // Standard VLC protocol for Desktop and iOS
        window.location.href = `vlc://${url}`;
      }
    }
  };

  const switchLevel = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentLevel(index);
      setShowQualityMenu(false);
    }
  };

  // --- Derived State ---
  const groups = useMemo(() => {
    const allGroups = channels.flatMap(c => c.groups || ['Lainnya']);
    const uniqueGroups = Array.from(new Set(allGroups));
    return ['Semua', ...uniqueGroups].sort();
  }, [channels]);

  const categoryFilters = [
    { name: 'Semua', icon: <Layout size={16} /> },
    { name: 'Favorit', icon: <Star size={16} className="text-amber-500" /> },
    { name: 'History', icon: <History size={16} className="text-blue-400" /> },
    { name: 'Stream Aktif', icon: <Radio size={16} className="text-green-500" /> },
    { name: 'Stream Mati', icon: <WifiOff size={16} className="text-red-500" /> },
  ];

  const filteredChannels = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return channels.filter(c => {
      const matchesSearch = query === '' || c.name.toLowerCase().includes(query);
      const matchesGroup = currentGroup === 'Semua' || (c.groups || ['Lainnya']).includes(currentGroup);
      
      let matchesCategory = false;
      switch (currentFilter) {
        case 'Semua': matchesCategory = true; break;
        case 'Favorit': matchesCategory = favorites.includes(c.id); break;
        case 'History': matchesCategory = history.includes(c.id); break;
        case 'Stream Aktif': matchesCategory = c.status === 'online'; break;
        case 'Stream Mati': matchesCategory = c.status === 'offline'; break;
        default: matchesCategory = true;
      }
      
      return matchesSearch && matchesGroup && matchesCategory;
    }).sort((a, b) => {
      if (currentFilter === 'History') return history.indexOf(a.id) - history.indexOf(b.id);
      return 0;
    });
  }, [channels, favorites, history, currentFilter, currentGroup, searchQuery]);

  if (!isMounted) return <div className="h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-[family-name:var(--font-outfit)]">
      {/* Navigation */}
      <nav className="h-16 px-4 md:px-8 flex items-center justify-between glass sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform">
            <Play className="fill-white text-white translate-x-0.5" size={20} />
          </div>
          <span className="text-lg md:text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500 group-hover:from-indigo-400 group-hover:to-white transition-all">VibeStream</span>
        </div>


        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative group/source">
            <button 
              onClick={() => {
                setShowSettings(!showSettings);
                setIsSidebarOpen(false);
              }}
              className="p-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-zinc-400 hover:text-indigo-400 hover:bg-white/[0.05] transition-all shadow-sm"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            
            {showSettings && (
              <div className="absolute right-0 top-full mt-3 w-72 bg-zinc-900/95 border border-white/10 rounded-3xl shadow-2xl z-[100] overflow-hidden backdrop-blur-2xl ring-1 ring-white/10">
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-500 uppercase tracking-[2px]">Settings & Playlist</span>
                  <button onClick={() => setShowSettings(false)} className="hover:text-red-400 transition-colors"><X size={16} /></button>
                </div>
                <div className="p-3 space-y-1.5">
                  {STABLE_SOURCES.map((source) => (
                    <button
                      key={source.url}
                      onClick={() => {
                        loadPlaylist(source.url);
                        setShowSettings(false);
                      }}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between group/item ${
                        m3uUrl === source.url 
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                        : 'hover:bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${m3uUrl === source.url ? 'bg-white' : 'bg-zinc-700'}`} />
                        <span>{source.name}</span>
                      </div>
                      <ChevronRight size={14} className={`opacity-0 group-hover/item:opacity-100 transition-all ${m3uUrl === source.url ? 'hidden' : ''}`} />
                    </button>
                  ))}
                  
                  <div className="p-3 mt-2 bg-black/20 rounded-2xl space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-600 block uppercase tracking-wider">Custom M3U URL</label>
                      <input 
                        type="text" 
                        placeholder="https://..."
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-[10px] outline-none focus:border-indigo-500/50 transition-all font-mono"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            loadPlaylist(e.currentTarget.value);
                            setShowSettings(false);
                          }
                        }}
                      />
                    </div>
                    <button 
                      onClick={() => {
                        localStorage.removeItem('vibestream_status_cache');
                        setChannels(prev => prev.map(c => ({ ...c, status: 'unknown' })));
                        setShowSettings(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 text-[10px] font-black hover:bg-red-500/10 transition-all uppercase tracking-widest"
                    >
                      <Trash2 size={12} />
                      Purge Cache
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2.5 bg-zinc-900 rounded-xl border border-white/5 text-zinc-400 hover:text-indigo-400 transition-all active:scale-90"
            title="Toggle Explorer"
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      <div className="flex flex-1 relative">
        {/* Sidebar */}
        <aside className={`
          fixed md:sticky top-16 z-50 bg-zinc-950/95 md:bg-zinc-950/40 backdrop-blur-3xl
          w-80 h-[calc(100vh-64px)] border-r border-white/5 flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 md:w-0 md:border-none'}
        `}>
          <div className="p-4 md:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-[11px] uppercase tracking-[3px] font-black text-zinc-500">Explorer</h3>
                {isScanning && (
                  <span className="text-[10px] text-indigo-400 font-bold animate-pulse mt-0.5">
                    Analyzing: {Math.round((scanProgress.current / scanProgress.total) * 100)}%
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={scanChannels}
                  className={`p-2 border rounded-xl transition-all shadow-sm ${
                    isScanning 
                    ? 'bg-red-500/10 border-red-500/50 text-red-500 animate-pulse' 
                    : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/30'
                  }`}
                  title={isScanning ? "Abort Scan" : "Full Health Check"}
                >
                  {isScanning ? <X size={16} /> : <Activity size={16} />}
                </button>
                <button 
                  onClick={exportFavorites}
                  className="p-2 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-amber-500 transition-all"
                  title="Export Favorites"
                >
                  <Share2 size={16} />
                </button>
                
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 bg-white/[0.03] border border-white/5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all md:hidden"
                  title="Close Sidebar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative flex-1 group/search">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/search:text-indigo-400 transition-colors pointer-events-none" size={16} />
                <input 
                  type="text" 
                  placeholder="Search channels..."
                  className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] transition-all text-sm placeholder:text-zinc-600 shadow-inner font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Category Dropdown */}
              <div className="relative group/cat">
                <button 
                  onClick={() => {
                    setShowCategoryMenu(!showCategoryMenu);
                    setShowGroupMenu(false);
                  }}
                  className={`p-3 rounded-2xl border transition-all ${
                    currentFilter !== 'Semua' 
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                    : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/30'
                  }`}
                  title="Filter Category"
                >
                  {categoryFilters.find(f => f.name === currentFilter)?.icon || <Filter size={18} />}
                </button>

                {showCategoryMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl py-2 z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {categoryFilters.map((filter) => (
                        <button
                          key={filter.name}
                          onClick={() => {
                            setCurrentFilter(filter.name);
                            setShowCategoryMenu(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                            currentFilter === filter.name 
                            ? 'bg-indigo-500/10 text-indigo-400' 
                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="scale-90 opacity-70">{filter.icon}</div>
                          <span className="text-[10px] font-black uppercase tracking-widest">{filter.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Group Dropdown */}
              <div className="relative group/grp">
                <button 
                  onClick={() => {
                    setShowGroupMenu(!showGroupMenu);
                    setShowCategoryMenu(false);
                  }}
                  className={`p-3 rounded-2xl border transition-all ${
                    currentGroup !== 'Semua' 
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                    : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/30'
                  }`}
                  title="Filter Group"
                >
                  <Layers size={18} />
                </button>

                {showGroupMenu && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl py-2 z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-4 py-2 border-b border-white/5 mb-1">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pilih Grup</span>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                      {groups.map((group) => (
                        <button
                          key={group}
                          onClick={() => {
                            setCurrentGroup(group);
                            setShowGroupMenu(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                            currentGroup === group 
                            ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500' 
                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest truncate">{group}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isScanning && (
              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" 
                  style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-32 md:pb-12 space-y-2.5 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-600 gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <span className="text-xs font-black uppercase tracking-widest">Syncing Playlist...</span>
              </div>
            ) : filteredChannels.length > 0 ? (
              filteredChannels.map((ch, idx) => (
                <div 
                  key={`${ch.id}-${idx}`}
                  onClick={() => {
                    playChannel(ch);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`group flex items-center gap-4 p-3.5 rounded-2xl cursor-pointer transition-all border ${
                    currentChannel?.id === ch.id 
                    ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5 translate-x-1' 
                    : 'bg-white/[0.01] border-transparent hover:bg-white/[0.04] hover:translate-x-1'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-sm group-hover:scale-105 transition-transform">
                    {ch.logo ? (
                      <img src={ch.logo} alt="" className="w-full h-full object-contain p-1" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <Tv size={20} className="text-zinc-700" />
                    )}
                    {ch.status && ch.status !== 'unknown' && (
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-[3px] border-zinc-950 rounded-full ${
                        ch.status === 'online' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 
                        ch.status === 'offline' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 
                        'bg-amber-500 animate-pulse'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-sm font-black truncate tracking-tight ${currentChannel?.id === ch.id ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                        {ch.name}
                      </h4>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate mt-0.5">{ch.groups?.join(', ') || 'Lainnya'}</p>
                  </div>
                  <button 
                    onClick={(e) => toggleFavorite(ch.id, e)}
                    className={`p-2 rounded-lg transition-all ${favorites.includes(ch.id) ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-700 hover:text-amber-500 hover:bg-white/5'}`}
                  >
                    <Star size={16} fill={favorites.includes(ch.id) ? "currentColor" : "none"} />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-700 space-y-4 border-2 border-dashed border-white/5 rounded-3xl">
                <Search size={32} className="opacity-20" />
                <span className="text-[10px] font-black uppercase tracking-widest">No Channels Found</span>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-black/20 relative">
          <div className={`flex-1 p-0 md:p-4 pb-28 md:pb-4 flex flex-col ${!currentChannel ? 'justify-center' : ''}`}>
            <div className={`max-w-[1600px] mx-auto w-full p-4 md:p-6 ${!currentChannel ? 'py-12' : 'space-y-8'}`}>
              {/* Player Section - Maximized */}
              <div className="relative w-full group/player">
                <div className="relative aspect-video w-full bg-black rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] border border-white/5">
                  {currentChannel ? (
                    <>
                      <video 
                        ref={videoRef} 
                        className="w-full h-full object-contain"
                        controls
                        playsInline
                      />
                      
                      {/* Custom Player Overlays */}
                      {streamStatus === 'loading' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10">
                          <div className="relative">
                            <Loader2 className="animate-spin text-indigo-500" size={48} />
                            <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse" />
                          </div>
                          <p className="mt-6 text-sm font-black uppercase tracking-[0.3em] text-white animate-pulse">
                            Buffering Stream...
                          </p>
                        </div>
                      )}

                      {streamStatus === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-xl z-[35] p-4 md:p-8 text-center animate-in fade-in zoom-in duration-300">
                          <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4 md:mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                            <WifiOff className="text-red-500 w-6 h-6 md:w-10 md:h-10" />
                          </div>
                          <h3 className="text-lg md:text-xl font-black text-white mb-1 md:mb-2 uppercase tracking-tight">Stream Unavailable</h3>
                          <p className="text-zinc-500 text-[10px] md:text-sm max-w-[200px] md:max-w-xs mb-6 md:mb-8 leading-relaxed font-medium">
                            This channel is currently offline or unreachable. Please try using "Watch in VLC" for better compatibility.
                          </p>
                          <button 
                            onClick={() => playChannel(currentChannel)}
                            className="px-6 py-2.5 md:px-8 md:py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95"
                          >
                            Retry Connection
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-8 text-center bg-[#09090b]">
                      {/* Subtlest Glow */}
                      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
                      
                      <div className="relative z-10 space-y-3 md:space-y-8 animate-in fade-in zoom-in duration-1000">
                        {/* Elegant Play Icon */}
                        <div className="mx-auto w-12 h-12 md:w-32 md:h-32 rounded-xl md:rounded-[2.5rem] bg-white/[0.03] border border-white/10 flex items-center justify-center relative group">
                          <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Play className="text-white fill-white/20 translate-x-0.5 md:translate-x-1" size={window?.innerWidth < 768 ? 18 : 48} />
                        </div>

                        <div className="space-y-1.5 md:space-y-4">
                          <h2 className="text-xl md:text-5xl font-black text-white tracking-tighter">
                            Ready to <span className="text-indigo-400">Stream</span>
                          </h2>
                          <p className="text-zinc-500 text-[9px] md:text-base max-w-[180px] md:max-w-sm mx-auto leading-relaxed font-medium">
                            Select a channel from the explorer to begin your premium viewing experience.
                          </p>
                        </div>

                        <div className="pt-1.5 md:pt-4">
                          <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="inline-flex items-center gap-2 md:gap-3 px-5 py-2.5 md:px-8 md:py-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl md:rounded-2xl transition-all active:scale-95 group"
                          >
                            <Search size={12} className="text-indigo-400 md:w-[18px] md:h-[18px]" />
                            <span className="text-[9px] md:text-xs font-black uppercase tracking-widest">Open Explorer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {currentChannel && (
                  /* Quality Selector Button - TOP RIGHT (Outside overflow-hidden) */
                  <div className="absolute top-4 right-4 md:top-8 md:right-8 z-30 flex gap-2">
                    <div className="relative">
                      <button 
                        onClick={() => setShowQualityMenu(!showQualityMenu)}
                        className="p-2.5 md:p-4 bg-black/60 hover:bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl text-white transition-all active:scale-95 shadow-2xl group/btn"
                        title="Stream Quality"
                      >
                        <Settings2 size={18} className="md:w-5 md:h-5" />
                        {levels.length > 0 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />}
                      </button>
                      
                      {showQualityMenu && levels.length > 0 && (
                        <div className="absolute top-full right-0 mt-3 w-48 bg-zinc-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl py-2 z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                          <div className="px-4 py-2 border-b border-white/5 mb-1">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Quality Levels</span>
                          </div>
                          <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            <button
                              onClick={() => switchLevel(-1)}
                              className={`w-full text-left px-4 py-3 text-xs font-bold transition-all flex items-center justify-between ${
                                currentLevel === -1 ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              Auto Quality
                              {currentLevel === -1 && <CheckCircle2 size={14} />}
                            </button>
                            {levels.map((level, idx) => (
                              <button
                                key={idx}
                                onClick={() => switchLevel(idx)}
                                className={`w-full text-left px-4 py-3 text-xs font-bold transition-all flex items-center justify-between ${
                                  currentLevel === idx ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                {level.height ? `${level.height}p` : `Level ${idx + 1}`}
                                {currentLevel === idx && <CheckCircle2 size={14} />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                )}
              </div>

            {/* Info Section */}
            {currentChannel && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                        {currentChannel.groups?.join(', ') || 'General'}
                      </span>
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter">{currentChannel.name}</h1>
                    <p className="text-zinc-500 text-lg font-medium italic">"Enjoy your stream on VibeStream Premium."</p>
                    
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/5 text-xs font-bold text-zinc-400">
                        <div className={`w-2 h-2 rounded-full ${streamStatus === 'playing' ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-600'}`} />
                        {streamStatus.toUpperCase()} STREAM
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto px-4 sm:px-0">
                    <button 
                      onClick={() => copyToClipboard(activeUrl || currentChannel.url)}
                      className="flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 w-full sm:w-auto min-w-[140px]"
                    >
                      {copying ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                      {copying ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button 
                      onClick={openInVLC}
                      className="flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 w-full sm:w-auto min-w-[140px]"
                    >
                      <ExternalLink size={16} />
                      Watch in VLC
                    </button>
                    <button 
                      onClick={() => playChannel(currentChannel)}
                      className="flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 w-full sm:w-auto min-w-[160px]"
                    >
                      <RefreshCw size={16} className={streamStatus === 'loading' ? 'animate-spin' : ''} />
                      Refresh Stream
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 hover:bg-white/[0.04] transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm uppercase tracking-widest mb-1">Encrypted Stream</h4>
                      <p className="text-zinc-500 text-xs leading-relaxed">Secure end-to-end HLS streaming protection.</p>
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 hover:bg-white/[0.04] transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm uppercase tracking-widest mb-1">Low Latency</h4>
                      <p className="text-zinc-500 text-xs leading-relaxed">Optimized buffer for near real-time playback.</p>
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 hover:bg-white/[0.04] transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm uppercase tracking-widest mb-1">HD Quality</h4>
                      <p className="text-zinc-500 text-xs leading-relaxed">Crystal clear resolution with adaptive bitrate streaming.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </main>
      </div>

      {/* Global Status Bar (Natural Scrolling) */}
      <footer className="min-h-10 py-6 pb-32 md:pb-8 px-6 bg-zinc-950 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0 mt-auto">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8">
          <div className="flex items-center gap-2.5 text-zinc-500">
            <Radio size={14} className="text-indigo-400" />
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest">{channels.length} Channels</span>
          </div>
          <div className="hidden md:block h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2.5 text-zinc-500">
            <Activity size={14} className="text-green-500" />
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest">System Operational</span>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-600">
          <span className="opacity-50 md:opacity-100 tracking-[0.2em]">&copy; 2026 VIBESTREAM PREMIUM</span>
          <div className="flex items-center gap-2 text-indigo-500/40 md:text-indigo-500/50">
            <Zap size={12} fill="currentColor" />
            <span>High Speed Engine</span>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] md:hidden px-4 pb-6 pt-2 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 flex items-center justify-around shadow-2xl pointer-events-auto">
          <button 
            onClick={() => {
              setCurrentChannel(null);
              setCurrentFilter('Semua');
              setCurrentGroup('Semua');
              setSearchQuery('');
              setIsSidebarOpen(false);
              setShowSettings(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex flex-col items-center gap-1 p-2 text-zinc-500 hover:text-white transition-all"
          >
            <Tv size={20} className={!isSidebarOpen && currentFilter !== 'Favorites' ? 'text-indigo-400' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
          </button>

          <button 
            onClick={() => {
              if (currentFilter === 'Favorit') {
                setCurrentFilter('Semua');
              } else {
                setCurrentFilter('Favorit');
                setIsSidebarOpen(true);
              }
              setShowSettings(false);
            }}
            className="flex flex-col items-center gap-1 p-2 text-zinc-500 hover:text-white transition-all"
          >
            <Star size={20} className={currentFilter === 'Favorit' ? 'text-amber-500' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">Saved</span>
          </button>
          
          <button 
            onClick={() => {
              setIsSidebarOpen(!isSidebarOpen);
              setShowSettings(false);
            }}
            className="flex flex-col items-center gap-1 p-2 text-zinc-500 hover:text-white transition-all"
          >
            <Search size={20} className={isSidebarOpen ? 'text-indigo-400' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">Explorer</span>
          </button>


          <button 
            onClick={() => {
              setShowSettings(!showSettings);
              setIsSidebarOpen(false);
            }}
            className="flex flex-col items-center gap-1 p-2 text-zinc-500 hover:text-white transition-all"
          >
            <Settings size={20} className={showSettings ? 'text-indigo-400' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">Setup</span>
          </button>
        </div>
      </div>
    </div>
  );
}
