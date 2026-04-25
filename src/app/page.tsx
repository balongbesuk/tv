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
  Trash2,
  History,
  Maximize2,
  Settings2,
  Layers,
  ChevronRight,
  Info,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Channel, parseM3U, parseXMLTV, EPGProgram } from '@/utils/iptv';

const STABLE_SOURCES = [
  { name: 'Indonesia (Utama)', url: 'https://iptv-org.github.io/iptv/languages/ind.m3u' },
  { name: 'Indonesia (Entertainment)', url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u' },
  { name: 'Movies & Cinema', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' },
  { name: 'Global (English)', url: 'https://iptv-org.github.io/iptv/languages/eng.m3u' },
  { name: 'News Channels', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
];

const EPG_URL = 'https://iptv-org.github.io/epg/guides/id/mncvision.com.xml';

const PROXIES = [
  { name: 'AllOrigins', url: 'https://api.allorigins.win/raw?url=' },
  { name: 'CorsProxy.io', url: 'https://corsproxy.io/?' },
  { name: 'CodeTabs', url: 'https://api.codetabs.com/v1/proxy?quest=' },
  { name: 'ThingProxy', url: 'https://thingproxy.freeboard.io/fetch/' },
];

const MOCK_EPG: Record<string, EPGProgram[]> = {
  'beritasatu': [
    { title: 'Berita Satu Siang', start: new Date(new Date().setHours(new Date().getHours() - 1)), stop: new Date(new Date().setHours(new Date().getHours() + 1)), desc: 'Rangkuman berita terkini dari dalam dan luar negeri.', channel: 'beritasatu' },
    { title: 'Ekonomi Sore', start: new Date(new Date().setHours(new Date().getHours() + 1)), stop: new Date(new Date().setHours(new Date().getHours() + 2)), desc: 'Analisis pasar modal dan ekonomi nasional.', channel: 'beritasatu' },
    { title: 'Top News Malam', start: new Date(new Date().setHours(new Date().getHours() + 2)), stop: new Date(new Date().setHours(new Date().getHours() + 4)), desc: 'Berita utama hari ini yang paling banyak diperbincangkan.', channel: 'beritasatu' },
  ],
  'rcti': [
    { title: 'Silet', start: new Date(new Date().setHours(new Date().getHours() - 1)), stop: new Date(new Date().setHours(new Date().getHours() + 1)), desc: 'Kupas tuntas tajam terpercaya seputar selebriti.', channel: 'rcti' },
    { title: 'Ikatan Cinta', start: new Date(new Date().setHours(new Date().getHours() + 1)), stop: new Date(new Date().setHours(new Date().getHours() + 3)), desc: 'Sinetron drama keluarga terpopuler.', channel: 'rcti' },
  ],
  'metrotv': [
    { title: 'Metro Pagi Primetime', start: new Date(new Date().setHours(new Date().getHours() - 1)), stop: new Date(new Date().setHours(new Date().getHours() + 1)), desc: 'Informasi berita pagi terkini dan mendalam.', channel: 'metrotv' },
    { title: 'Editorial Media Indonesia', start: new Date(new Date().setHours(new Date().getHours() + 1)), stop: new Date(new Date().setHours(new Date().getHours() + 2)), desc: 'Bedah berita utama hari ini bersama redaksi.', channel: 'metrotv' },
    { title: 'Kick Andy', start: new Date(new Date().setHours(new Date().getHours() + 2)), stop: new Date(new Date().setHours(new Date().getHours() + 4)), desc: 'Talkshow inspiratif bersama Andy F. Noya.', channel: 'metrotv' },
  ],
  'indosiar': [
    { title: 'Patroli', start: new Date(new Date().setHours(new Date().getHours() - 1)), stop: new Date(new Date().setHours(new Date().getHours() + 1)), desc: 'Berita kriminal terkini.', channel: 'indosiar' },
    { title: 'Kisah Nyata', start: new Date(new Date().setHours(new Date().getHours() + 1)), stop: new Date(new Date().setHours(new Date().getHours() + 3)), desc: 'Drama religi penuh hikmah.', channel: 'indosiar' },
    { title: 'Magic 5', start: new Date(new Date().setHours(new Date().getHours() + 3)), stop: new Date(new Date().setHours(new Date().getHours() + 5)), desc: 'Sinetron fantasi remaja.', channel: 'indosiar' },
  ],
  'trans7': [
    { title: 'Trending', start: new Date(new Date().setHours(new Date().getHours() - 1)), stop: new Date(new Date().setHours(new Date().getHours() + 1)), desc: 'Informasi viral di media sosial.', channel: 'trans7' },
    { title: 'On Report', start: new Date(new Date().setHours(new Date().getHours() + 1)), stop: new Date(new Date().setHours(new Date().getHours() + 2)), desc: 'Investigasi berita mendalam.', channel: 'trans7' },
    { title: 'Lapor Pak!', start: new Date(new Date().setHours(new Date().getHours() + 2)), stop: new Date(new Date().setHours(new Date().getHours() + 4)), desc: 'Komedi situasi kantor polisi.', channel: 'trans7' },
  ],
  'transtv': [
    { title: 'Brownis', start: new Date(new Date().setHours(new Date().getHours() - 1)), stop: new Date(new Date().setHours(new Date().getHours() + 1)), desc: 'Obrowlan manis seputar selebriti.', channel: 'transtv' },
    { title: 'Rumpi No Secret', start: new Date(new Date().setHours(new Date().getHours() + 1)), stop: new Date(new Date().setHours(new Date().getHours() + 2)), desc: 'Gosip selebriti paling hangat.', channel: 'transtv' },
    { title: 'Bioskop Trans TV', start: new Date(new Date().setHours(new Date().getHours() + 2)), stop: new Date(new Date().setHours(new Date().getHours() + 5)), desc: 'Film blockbuster pilihan.', channel: 'transtv' },
  ]
};

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
  const [epgData, setEpgData] = useState<Record<string, EPGProgram[]>>({});
  const [epgStatus, setEpgStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  
  // New States
  const [levels, setLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  // --- Helpers ---
  const cleanChannelName = (name: string) => {
    return name.replace(/\([^)]*\)/g, '').trim();
  };
  useEffect(() => {
    setIsMounted(true);
    
    const savedFavs = localStorage.getItem('vibestream_favs');
    const savedHistory = localStorage.getItem('vibestream_history');
    const savedUrl = localStorage.getItem('vibestream_url');
    const savedProxy = localStorage.getItem('vibestream_proxy');
    const savedProxyIndex = localStorage.getItem('vibestream_proxy_index');
    const savedAutoProxy = localStorage.getItem('vibestream_autoproxy');

    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedUrl) setM3uUrl(savedUrl);
    if (savedProxy) setUseProxy(JSON.parse(savedProxy));
    if (savedProxyIndex) setActiveProxy(PROXIES[parseInt(savedProxyIndex)]);
    if (savedAutoProxy) setAutoProxyMode(JSON.parse(savedAutoProxy));

    loadInitialData(savedUrl || STABLE_SOURCES[0].url, JSON.parse(savedProxy || 'false'), PROXIES[parseInt(savedProxyIndex || '0')]);
    
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, []);

  const loadInitialData = async (url: string, proxyState: boolean, proxyObj: any) => {
    await loadPlaylist(url, proxyState, proxyObj);
    fetchEPG();
  };

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

  const fetchEPG = async () => {
    setEpgStatus('loading');
    // Try each proxy until one works
    for (const proxy of PROXIES) {
      try {
        const proxyUrl = `${proxy.url}${encodeURIComponent(EPG_URL)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const xmlText = await response.text();
          const parsed = parseXMLTV(xmlText);
          setEpgData(parsed);
          setEpgStatus('ready');
          console.log(`EPG loaded successfully using ${proxy.name}`);
          return;
        }
      } catch (e) {
        console.warn(`EPG Fetch failed with ${proxy.name}, trying next...`);
      }
    }
    setEpgStatus('error');
    console.error("All proxies failed to load EPG.");
  };

  const getChannelEPG = (channel?: Channel | null) => {
    if (!channel) return null;
    
    // 1. Try direct ID match
    let epgId = channel.epgId;
    let programs = epgId ? epgData[epgId] : null;

    // 2. Try smart name match if ID fails
    if (!programs) {
      // Clean name: remove content in (), remove non-alphanumeric, lowercase
      const cleanName = channel.name.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');
      
      if (cleanName) {
        // First try MOCK data for demo if fetch failed
        if (MOCK_EPG[cleanName]) {
          programs = MOCK_EPG[cleanName];
        } else {
          const foundId = Object.keys(epgData).find(id => {
            const idLower = id.toLowerCase().replace(/[^a-z0-9]/g, '');
            return idLower.includes(cleanName) || cleanName.includes(idLower);
          });
          if (foundId) programs = epgData[foundId];
        }
      }
    }

    if (!programs) return null;

    const now = new Date();
    const current = programs.find(p => now >= p.start && now <= p.stop);
    const next = programs.filter(p => p.start > now).slice(0, 5);
    return { current, next };
  };

  const addToHistory = (id: string) => {
    const newHistory = [id, ...history.filter(h => h !== id)].slice(0, 15);
    setHistory(newHistory);
    localStorage.setItem('vibestream_history', JSON.stringify(newHistory));
  };

  const playChannel = async (channel: Channel, forceProxy: boolean | null = null, specificProxy: any = null) => {
    setCurrentChannel(channel);
    addToHistory(channel.id);
    setLevels([]);
    setCurrentLevel(-1);
    setShowSchedule(false);
    
    const tryPlay = (url: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (hlsRef.current) hlsRef.current.destroy();
        
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: true, manifestLoadingTimeOut: 5000 });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(videoRef.current!);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLevels(hls.levels);
            videoRef.current?.play().catch(() => {});
            resolve(true);
          });
          
          hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
            setCurrentLevel(data.level);
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              hls.destroy();
              resolve(false);
            }
          });

          setTimeout(() => { if (hlsRef.current === hls && levels.length === 0) resolve(false); }, 7000);
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
        updateChannelStatus(channel.id, 'online');
        return;
      }

      for (const proxy of PROXIES) {
        const proxyUrl = `${proxy.url}${encodeURIComponent(channel.url)}`;
        const okProxy = await tryPlay(proxyUrl);
        if (okProxy) {
          setStreamStatus('playing');
          updateChannelStatus(channel.id, 'online');
          return;
        }
      }
      setStreamStatus('error');
      updateChannelStatus(channel.id, 'offline');
    } else {
      setStreamStatus('loading');
      const targetProxy = specificProxy || activeProxy;
      const targetUseProxy = forceProxy !== null ? forceProxy : useProxy;
      const finalUrl = targetUseProxy ? `${targetProxy.url}${encodeURIComponent(channel.url)}` : channel.url;
      const ok = await tryPlay(finalUrl);
      if (ok) {
        setStreamStatus('playing');
        updateChannelStatus(channel.id, 'online');
      } else {
        setStreamStatus('error');
        updateChannelStatus(channel.id, 'offline');
      }
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
        if (!found) {
          try {
            const res = await fetch(`${PROXIES[0].url}${encodeURIComponent(ch.url)}`, { method: 'HEAD' });
            if (res.ok) found = true;
          } catch (e) {}
        }
        return { id: ch.id, status: (found ? 'online' : 'offline') as Channel['status'] };
      }));

      batchResults.forEach(r => updateChannelStatus(r.id, r.status));
      setScanProgress(prev => ({ ...prev, current: i + batch.length }));
      await new Promise(r => setTimeout(r, 150));
    }
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

  const togglePIP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openInVLC = () => {
    if (currentChannel) {
      window.location.href = `vlc://${currentChannel.url}`;
    }
  };

  const switchLevel = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentLevel(index);
      setShowQualityMenu(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // --- Derived State ---
  const groups = useMemo(() => {
    const uniqueGroups = Array.from(new Set(channels.map(c => c.group || 'Lainnya')));
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
      const matchesGroup = currentGroup === 'Semua' || (c.group || 'Lainnya') === currentGroup;
      
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

  const activeEPG = useMemo(() => getChannelEPG(currentChannel), [currentChannel, epgData]);

  if (!isMounted) return <div className="h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-950 text-zinc-100 font-[family-name:var(--font-outfit)]">
      {/* Navigation */}
      <nav className="h-16 px-4 md:px-8 flex items-center justify-between glass sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform cursor-pointer">
            <Play className="fill-white text-white translate-x-0.5" size={20} />
          </div>
          <span className="text-xl font-black tracking-tight hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">VibeStream</span>
        </div>

        <div className="flex-1 max-w-xl mx-4 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search channels, series, or groups..."
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-2.5 pl-12 pr-4 outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all text-sm placeholder:text-zinc-600 shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-white/[0.02]">
            <Calendar size={12} className={epgStatus === 'loading' ? 'animate-spin text-indigo-400' : epgStatus === 'ready' ? 'text-green-500' : 'text-red-500'} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${epgStatus === 'ready' ? 'text-zinc-400' : 'text-zinc-600'}`}>
              EPG: {epgStatus}
            </span>
          </div>

          <button 
            onClick={() => {
              const next = !autoProxyMode;
              setAutoProxyMode(next);
              localStorage.setItem('vibestream_autoproxy', JSON.stringify(next));
            }}
            className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${
              autoProxyMode 
              ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
              : 'bg-zinc-900/50 border-white/5 text-zinc-500'
            }`}
          >
            <Cpu size={14} className={autoProxyMode ? 'animate-pulse' : ''} />
            <span className="uppercase tracking-widest">Auto-Proxy</span>
          </button>

          <div className="relative group/source">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-zinc-400 hover:text-indigo-400 hover:bg-white/[0.05] transition-all shadow-sm"
              title="Playlist Sources"
            >
              <Globe size={20} />
            </button>
            
            {showSettings && (
              <div className="absolute right-0 top-full mt-3 w-72 bg-zinc-900/95 border border-white/10 rounded-3xl shadow-2xl z-[100] overflow-hidden backdrop-blur-2xl ring-1 ring-white/10">
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-500 uppercase tracking-[2px]">Settings & Playlist</span>
                  <button onClick={() => setShowSettings(false)} className="hover:text-red-400 transition-colors"><X size={16} /></button>
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="px-3 py-4 mb-2 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">EPG Data Status</span>
                      <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        epgStatus === 'ready' ? 'bg-green-500/10 text-green-500' : 
                        epgStatus === 'loading' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {epgStatus}
                      </div>
                    </div>
                    {epgStatus === 'error' && (
                      <button 
                        onClick={fetchEPG}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
                      >
                        <RefreshCw size={12} /> Retry Fetch EPG
                      </button>
                    )}
                  </div>

                  {STABLE_SOURCES.map((source) => (
                    <button
                      key={source.url}
                      onClick={() => {
                        loadInitialData(source.url, useProxy, activeProxy);
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
                            loadInitialData(e.currentTarget.value, useProxy, activeProxy);
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
            className="p-2.5 md:hidden bg-zinc-900 rounded-xl border border-white/5 text-zinc-400"
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          fixed inset-0 z-40 bg-zinc-950 md:relative md:inset-auto md:bg-transparent md:translate-x-0
          w-full md:w-80 border-r border-white/5 flex flex-col transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
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
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="relative group/cat">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/cat:text-indigo-400 transition-colors">
                  <Filter size={16} />
                </div>
                <select 
                  value={currentFilter}
                  onChange={(e) => setCurrentFilter(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-3 pl-12 pr-4 appearance-none outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] transition-all text-sm font-bold cursor-pointer"
                >
                  {categoryFilters.map(cat => (
                    <option key={cat.name} value={cat.name} className="bg-zinc-900">{cat.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                  <ChevronDown size={14} />
                </div>
              </div>

              <div className="relative group/grp">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/grp:text-indigo-400 transition-colors">
                  <Layers size={16} />
                </div>
                <select 
                  value={currentGroup}
                  onChange={(e) => setCurrentGroup(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-3 pl-12 pr-4 appearance-none outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] transition-all text-sm font-bold cursor-pointer"
                >
                  {groups.map(group => (
                    <option key={group} value={group} className="bg-zinc-900">{group}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                  <ChevronDown size={14} />
                </div>
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

          <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-12 space-y-2.5 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-600 gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <span className="text-xs font-black uppercase tracking-widest">Syncing Playlist...</span>
              </div>
            ) : filteredChannels.length > 0 ? (
              filteredChannels.map((ch, idx) => {
                const prog = getChannelEPG(ch);
                return (
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
                      <h4 className="text-sm font-bold truncate group-hover:text-indigo-400 transition-colors leading-tight">{ch.name}</h4>
                      {prog?.current ? (
                        <p className="text-[9px] text-indigo-400 font-bold truncate mt-0.5 flex items-center gap-1 uppercase tracking-tighter">
                          <Play size={8} className="fill-indigo-400" /> {prog.current.title}
                        </p>
                      ) : (
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black opacity-60">{ch.group || 'General'}</span>
                      )}
                    </div>
                    <button 
                      onClick={(e) => toggleFavorite(ch.id, e)}
                      className={`p-2 rounded-xl transition-all ${
                        favorites.includes(ch.id) ? 'text-amber-500 bg-amber-500/10 scale-110' : 'text-zinc-800 hover:text-zinc-400 hover:bg-white/5'
                      }`}
                    >
                      <Star size={16} fill={favorites.includes(ch.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                <Search className="text-zinc-800 mb-4" size={40} />
                <h5 className="text-zinc-500 font-bold mb-1">No channels found</h5>
                <p className="text-[10px] text-zinc-700 uppercase tracking-wider font-black">Try a different filter or search term</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.05),transparent_60%)]">
          <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-10">
            <div className="space-y-8">
              <div className="w-full aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 relative group ring-1 ring-white/5">
                <video 
                  ref={videoRef} 
                  controls 
                  className="w-full h-full object-contain"
                  poster={currentChannel?.logo || ''}
                />
                
                {!currentChannel && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-zinc-950 z-10 text-center p-8">
                    <div className="w-24 h-24 rounded-3xl bg-zinc-900 flex items-center justify-center animate-pulse shadow-2xl">
                      <Play className="fill-zinc-800 text-zinc-800 translate-x-1" size={40} />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-black tracking-tight">Ready for Streaming</h2>
                      <p className="text-xs text-zinc-500 uppercase tracking-[2px] font-bold">Select a channel to begin your experience</p>
                    </div>
                  </div>
                )}

                {/* Overlays */}
                {(streamStatus === 'loading' || streamStatus === 'auto-proxying') && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-20 gap-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
                      <Loader2 className="text-indigo-500 animate-spin relative z-10" size={56} />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-black text-white tracking-[4px] uppercase animate-pulse">
                        {streamStatus === 'auto-proxying' ? 'Auto-Proxying' : 'Establishing connection'}
                      </span>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Optimizing stream levels...</p>
                    </div>
                  </div>
                )}

                {streamStatus === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-zinc-950/95 backdrop-blur-xl z-20 text-center p-10">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                      <Shield className="text-red-500" size={40} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black">Connection Refused</h3>
                      <p className="text-sm text-zinc-500 max-w-sm mx-auto">All proxy routes failed. This stream might be geo-blocked or permanently down.</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => currentChannel && playChannel(currentChannel)}
                        className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all text-sm font-black shadow-lg shadow-indigo-600/20"
                      >
                        RETRY CONNECTION
                      </button>
                      <button 
                        onClick={openInVLC}
                        className="px-8 py-3.5 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all text-sm font-black flex items-center gap-2 border border-white/5"
                      >
                        <ExternalLink size={18} />
                        OPEN IN VLC
                      </button>
                    </div>
                  </div>
                )}

                {/* Quality / PIP / Schedule Controls */}
                {currentChannel && streamStatus === 'playing' && (
                  <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-30">
                    <button 
                      onClick={() => setShowSchedule(!showSchedule)}
                      className={`p-3 backdrop-blur-xl border border-white/10 rounded-2xl transition-all shadow-xl flex items-center gap-2 ${showSchedule ? 'bg-indigo-500 text-white' : 'bg-black/60 text-white hover:bg-black/80'}`}
                      title="Show Schedule"
                    >
                      <Calendar size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Schedule</span>
                    </button>

                    <div className="relative">
                      <button 
                        onClick={() => setShowQualityMenu(!showQualityMenu)}
                        className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl text-white flex items-center gap-2 transition-all shadow-xl"
                        title="Stream Quality"
                      >
                        <Settings2 size={18} className={showQualityMenu ? 'rotate-90 transition-transform' : ''} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                          {currentLevel === -1 ? 'Auto' : (levels[currentLevel]?.height ? `${levels[currentLevel].height}p` : 'Manual')}
                        </span>
                      </button>
                      
                      {showQualityMenu && levels.length > 0 && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl ring-1 ring-white/10">
                          <button 
                            onClick={() => switchLevel(-1)}
                            className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase transition-all flex items-center justify-between ${currentLevel === -1 ? 'bg-indigo-500 text-white' : 'hover:bg-white/5 text-zinc-400'}`}
                          >
                            <span>Auto Quality</span>
                            {currentLevel === -1 && <CheckCircle2 size={12} />}
                          </button>
                          {levels.map((lvl, idx) => (
                            <button
                              key={`quality-${idx}`}
                              onClick={() => switchLevel(idx)}
                              className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase transition-all flex items-center justify-between ${currentLevel === idx ? 'bg-indigo-500 text-white' : 'hover:bg-white/5 text-zinc-400'}`}
                            >
                              <span>{lvl.height}p ({Math.round(lvl.bitrate / 1024)} kbps)</span>
                              {currentLevel === idx && <CheckCircle2 size={12} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={togglePIP}
                      className="p-3 bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl text-white transition-all shadow-xl"
                      title="Picture in Picture"
                    >
                      <Maximize2 size={18} />
                    </button>
                  </div>
                )}

                {/* Schedule Overlay */}
                {showSchedule && (
                  <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-40 p-8 md:p-12 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <Calendar className="text-indigo-500" size={32} />
                        <h3 className="text-2xl font-black uppercase tracking-widest">Upcoming Shows</h3>
                      </div>
                      <button onClick={() => setShowSchedule(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                        <X size={24} />
                      </button>
                    </div>
                    <div className="space-y-4 max-w-2xl mx-auto">
                      {activeEPG?.next && activeEPG.next.length > 0 ? (
                        activeEPG.next.map((prog, idx) => (
                          <div key={idx} className="group p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 transition-all flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="font-bold text-lg group-hover:text-indigo-400 transition-colors">{prog.title}</h4>
                              <p className="text-xs text-zinc-500 leading-relaxed opacity-70">{prog.desc}</p>
                            </div>
                            <div className="flex items-center gap-3 text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-2xl border border-indigo-500/20">
                              <Clock size={16} />
                              <span className="text-xs font-black">{formatTime(prog.start)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                          <AlertCircle className="text-zinc-800" size={48} />
                          <div className="space-y-1">
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Jadwal tidak ditemukan</p>
                            <p className="text-[10px] text-zinc-700 font-medium">Data jadwal untuk channel "{cleanChannelName(currentChannel?.name || '')}" tidak tersedia di sumber EPG saat ini.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 px-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[2px] border border-indigo-500/20">
                      {currentChannel?.group || 'Live Feed'}
                    </span>
                    {activeEPG?.current && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-[2px] border border-red-500/20 animate-pulse">
                        <Radio size={12} />
                        <span>LIVE: {activeEPG.current.title}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
                      {currentChannel?.name || 'Welcome to VibeStream'}
                    </h1>
                    {activeEPG?.current?.desc && (
                      <p className="text-sm text-zinc-500 max-w-xl font-medium leading-relaxed italic">"{activeEPG.current.desc}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        streamStatus === 'playing' ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 
                        (streamStatus === 'loading' || streamStatus === 'auto-proxying') ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
                      }`} />
                      <span>{streamStatus === 'playing' ? 'Active Stream' : streamStatus.replace('-', ' ')}</span>
                    </div>
                    {activeEPG?.current && (
                      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                        <Clock size={14} className="text-indigo-400" />
                        <span>{formatTime(activeEPG.current.start)} - {formatTime(activeEPG.current.stop)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={openInVLC}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-zinc-900 border border-white/5 rounded-2xl font-black hover:bg-zinc-800 transition-all text-xs uppercase tracking-widest group shadow-lg"
                  >
                    <ExternalLink size={18} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span>Watch in VLC</span>
                  </button>
                  <button 
                    onClick={() => currentChannel && playChannel(currentChannel)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 text-xs uppercase tracking-widest"
                  >
                    <RefreshCw size={18} className={streamStatus === 'loading' ? 'animate-spin' : ''} />
                    <span>Refresh Stream</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Premium Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Calendar size={60} />
                </div>
                <Calendar className="text-pink-500 mb-5 group-hover:scale-110 transition-transform" size={28} />
                <h4 className="font-black text-sm uppercase tracking-widest mb-3">Live EPG</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">Lihat jadwal acara dan apa yang sedang tayang sekarang secara real-time.</p>
              </div>
              
              <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Maximize2 size={60} />
                </div>
                <Maximize2 className="text-purple-500 mb-5 group-hover:scale-110 transition-transform" size={28} />
                <h4 className="font-black text-sm uppercase tracking-widest mb-3">PIP Mode</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">Tetap tonton siaran favorit Anda sambil mengerjakan hal lain di browser.</p>
              </div>

              <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Layers size={60} />
                </div>
                <Layers className="text-indigo-500 mb-5 group-hover:scale-110 transition-transform" size={28} />
                <h4 className="font-black text-sm uppercase tracking-widest mb-3">Smart Grouping</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">Filter channel berdasarkan kategori yang diekstrak otomatis dari playlist M3U.</p>
              </div>

              <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Settings2 size={60} />
                </div>
                <Settings2 className="text-green-500 mb-5 group-hover:scale-110 transition-transform" size={28} />
                <h4 className="font-black text-sm uppercase tracking-widest mb-3">Multi-Bitrate</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">Pilih kualitas resolusi (HD/SD) secara manual untuk menghemat kuota Anda.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
