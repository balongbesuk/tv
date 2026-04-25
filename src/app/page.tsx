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
  Radio,
  WifiOff,
  ChevronDown,
  Filter,
  Globe,
  Settings,
  Trash2
} from 'lucide-react';
import { Channel, parseM3U } from '@/utils/iptv';

const STABLE_SOURCES = [
  { name: 'Indonesia (Utama)', url: 'https://iptv-org.github.io/iptv/languages/ind.m3u' },
  { name: 'Indonesia (Entertainment)', url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u' },
  { name: 'Movies & Cinema', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' },
  { name: 'Global (English)', url: 'https://iptv-org.github.io/iptv/languages/eng.m3u' },
  { name: 'News Channels', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
];

const PROXIES = [
  { name: 'AllOrigins', url: 'https://api.allorigins.win/raw?url=' },
  { name: 'CorsProxy.io', url: 'https://corsproxy.io/?' },
  { name: 'ThingProxy', url: 'https://thingproxy.freeboard.io/fetch/' },
];

export default function Home() {
  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const stopScanRef = useRef(false);

  // --- State ---
  const [channels, setChannels] = useState<Channel[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentFilter, setCurrentFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [m3uUrl, setM3uUrl] = useState(STABLE_SOURCES[0].url);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [useProxy, setUseProxy] = useState(false);
  const [activeProxy, setActiveProxy] = useState(PROXIES[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'standby' | 'loading' | 'playing' | 'error' | 'auto-proxying'>('standby');
  const [isMounted, setIsMounted] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [playlistRaw, setPlaylistRaw] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [autoProxyMode, setAutoProxyMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // --- Initial Load ---
  useEffect(() => {
    setIsMounted(true);
    
    const savedFavs = localStorage.getItem('vibestream_favs');
    const savedUrl = localStorage.getItem('vibestream_url');
    const savedProxy = localStorage.getItem('vibestream_proxy');
    const savedProxyIndex = localStorage.getItem('vibestream_proxy_index');
    const savedAutoProxy = localStorage.getItem('vibestream_autoproxy');

    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedUrl) setM3uUrl(savedUrl);
    if (savedProxy) setUseProxy(JSON.parse(savedProxy));
    if (savedProxyIndex) setActiveProxy(PROXIES[parseInt(savedProxyIndex)]);
    if (savedAutoProxy) setAutoProxyMode(JSON.parse(savedAutoProxy));

    loadPlaylist(savedUrl || STABLE_SOURCES[0].url, JSON.parse(savedProxy || 'false'), PROXIES[parseInt(savedProxyIndex || '0')]);
    
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, []);

  // --- Actions ---
  const loadPlaylist = async (url: string, proxyState: boolean = useProxy, proxyObj = activeProxy) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const finalUrl = proxyState ? `${proxyObj.url}${encodeURIComponent(url)}` : url;
      const response = await fetch(finalUrl);
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

  const clearStatusCache = () => {
    localStorage.removeItem('vibestream_status_cache');
    setChannels(prev => prev.map(c => ({ ...c, status: 'unknown' })));
    alert('Cache status telah dibersihkan.');
  };

  const saveStatusToCache = (channelStatuses: Record<string, Channel['status']>) => {
    const existingRaw = localStorage.getItem('vibestream_status_cache');
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const updated = { ...existing, ...channelStatuses };
    localStorage.setItem('vibestream_status_cache', JSON.stringify(updated));
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavs = favorites.includes(id) 
      ? favorites.filter(fid => fid !== id) 
      : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('vibestream_favs', JSON.stringify(newFavs));
  };

  const playChannel = async (channel: Channel, forceProxy: boolean | null = null, specificProxy: any = null) => {
    setCurrentChannel(channel);
    
    const tryPlay = (url: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (hlsRef.current) hlsRef.current.destroy();
        
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: true, manifestLoadingTimeOut: 5000 });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(videoRef.current!);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoRef.current?.play().catch(() => {});
            resolve(true);
          });
          
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              hls.destroy();
              resolve(false);
            }
          });

          setTimeout(() => { if (hlsRef.current === hls) resolve(false); }, 7000);
        } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = url;
          const onPlay = () => {
            videoRef.current?.removeEventListener('playing', onPlay);
            resolve(true);
          };
          const onError = () => {
            videoRef.current?.removeEventListener('error', onError);
            resolve(false);
          };
          videoRef.current.addEventListener('playing', onPlay);
          videoRef.current.addEventListener('error', onError);
          videoRef.current.play().catch(() => resolve(false));
        } else {
          resolve(false);
        }
      });
    };

    if (autoProxyMode && forceProxy === null) {
      setStreamStatus('auto-proxying');
      
      const okDirect = await tryPlay(channel.url);
      if (okDirect) {
        setStreamStatus('playing');
        setUseProxy(false);
        updateChannelStatus(channel.id, 'online');
        saveStatusToCache({ [channel.id]: 'online' });
        return;
      }

      for (const proxy of PROXIES) {
        const proxyUrl = `${proxy.url}${encodeURIComponent(channel.url)}`;
        const okProxy = await tryPlay(proxyUrl);
        if (okProxy) {
          setStreamStatus('playing');
          setUseProxy(true);
          setActiveProxy(proxy);
          updateChannelStatus(channel.id, 'online');
          saveStatusToCache({ [channel.id]: 'online' });
          return;
        }
      }

      setStreamStatus('error');
      updateChannelStatus(channel.id, 'offline');
      saveStatusToCache({ [channel.id]: 'offline' });
    } else {
      setStreamStatus('loading');
      const targetProxy = specificProxy || activeProxy;
      const targetUseProxy = forceProxy !== null ? forceProxy : useProxy;
      const finalUrl = targetUseProxy ? `${targetProxy.url}${encodeURIComponent(channel.url)}` : channel.url;
      const ok = await tryPlay(finalUrl);
      if (ok) {
        setStreamStatus('playing');
        updateChannelStatus(channel.id, 'online');
        saveStatusToCache({ [channel.id]: 'online' });
      } else {
        setStreamStatus('error');
        updateChannelStatus(channel.id, 'offline');
        saveStatusToCache({ [channel.id]: 'offline' });
      }
    }
  };

  const updateChannelStatus = (id: string, status: Channel['status']) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, status } : c));
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
    const resultsCache: Record<string, Channel['status']> = {};

    for (let i = 0; i < targetChannels.length; i += batchSize) {
      if (stopScanRef.current) break;

      const batch = targetChannels.slice(i, i + batchSize);
      
      setChannels(prev => prev.map(c => 
        batch.some(b => b.id === c.id) ? { ...c, status: 'checking' } : c
      ));

      const batchResults = await Promise.all(batch.map(async (ch) => {
        let found = false;
        try {
          const res = await fetch(ch.url, { method: 'HEAD', mode: 'no-cors' });
          if (res.type === 'opaque' || res.ok) found = true;
        } catch (e) {}

        if (!found) {
          const finalUrl = `${activeProxy.url}${encodeURIComponent(ch.url)}`;
          try {
            const res = await fetch(finalUrl, { method: 'HEAD' });
            if (res.ok) found = true;
          } catch (e) {}
        }
        return { id: ch.id, status: (found ? 'online' : 'offline') as Channel['status'] };
      }));

      setChannels(prev => prev.map(c => {
        const res = batchResults.find(r => r.id === c.id);
        if (res) {
          resultsCache[res.id] = res.status;
          return { ...c, status: res.status };
        }
        return c;
      }));

      if (i % 15 === 0) saveStatusToCache(resultsCache);

      setScanProgress(prev => ({ ...prev, current: i + batch.length }));
      await new Promise(r => setTimeout(r, 150));
    }
    
    saveStatusToCache(resultsCache);
    setIsScanning(false);
  };

  const downloadM3U = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportFavorites = () => {
    const favChannels = channels.filter(c => favorites.includes(c.id));
    if (favChannels.length === 0) return alert('Daftar favorit masih kosong.');
    
    let m3u = '#EXTM3U\n';
    favChannels.forEach(ch => {
      m3u += `#EXTINF:-1 tvg-logo="${ch.logo || ''}" group-title="${ch.group}",${ch.name}\n${ch.url}\n`;
    });
    downloadM3U(m3u, 'vibestream_favorites.m3u');
  };

  const handleCopyLink = () => {
    if (currentChannel) {
      navigator.clipboard.writeText(currentChannel.url);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  // --- Derived State ---
  const categories = [
    { name: 'Semua', icon: <Layout size={16} /> },
    { name: 'Stream Aktif', icon: <Radio size={16} className="text-green-500" /> },
    { name: 'Stream Mati', icon: <WifiOff size={16} className="text-red-500" /> },
    { name: 'Favorit', icon: <Star size={16} className="text-amber-500 fill-amber-500" /> },
  ];

  const filteredChannels = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return channels.filter(c => {
      const isFav = favorites.includes(c.id);
      const matchesSearch = query === '' || 
                            c.name.toLowerCase().includes(query) || 
                            c.group.toLowerCase().includes(query);
      
      let matchesCategory = false;
      switch (currentFilter) {
        case 'Semua':
          matchesCategory = true;
          break;
        case 'Stream Aktif':
          matchesCategory = c.status === 'online';
          break;
        case 'Stream Mati':
          matchesCategory = c.status === 'offline';
          break;
        case 'Favorit':
          matchesCategory = isFav;
          break;
        default:
          matchesCategory = true;
      }
      
      return matchesSearch && matchesCategory;
    });
  }, [channels, favorites, currentFilter, searchQuery]);

  if (!isMounted) return <div className="h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Navigation */}
      <nav className="h-16 px-4 md:px-8 flex items-center justify-between glass sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Play className="fill-white text-white" size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight hidden sm:block">VibeStream</span>
        </div>

        <div className="flex-1 max-w-md mx-4 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Cari channel atau grup..."
            className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-2 pl-10 pr-4 outline-none focus:border-indigo-500/50 focus:bg-zinc-900 transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => {
              const next = !autoProxyMode;
              setAutoProxyMode(next);
              localStorage.setItem('vibestream_autoproxy', JSON.stringify(next));
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
              autoProxyMode 
              ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-lg shadow-indigo-500/10' 
              : 'bg-zinc-900/50 border-white/5 text-zinc-500'
            }`}
          >
            <Cpu size={14} className={autoProxyMode ? 'animate-pulse' : ''} />
            <span className="hidden sm:inline">AUTO-PROXY</span>
          </button>

          <div className="relative group/source">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-indigo-400 transition-all"
              title="Ganti Sumber Playlist"
            >
              <Globe size={20} />
            </button>
            
            {showSettings && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Update Playlist</span>
                  <button onClick={() => setShowSettings(false)}><X size={14} /></button>
                </div>
                <div className="p-2 space-y-1">
                  {STABLE_SOURCES.map((source) => (
                    <button
                      key={source.url}
                      onClick={() => {
                        loadPlaylist(source.url);
                        setShowSettings(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        m3uUrl === source.url 
                        ? 'bg-indigo-500 text-white' 
                        : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>{source.name}</span>
                      {m3uUrl === source.url && <CheckCircle2 size={14} />}
                    </button>
                  ))}
                  
                  <div className="p-2 border-t border-white/5 mt-2 space-y-2">
                    <label className="text-[10px] font-bold text-zinc-600 block uppercase">Custom M3U URL</label>
                    <input 
                      type="text" 
                      placeholder="Tempel link M3U di sini..."
                      className="w-full bg-black/50 border border-white/5 rounded-lg px-2 py-2 text-[10px] outline-none focus:border-indigo-500/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          loadPlaylist(e.currentTarget.value);
                          setShowSettings(false);
                        }
                      }}
                    />
                    <button 
                      onClick={clearStatusCache}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 size={12} />
                      Reset Cache Status
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => loadPlaylist(m3uUrl)}
            className="p-2 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-white transition-all"
            title="Refresh Playlist"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin text-indigo-500' : ''} />
          </button>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 md:hidden bg-zinc-900 rounded-xl border border-white/5"
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          fixed inset-0 z-40 bg-zinc-950 md:relative md:inset-auto md:bg-transparent md:translate-x-0
          w-full md:w-80 border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-4 md:p-6 pb-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-[10px] uppercase tracking-[2px] font-bold text-zinc-500">Koleksi</h3>
                {isScanning && (
                  <span className="text-[9px] text-indigo-400 font-bold animate-pulse">
                    Scanning: {Math.round((scanProgress.current / scanProgress.total) * 100)}%
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={scanChannels}
                  className={`p-1.5 border rounded-lg transition-all ${
                    isScanning 
                    ? 'bg-red-500/10 border-red-500/50 text-red-500' 
                    : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-indigo-400'
                  }`}
                  title={isScanning ? "Stop Scan" : "Scan Semua Status Channel"}
                >
                  {isScanning ? <X size={14} /> : <Activity size={14} />}
                </button>
                <button 
                  onClick={exportFavorites}
                  className="p-1.5 bg-zinc-900 border border-white/5 rounded-lg text-zinc-500 hover:text-amber-500 transition-colors"
                  title="Export Favorit ke M3U"
                >
                  <Share2 size={14} />
                </button>
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-zinc-500">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="relative group/filter">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-focus-within/filter:text-indigo-400 transition-colors">
                <Filter size={16} />
              </div>
              <select 
                value={currentFilter}
                onChange={(e) => setCurrentFilter(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-3 pl-10 pr-10 appearance-none outline-none focus:border-indigo-500/50 focus:bg-zinc-900 transition-all text-sm font-bold cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name} className="bg-zinc-900 py-2">
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-focus-within/filter:text-indigo-400 transition-colors">
                <ChevronDown size={16} />
              </div>
            </div>

            {isScanning && (
              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300" 
                  style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-8 mt-2 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-3">
                <Loader2 className="animate-spin" size={24} />
                <span className="text-sm">Memuat playlist...</span>
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center h-60 text-center p-4 bg-red-500/5 border border-red-500/20 rounded-2xl gap-4">
                <Shield className="text-red-500" size={32} />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-red-500">Gagal Memuat</h4>
                  <p className="text-xs text-zinc-500">{fetchError}</p>
                </div>
                <button 
                  onClick={() => loadPlaylist(m3uUrl)}
                  className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  Coba Lagi
                </button>
              </div>
            ) : filteredChannels.length > 0 ? (
              filteredChannels.map((ch, idx) => (
                <div 
                  key={`${ch.id}-${idx}`}
                  onClick={() => {
                    playChannel(ch);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`group flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all border ${
                    currentChannel?.id === ch.id 
                    ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5' 
                    : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05] hover:translate-x-1'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                    {ch.logo ? (
                      <img src={ch.logo} alt="" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <Tv size={20} className="text-zinc-700" />
                    )}
                    {ch.status && ch.status !== 'unknown' && (
                      <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-zinc-950 rounded-full ${
                        ch.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 
                        ch.status === 'offline' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                        'bg-amber-500 animate-pulse'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate group-hover:text-indigo-400 transition-colors">{ch.name}</h4>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{ch.group}</span>
                  </div>
                  <button 
                    onClick={(e) => toggleFavorite(ch.id, e)}
                    className={`p-1.5 rounded-lg transition-all ${
                      favorites.includes(ch.id) ? 'text-amber-500' : 'text-zinc-700 hover:text-zinc-400'
                    }`}
                  >
                    <Star size={16} fill={favorites.includes(ch.id) ? "currentColor" : "none"} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-zinc-600 text-sm italic px-4">
                {currentFilter === 'Stream Aktif' || currentFilter === 'Stream Mati' 
                  ? 'Belum ada data status. Silakan klik ikon "Scan" di atas untuk mendeteksi status siaran.' 
                  : 'Tidak ada channel ditemukan'}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent">
          <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
            <div className="space-y-6">
              <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5 relative group">
                <video 
                  ref={videoRef} 
                  controls 
                  className="w-full h-full object-contain"
                  poster={currentChannel?.logo || ''}
                />
                
                {!currentChannel && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950 text-zinc-500 z-10 text-center p-6">
                    <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center animate-pulse">
                      <Play className="fill-zinc-800 text-zinc-800" size={32} />
                    </div>
                    <p className="text-sm font-medium">Pilih channel untuk mulai streaming</p>
                    <p className="text-[10px] text-zinc-600 max-w-xs">Gunakan fitur <b>Auto-Proxy</b> untuk koneksi otomatis terbaik.</p>
                  </div>
                )}

                {(streamStatus === 'loading' || streamStatus === 'auto-proxying') && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20 gap-4">
                    <Loader2 className="text-indigo-500 animate-spin" size={48} />
                    {streamStatus === 'auto-proxying' && (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase">Auto-Proxying</span>
                        <span className="text-[10px] text-zinc-400">Mencari koneksi terbaik...</span>
                      </div>
                    )}
                  </div>
                )}

                {streamStatus === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900/90 backdrop-blur-sm z-20 text-center p-6">
                    <Shield className="text-red-500" size={48} />
                    <h3 className="text-lg font-bold">Gagal memuat siaran</h3>
                    <p className="text-sm text-zinc-400 max-w-xs">Semua jalur koneksi (Direct & Proxy) gagal. Silakan buka di player eksternal.</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => currentChannel && playChannel(currentChannel)}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all text-sm font-bold"
                      >
                        Coba Lagi
                      </button>
                      <button 
                        onClick={handleCopyLink}
                        className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all text-sm font-bold flex items-center gap-2"
                      >
                        {copying ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        {copying ? 'Tersalin' : 'Salin Link'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div className="space-y-1">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                    {currentChannel?.group || 'VibeStream READY'}
                  </span>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {currentChannel?.name || 'Selamat Datang'}
                  </h1>
                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <div className={`w-2 h-2 rounded-full ${
                        streamStatus === 'playing' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 
                        (streamStatus === 'loading' || streamStatus === 'auto-proxying') ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
                      }`} />
                      <span className="capitalize">{streamStatus === 'playing' ? 'Streaming' : streamStatus.replace('-', ' ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleCopyLink}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 border border-white/5 rounded-2xl font-bold hover:bg-zinc-800 transition-all text-sm"
                  >
                    {copying ? <CheckCircle2 size={18} className="text-green-500" /> : <ExternalLink size={18} />}
                    <span>{copying ? 'Link Tersalin' : 'Buka di VLC'}</span>
                  </button>
                  <button 
                    onClick={() => currentChannel && playChannel(currentChannel)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                  >
                    <RefreshCw size={18} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/20 transition-all group">
                <Globe className="text-indigo-500 mb-4 group-hover:scale-110 transition-transform" size={24} />
                <h4 className="font-bold mb-2">Stable Sources</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">Pilih dari berbagai sumber playlist terpercaya yang selalu diperbarui oleh komunitas global.</p>
              </div>
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/20 transition-all group">
                <Trash2 className="text-indigo-500 mb-4 group-hover:scale-110 transition-transform" size={24} />
                <h4 className="font-bold mb-2">Cache Management</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">Bersihkan cache status kapan saja jika Anda merasa data status sudah tidak relevan dengan link baru.</p>
              </div>
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/20 transition-all group">
                <RefreshCw className="text-indigo-500 mb-4 group-hover:scale-110 transition-transform" size={24} />
                <h4 className="font-bold mb-2">Instant Refresh</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">Perbarui daftar channel Anda secara instan dengan menekan tombol refresh di navigasi atas.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
