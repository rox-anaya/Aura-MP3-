import { useState, useEffect, useRef } from "react";
import { 
  LuHouse, LuLibrary, LuSearch, LuSlidersHorizontal, LuPlay, LuPause, LuSkipForward, LuMusic, 
  LuX, LuFileAudio, LuFileText, LuShield, LuInfo, LuChevronRight, LuSkipBack, LuRepeat, LuShuffle, 
  LuHeart, LuFolder, LuClock, LuPlus, LuDownload, LuSettings, LuHeartHandshake, 
  LuArrowLeft, LuPalette, LuListMusic, LuRotateCcw, LuHeadphones
} from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";
import { registerPlugin } from "@capacitor/core";
const MediaScanner = registerPlugin<any>("MediaScanner");

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  url: string;
  addedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  isPinned?: boolean;
}

const THEMES = [
  { name: "Crimson Red", color: "#FF1744" },
  { name: "Emerald Glow", color: "#00E676" },
  { name: "Cyber Cyan", color: "#06B6D4" },
  { name: "Electric Purple", color: "#A855F7" },
  { name: "Amber Sun", color: "#F59E0B" },
  { name: "Rose Pink", color: "#EC4899" }
];

const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

const PRESETS: Record<string, number[]> = {
  "Normal": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Bass Boost": [8, 6, 4, 1, 0, 0, 0, 0, 0, 0],
  "Deep Bass": [10, 8, 5, 2, 0, 0, 0, 0, 0, 0],
  "Vocal Boost": [-2, -1, 1, 4, 6, 5, 3, 0, -1, -2],
  "Treble Boost": [-2, -2, 0, 0, 1, 3, 5, 7, 9, 10],
  "Studio": [1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
  "Classical": [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
  "Pop": [-1, 1, 3, 4, 3, 1, -1, 1, 2, 3],
  "Rock": [6, 4, 2, -1, -2, 1, 3, 5, 6, 7],
  "Jazz": [3, 2, 1, 2, -1, -1, 0, 2, 4, 5],
  "Concert Hall": [3, 2, 0, 1, 2, 2, 3, 4, 3, 2],
  "360° Spatial Audio": [2, 1, 0, 0, 1, 2, 3, 4, 5, 5]
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<"home" | "library" | "search" | "more">("home");
  const [librarySubTab, setLibrarySubTab] = useState<"songs" | "artists" | "albums">("songs");
  const [homeView, setHomeView] = useState<"main" | "recentlyPlayed" | "recentlyAdded" | "folders">("main");
  const [activeSubPage, setActiveSubPage] = useState<null | "converter" | "support" | "settings" | "about" | "privacy" | "terms" | "customEq">(null);

  const [songs, setSongs] = useState<Song[]>(() => {
  useEffect(() => {
    const fetchNativeTracks = async () => {
      try {
        const res = await MediaScanner.getLocalSongs();
        if (res && res.songs && res.songs.length > 0) {
          setSongs(res.songs);
        }
      } catch (e) {
        console.log("Not running in native container or permissions pending");
      }
    };
    fetchNativeTracks();
  }, []);
    const saved = localStorage.getItem("aura_songs");
    return saved ? JSON.parse(saved) : [];
  });

  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>(() => {
    const saved = localStorage.getItem("aura_recent");
    return saved ? JSON.parse(saved) : [];
  });

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem("aura_playlists");
    return saved ? JSON.parse(saved) : [
      { id: "fav", name: "Favorites", songIds: [], isPinned: true }
    ];
  });

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem("aura_theme");
    return saved ? JSON.parse(saved) : THEMES[0];
  });

  const [activePreset, setActivePreset] = useState(() => {
    return localStorage.getItem("aura_preset") || "Normal";
  });

  const [customBands, setCustomBands] = useState<number[]>(() => {
    const saved = localStorage.getItem("aura_custom_eq");
    return saved ? JSON.parse(saved) : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  });

  const [quality, setQuality] = useState(() => {
    return localStorage.getItem("aura_quality") || "320 kbps";
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [supportToast, setSupportToast] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem("aura_songs", JSON.stringify(songs));
  }, [songs]);

  useEffect(() => {
    localStorage.setItem("aura_playlists", JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem("aura_recent", JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  useEffect(() => {
    localStorage.setItem("aura_theme", JSON.stringify(currentTheme));
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem("aura_preset", activePreset);
  }, [activePreset]);

  useEffect(() => {
    localStorage.setItem("aura_quality", quality);
  }, [quality]);

  const initAudioEngine = () => {
    if (!audioRef.current || audioCtxRef.current) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const source = ctx.createMediaElementSource(audioRef.current);
    sourceNodeRef.current = source;

    const filters = EQ_FREQUENCIES.map((freq, idx) => {
      const filter = ctx.createBiquadFilter();
      if (idx === 0) filter.type = "lowshelf";
      else if (idx === EQ_FREQUENCIES.length - 1) filter.type = "highshelf";
      else filter.type = "peaking";
      filter.frequency.value = freq;
      filter.gain.value = 0;
      return filter;
    });

    let prevNode: AudioNode = source;
    filters.forEach((filter) => {
      prevNode.connect(filter);
      prevNode = filter;
    });
    prevNode.connect(ctx.destination);
    filtersRef.current = filters;

    applyGains(activePreset === "Custom EQ" ? customBands : PRESETS[activePreset] || PRESETS["Normal"]);
  };

  const applyGains = (gains: number[]) => {
    if (filtersRef.current.length === 0) return;
    filtersRef.current.forEach((filter, idx) => {
      if (gains[idx] !== undefined) {
        filter.gain.setTargetAtTime(gains[idx], audioCtxRef.current?.currentTime || 0, 0.05);
      }
    });
  };

  useEffect(() => {
    if (activePreset === "Custom EQ") {
      applyGains(customBands);
    } else if (PRESETS[activePreset]) {
      applyGains(PRESETS[activePreset]);
    }
  }, [activePreset]);

  const handleBandChange = (index: number, val: number) => {
    const updated = [...customBands];
    updated[index] = val;
    setCustomBands(updated);
    localStorage.setItem("aura_custom_eq", JSON.stringify(updated));
    if (activePreset === "Custom EQ") applyGains(updated);
  };

  const playSong = (song: Song) => {
    initAudioEngine();
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();

    setCurrentSong(song);
    setIsPlaying(true);
    setRecentlyPlayed((prev) => [song, ...prev.filter((s) => s.id !== song.id)].slice(0, 50));

    if (audioRef.current) {
      audioRef.current.src = song.url;
      audioRef.current.play().catch(() => {});
    }
  };

  const togglePlay = () => {
    if (!currentSong && songs.length > 0) {
      playSong(songs[0]);
      return;
    }
    if (!audioRef.current) return;
    initAudioEngine();
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleImportFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newSongs: Song[] = Array.from(files).map((file, idx) => ({
      id: `local_${Date.now()}_${idx}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Audio",
      duration: "--:--",
      url: URL.createObjectURL(file),
      addedAt: Date.now()
    }));

    setSongs((prev) => [...newSongs, ...prev]);
  };

  const handleResetSettings = () => {
    setCurrentTheme(THEMES[0]);
    setActivePreset("Normal");
    setCustomBands([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    setQuality("320 kbps");
    localStorage.removeItem("aura_theme");
    localStorage.removeItem("aura_preset");
    localStorage.removeItem("aura_custom_eq");
    localStorage.removeItem("aura_quality");
    applyGains(PRESETS["Normal"]);
    setShowResetModal(false);
  };

  const handleConvert = async () => {
    if (!ytUrl.trim()) return alert("Please enter a valid YouTube URL.");
    setDownloading(true);
    setProgress(20);
    try {
      const formattedQuality = quality.replace(" kbps", "k");
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

      const res = await fetch(`${baseUrl}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ytUrl, quality: formattedQuality }),
      });
      if (!res.ok) throw new Error("Conversion failed.");
      setProgress(75);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aura_${Date.now()}.mp3`;
      a.click();
      a.remove();
      setProgress(100);
      setTimeout(() => { setDownloading(false); setProgress(0); setYtUrl(""); }, 1200);
    } catch (e: any) {
      alert(e.message || "Failed to download.");
      setDownloading(false);
    }
  };

  const getSubPageTitle = () => {
    switch (activeSubPage) {
      case "converter": return "MP3 Converter";
      case "support": return "Support Aura";
      case "settings": return "Settings";
      case "customEq": return "Custom 10-Band EQ";
      case "about": return "About Aura MP3";
      case "privacy": return "Privacy Policy";
      case "terms": return "Terms & Conditions";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-white pb-36 bg-[#0E0E0E]">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} preload="none" />
      <input type="file" ref={fileInputRef} onChange={handleImportFiles} multiple accept="audio/*" className="hidden" />

      {/* Static Header */}
      <header className="sticky top-0 z-30 bg-[#0E0E0E]/90 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          {activeSubPage ? (
            <button onClick={() => setActiveSubPage(activeSubPage === "customEq" ? "settings" : null)} className="p-1 rounded-full bg-white/5 hover:bg-white/10 transition">
              <LuArrowLeft size={22} />
            </button>
          ) : (
            <img
              src="https://res.cloudinary.com/dsfwafyc2/image/upload/v1788002720/file_000000004c3c8208901f4689fbfffe83_acvivm.png"
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
          )}
          <h1 className="text-xl font-bold tracking-wide">
            {activeSubPage ? getSubPageTitle() : <>Aura <span style={{ color: currentTheme.color }} className="transition-colors duration-300">MP3</span></>}
          </h1>
        </div>

        {homeView !== "main" && currentTab === "home" && !activeSubPage ? (
          <button onClick={() => setHomeView("main")} className="text-xs px-3 py-1.5 rounded-full bg-white/10 font-medium">Back to Lists</button>
        ) : !activeSubPage && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/5">
            {activePreset}
          </span>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-4">

        {/* CUSTOM 10-BAND EQ */}
        {activeSubPage === "customEq" && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-[#161616] border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Frequency Bands (-12dB to +12dB)</span>
                <button 
                  onClick={() => {
                    const reset = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    setCustomBands(reset);
                    applyGains(reset);
                    localStorage.setItem("aura_custom_eq", JSON.stringify(reset));
                  }}
                  className="text-xs font-semibold" style={{ color: currentTheme.color }}
                >
                  Flat (0dB)
                </button>
              </div>

              <div className="flex justify-between items-center gap-1.5 pt-4 pb-2 overflow-x-auto">
                {EQ_FREQUENCIES.map((freq, idx) => (
                  <div key={freq} className="flex flex-col items-center gap-3 min-w-[28px]">
                    <span className="text-[10px] text-gray-400 font-mono">{customBands[idx] > 0 ? `+${customBands[idx]}` : customBands[idx]}</span>
                    <input 
                      type="range" 
                      min="-12" 
                      max="12" 
                      step="1"
                      value={customBands[idx]}
                      onChange={(e) => handleBandChange(idx, parseInt(e.target.value, 10))}
                      className="h-32 -rotate-90 appearance-none bg-white/10 rounded-full accent-white w-28 cursor-pointer my-10"
                    />
                    <span className="text-[9px] font-bold text-gray-500">{freq >= 1000 ? `${freq / 1000}k` : freq}Hz</span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => { setActivePreset("Custom EQ"); setActiveSubPage("settings"); }}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-black shadow-lg transition-transform active:scale-95"
              style={{ backgroundColor: currentTheme.color }}
            >
              Apply Custom Preset
            </button>
          </div>
        )}

        {/* SETTINGS PAGE */}
        {activeSubPage === "settings" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[11px] font-bold text-gray-500 tracking-wider mb-2 px-1">ACCENT THEME</h3>
              <div className="p-4 rounded-2xl bg-[#161616] border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center" style={{ color: currentTheme.color }}>
                    <LuPalette size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{currentTheme.name}</h4>
                    <p className="text-xs text-gray-400">Permanently saved</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {THEMES.map(theme => (
                    <button
                      key={theme.name}
                      onClick={() => setCurrentTheme(theme)}
                      className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${currentTheme.name === theme.name ? "bg-white/10 border-white/30 text-white" : "bg-black/40 border-transparent text-gray-400"}`}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: theme.color }} />
                      <span className="truncate">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-bold text-gray-500 tracking-wider mb-2 px-1">SIGNATURE AUDIO ENGINE</h3>
              <div className="p-4 rounded-2xl bg-[#161616] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center" style={{ color: currentTheme.color }}>
                      <LuSlidersHorizontal size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Audio Effects</h4>
                      <p className="text-xs text-gray-400">Active: {activePreset}</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveSubPage("customEq")} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 flex items-center gap-1.5 hover:bg-white/20">
                    <LuSlidersHorizontal size={14} /> Custom EQ
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2 text-[11px] text-gray-400">
                  <LuHeadphones size={16} className="text-gray-400 shrink-0" />
                  <span>Audio Effects work best with headphones and Bluetooth devices.</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 max-h-60 overflow-y-auto pr-1">
                  {Object.keys(PRESETS).map(name => (
                    <button 
                      key={name} 
                      onClick={() => setActivePreset(name)}
                      className={`p-2.5 rounded-xl text-xs font-semibold text-left transition border ${activePreset === name ? "bg-white/10 border-white/30 text-white" : "bg-black/40 border-transparent text-gray-400 hover:text-gray-200"}`}
                      style={{ borderColor: activePreset === name ? currentTheme.color : undefined }}
                    >
                      {name}
                    </button>
                  ))}
                  <button 
                    onClick={() => setActivePreset("Custom EQ")}
                    className={`p-2.5 rounded-xl text-xs font-semibold text-left transition border ${activePreset === "Custom EQ" ? "bg-white/10 border-white/30 text-white" : "bg-black/40 border-transparent text-gray-400 hover:text-gray-200"}`}
                    style={{ borderColor: activePreset === "Custom EQ" ? currentTheme.color : undefined }}
                  >
                    Custom EQ (10-Band)
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button 
                onClick={() => setShowResetModal(true)}
                className="w-full p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-red-500/15 transition"
              >
                <LuRotateCcw size={16} /> Reset App Settings
              </button>
            </div>
          </div>
        )}

        {/* MP3 CONVERTER */}
        {activeSubPage === "converter" && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-[#161616] border border-white/5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">YouTube URL</label>
                <input 
                  type="text" 
                  placeholder="https://youtube.com/watch?v=..." 
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ borderColor: ytUrl ? currentTheme.color : undefined }}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">MP3 Quality</label>
                <div className="grid grid-cols-2 gap-2">
                  {["128 kbps", "192 kbps", "256 kbps", "320 kbps"].map(q => (
                    <button 
                      key={q} 
                      onClick={() => setQuality(q)}
                      className={`py-2.5 rounded-xl text-xs font-semibold transition border ${quality === q ? "bg-white/10 border-white/20 text-white" : "bg-black/30 border-transparent text-gray-400"}`}
                      style={{ borderColor: quality === q ? currentTheme.color : undefined }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleConvert}
                disabled={downloading}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-black shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: currentTheme.color }}
              >
                <LuDownload size={18} /> {downloading ? "Processing Stream..." : "Convert & Download"}
              </button>
            </div>

            {downloading && (
              <div className="p-4 rounded-2xl bg-[#161616] border border-white/5 space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Converting audio...</span>
                  <span style={{ color: currentTheme.color }}>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: currentTheme.color }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUPPORT AURA */}
        {activeSubPage === "support" && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-[#161616] border border-white/5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-500/10 text-red-500">
                  <LuHeartHandshake size={26} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Support Aura MP3</h3>
                  <p className="text-xs text-gray-400">100% Free & Independent Project</p>
                </div>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Aura MP3 has no forced subscriptions or advertisements. Voluntary contributions will support converter server resources and ongoing development.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#161616] border border-white/5 space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Voluntary Contributions</h4>
              <div className="grid grid-cols-3 gap-2">
                {["50", "100", "250"].map(amt => (
                  <button key={amt} className="py-3 rounded-xl font-bold text-sm bg-black/40 text-gray-300 border border-white/5">
                    ₹{amt}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setSupportToast(true)}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-white/10 border border-white/15 text-white hover:bg-white/15 transition flex items-center justify-center gap-2"
              >
                Proceed to Support
              </button>

              {supportToast && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <p className="text-xs font-semibold text-amber-300">Support is coming soon. Thank you for supporting Aura MP3.</p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <LuShield size={20} />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-gray-200">Independent & Ad-Free</h5>
                <p className="text-[11px] text-gray-500 leading-snug">All playback features and local converter capabilities will remain free.</p>
              </div>
            </div>
          </div>
        )}
        
       {/* ABOUT AURA MP3 */}
        {activeSubPage === "about" && (
          <div className="space-y-6 pt-4 flex flex-col items-center">
            <div className="w-full p-6 rounded-2xl bg-[#161616] border border-white/5 text-center space-y-4">
              <img
                src="https://res.cloudinary.com/dsfwafyc2/image/upload/v1788002720/file_000000004c3c8208901f4689fbfffe83_acvivm.png"
                alt="Aura MP3 Logo"
                className="w-16 h-16 mx-auto object-contain"
              />
              <div className="space-y-1">
                <h3 className="text-xs font-bold tracking-widest text-gray-400 uppercase">POWERED BY METUPOLO™</h3>
                <p className="text-sm font-bold tracking-wider text-white uppercase">DEVELOPED BY ROX</p>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
                Aura MP3 is an independent, privacy-first music player built with a focus on simplicity, speed, and a beautiful listening experience.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10">
                  Version 1.0 (Release)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PRIVACY POLICY */}
        {activeSubPage === "privacy" && (
          <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
            <div className="p-5 rounded-2xl bg-[#161616] border border-white/5 space-y-3">
              <h3 className="text-sm font-bold text-white">Privacy Commitment</h3>
              <ul className="space-y-2.5 text-gray-400 list-disc list-inside">
                <li><strong className="text-gray-200">No Server Uploads:</strong> Aura MP3 does not upload or store your local music files on our servers.</li>
                <li><strong className="text-gray-200">No Account Required:</strong> You never need to sign up, log in, or share personal information.</li>
                <li><strong className="text-gray-200">Local Device Storage:</strong> Your playlists, audio settings, and custom EQ presets remain stored strictly on your local device.</li>
                <li><strong className="text-gray-200">Zero Tracking:</strong> We do not track or monetize your listening habits.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TERMS & CONDITIONS */}
        {activeSubPage === "terms" && (
          <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
            <div className="p-5 rounded-2xl bg-[#161616] border border-white/5 space-y-3">
              <h3 className="text-sm font-bold text-white">Terms & Conditions</h3>
              <p className="text-gray-400">
                Aura MP3 is provided for personal, lawful use. Users are responsible for complying with applicable copyright laws in their country.
              </p>
              <ul className="space-y-2.5 text-gray-400 list-disc list-inside">
                <li><strong className="text-gray-200">Content Permissions:</strong> Users are responsible for ensuring they have appropriate rights for content processed via conversion tools.</li>
                <li><strong className="text-gray-200">Player Utility:</strong> Aura MP3 is intended only as a player and utility and does not endorse unauthorized copyright infringement.</li>
                <li><strong className="text-gray-200">Feature Updates:</strong> The developer may modify or update features to improve stability and performance.</li>
                <li><strong className="text-gray-200">External Platforms:</strong> Third-party services operate under their own independent policies.</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* HOME TAB */}
        {!activeSubPage && currentTab === "home" && homeView === "main" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div onClick={() => setHomeView("recentlyPlayed")} className="p-4 rounded-2xl bg-[#161616] border border-white/5 cursor-pointer hover:bg-[#1f1f1f] transition flex flex-col justify-between h-28">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><LuClock size={20} /></div>
                <div>
                  <h3 className="font-bold text-sm text-white">Recently played</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{recentlyPlayed.length} songs</p>
                </div>
              </div>

              <div onClick={() => setHomeView("recentlyAdded")} className="p-4 rounded-2xl bg-[#161616] border border-white/5 cursor-pointer hover:bg-[#1f1f1f] transition flex flex-col justify-between h-28">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center"><LuMusic size={20} /></div>
                <div>
                  <h3 className="font-bold text-sm text-white">Recently added</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{songs.length} songs</p>
                </div>
              </div>
            </div>

            <div onClick={() => setHomeView("folders")} className="p-4 rounded-2xl bg-[#161616] border border-white/5 cursor-pointer hover:bg-[#1f1f1f] transition flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center"><LuFolder size={22} /></div>
                <div>
                  <h3 className="font-bold text-sm text-white">Folder list</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Device Folders</p>
                </div>
              </div>
              <LuChevronRight size={20} className="text-gray-500" />
            </div>

            {/* Playlists */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Playlists</h3>
                <button 
                  onClick={() => {
                    const name = prompt("Enter playlist name:");
                    if (name) setPlaylists([...playlists, { id: `pl_${Date.now()}`, name, songIds: [] }]);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold" style={{ color: currentTheme.color }}
                >
                  <LuPlus size={16} /> New Playlist
                </button>
              </div>

              <div className="space-y-2">
                {playlists.map((pl) => (
                  <div key={pl.id} className="p-3.5 rounded-2xl bg-[#161616] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#1f1f1f] transition">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        {pl.isPinned ? <LuHeart size={18} className="text-red-500 fill-red-500" /> : <LuListMusic size={18} className="text-gray-400" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-white">{pl.name}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{pl.songIds.length} songs</p>
                      </div>
                    </div>
                    <LuSlidersHorizontal size={16} className="text-gray-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RECENTLY PLAYED */}
        {!activeSubPage && currentTab === "home" && homeView === "recentlyPlayed" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold mb-4 px-1">Continue Listening</h2>
            {recentlyPlayed.length === 0 ? (
              <div className="text-center py-16 px-4 bg-[#161616] rounded-2xl border border-white/5 space-y-2">
                <LuClock size={32} className="mx-auto text-gray-600" />
                <p className="text-sm font-semibold text-gray-400">No recently played tracks</p>
                <p className="text-xs text-gray-600">Songs you play will show up here.</p>
              </div>
            ) : (
              recentlyPlayed.map((song) => (
                <div key={song.id} onClick={() => playSong(song)} className="p-3.5 rounded-2xl bg-[#161616] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#1f1f1f]">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><LuMusic size={20} /></div>
                    <div>
                      <h4 className="font-semibold text-sm text-white">{song.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{song.artist}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* RECENTLY ADDED */}
        {!activeSubPage && currentTab === "home" && homeView === "recentlyAdded" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold mb-4 px-1">Recently Added Songs</h2>
            {songs.length === 0 ? (
              <div className="text-center py-16 px-4 bg-[#161616] rounded-2xl border border-white/5 space-y-2">
                <LuMusic size={32} className="mx-auto text-gray-600" />
                <p className="text-sm font-semibold text-gray-400">No songs imported</p>
                <p className="text-xs text-gray-600">Import songs to build your library.</p>
              </div>
            ) : (
              songs.map((song) => (
                <div key={song.id} onClick={() => playSong(song)} className="p-3.5 rounded-2xl bg-[#161616] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#1f1f1f]">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center"><LuMusic size={20} /></div>
                    <div>
                      <h4 className="font-semibold text-sm text-white">{song.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{song.artist}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* FOLDERS VIEW */}
        {!activeSubPage && currentTab === "home" && homeView === "folders" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold mb-4 px-1">Folder Directories</h2>
            <div className="p-4 rounded-2xl bg-[#161616] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#1f1f1f]" onClick={() => fileInputRef.current?.click()}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center"><LuFolder size={22} /></div>
                <div>
                  <h4 className="font-semibold text-sm text-white">Import Device Audio</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Select local audio files</p>
                </div>
              </div>
              <LuChevronRight size={20} className="text-gray-500" />
            </div>
          </div>
        )}

        {/* LIBRARY TAB */}
        {!activeSubPage && currentTab === "library" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex gap-2">
                {(["songs", "artists", "albums"] as const).map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setLibrarySubTab(tab)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition ${librarySubTab === tab ? "bg-white text-black" : "bg-white/5 text-gray-400 hover:text-white"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="text-xs font-semibold flex items-center gap-1" style={{ color: currentTheme.color }}>
                <LuPlus size={16} /> Import
              </button>
            </div>

            {songs.length === 0 ? (
              <div className="text-center py-20 px-4 bg-[#161616] rounded-2xl border border-white/5 space-y-3">
                <LuMusic size={40} className="mx-auto text-gray-600" />
                <p className="text-sm font-semibold text-gray-300">No music found</p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">Import songs from your device or convert tracks with the MP3 Converter to get started.</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-black shadow-lg"
                  style={{ backgroundColor: currentTheme.color }}
                >
                  Import Local Audio
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {songs.map((song) => (
                  <div key={song.id} onClick={() => playSong(song)} className="p-3.5 rounded-2xl bg-[#161616] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#1f1f1f]">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-gray-400"><LuMusic size={20} /></div>
                      <div>
                        <h4 className="font-semibold text-sm text-white">{song.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{song.artist}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* SEARCH TAB */}
        {!activeSubPage && currentTab === "search" && (
          <div className="space-y-4">
            <div className="relative">
              <LuSearch className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Search local library..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161616] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none"
                style={{ borderColor: searchQuery ? currentTheme.color : undefined }}
              />
            </div>

            {songs.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="text-center py-20 text-gray-600 text-xs">No matching audio files found.</div>
            ) : (
              <div className="space-y-2">
                {songs.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map((song) => (
                  <div key={song.id} onClick={() => playSong(song)} className="p-3.5 rounded-2xl bg-[#161616] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#1f1f1f]">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-gray-400"><LuMusic size={20} /></div>
                      <div>
                        <h4 className="font-semibold text-sm text-white">{song.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{song.artist}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MORE TAB */}
        {!activeSubPage && currentTab === "more" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[11px] font-bold text-gray-500 tracking-wider mb-2 px-1">TOOLS & PREFERENCES</h3>
              <div className="space-y-2">
                <div onClick={() => setActiveSubPage("converter")} className="p-4 rounded-2xl bg-[#161616] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#1f1f1f]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center"><LuFileAudio size={20} /></div>
                    <div>
                      <h4 className="font-semibold text-sm text-white">MP3 Converter</h4>
                      <p className="text-xs text-gray-400">Download audio from YouTube</p>
                    </div>
                  </div>
                  <LuChevronRight size={18} className="text-gray-500" />
                </div>

                <div onClick={() => setActiveSubPage("settings")} className="p-4 rounded-2xl bg-[#161616] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#1f1f1f]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><LuSettings size={20} /></div>
                    <div>
                      <h4 className="font-semibold text-sm text-white">Settings</h4>
                      <p className="text-xs text-gray-400">Theme, 10-Band EQ & Reset</p>
                    </div>
                  </div>
                  <LuChevronRight size={18} className="text-gray-500" />
                </div>

                <div onClick={() => setActiveSubPage("support")} className="p-4 rounded-2xl bg-[#161616] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#1f1f1f]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center"><LuHeartHandshake size={20} /></div>
                    <div>
                      <h4 className="font-semibold text-sm text-white">Support Aura</h4>
                      <p className="text-xs text-gray-400">Voluntary contributions</p>
                    </div>
                  </div>
                  <LuChevronRight size={18} className="text-gray-500" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-bold text-gray-500 tracking-wider mb-2 px-1">LEGAL & ABOUT</h3>
              <div className="space-y-1">
                {[
                  { id: "privacy", icon: <LuShield size={18} />, label: "Privacy Policy" },
                  { id: "terms", icon: <LuFileText size={18} />, label: "Terms & Conditions" },
                  { id: "about", icon: <LuInfo size={18} />, label: "About Aura MP3" },
                ].map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => setActiveSubPage(item.id as any)}
                    className="p-3.5 rounded-xl hover:bg-[#161616] flex items-center justify-between text-sm text-gray-300 cursor-pointer border border-transparent hover:border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <LuChevronRight size={16} className="text-gray-600" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
      
      {/* Full Player Modal */}
      <AnimatePresence>
        {isPlayerExpanded && (
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-[#0B0B0B] flex flex-col px-6 py-8"
          >
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setIsPlayerExpanded(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
                <LuX size={24} />
              </button>
              <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Now Playing</span>
              <button onClick={() => { setIsPlayerExpanded(false); setActiveSubPage("settings"); }} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
                <LuSlidersHorizontal size={24} />
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center">
              <div className="w-64 h-64 md:w-80 md:h-80 rounded-3xl bg-[#181818] shadow-2xl flex items-center justify-center border border-white/5 mb-10" style={{ boxShadow: `0 20px 50px ${currentTheme.color}20` }}>
                 <LuMusic size={80} style={{ color: currentTheme.color }} className="opacity-50" />
              </div>
              
              <div className="w-full flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{currentSong?.title || "No Track Selected"}</h2>
                  <p className="text-md" style={{ color: currentTheme.color }}>{currentSong?.artist || "Aura MP3"}</p>
                </div>
                <button className="p-3 text-gray-400 hover:text-white transition"><LuHeart size={26} /></button>
              </div>

              <div className="w-full mb-8">
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: isPlaying ? '35%' : '0%', backgroundColor: currentTheme.color }} />
                </div>
              </div>

              <div className="w-full flex justify-between items-center px-2">
                <button className="text-gray-400 hover:text-white transition"><LuShuffle size={24} /></button>
                <button className="text-white hover:text-gray-300 transition"><LuSkipBack size={32} className="fill-current" /></button>
                <button 
                  onClick={togglePlay} 
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
                  style={{ backgroundColor: currentTheme.color, boxShadow: `0 8px 25px ${currentTheme.color}50` }}
                >
                  {isPlaying ? <LuPause size={32} className="fill-current text-black" /> : <LuPlay size={32} className="fill-current ml-1 text-black" />}
                </button>
                <button className="text-white hover:text-gray-300 transition"><LuSkipForward size={32} className="fill-current" /></button>
                <button className="text-gray-400 hover:text-white transition"><LuRepeat size={24} /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Player */}
      <AnimatePresence>
        {!isPlayerExpanded && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={() => setIsPlayerExpanded(true)}
            className="fixed bottom-16 left-3 right-3 z-40 cursor-pointer"
          >
            <div className="glass-panel rounded-2xl p-3 flex flex-col shadow-2xl relative overflow-hidden bg-[#181818]/95 border border-white/10">
              <div className="absolute top-0 left-0 h-[2px] transition-all duration-300" style={{ width: isPlaying ? '35%' : '0%', backgroundColor: currentTheme.color, boxShadow: `0 0 8px ${currentTheme.color}` }} />

              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#222] flex items-center justify-center shadow-inner border border-white/5" style={{ color: currentTheme.color }}>
                    <LuMusic size={20} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Now Playing</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-gray-300">{activePreset}</span>
                    </div>
                    <h4 className="font-bold text-sm tracking-wide mt-0.5 text-white truncate max-w-[180px]">{currentSong?.title || "No Track Selected"}</h4>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={(e) => e.stopPropagation()} className="p-2 text-gray-400 hover:text-white transition"><LuSkipBack size={18} className="fill-current" /></button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
                    className="p-2 text-white hover:text-gray-200 transition"
                  >
                    {isPlaying ? <LuPause size={22} className="fill-current" /> : <LuPlay size={22} className="fill-current" />}
                  </button>
                  <button onClick={(e) => e.stopPropagation()} className="p-2 text-gray-400 hover:text-white transition"><LuSkipForward size={18} className="fill-current" /></button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6"
          >
            <div className="p-6 rounded-3xl bg-[#161616] border border-white/10 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                <LuRotateCcw size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset App Settings?</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Reset accent theme, audio preset, custom equalizer, and app preferences?
                </p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-2">
                  Your songs, playlists and downloaded music will NOT be deleted.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowResetModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs transition">Cancel</button>
                <button onClick={handleResetSettings} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs shadow-lg transition active:scale-95">Reset</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#121212]/95 backdrop-blur-lg border-t border-white/5 px-6 py-2.5 flex justify-around items-center">
        {[
          { id: "home", label: "Home", icon: <LuHouse size={20} /> },
          { id: "library", label: "Library", icon: <LuLibrary size={20} /> },
          { id: "search", label: "Search", icon: <LuSearch size={20} /> },
          { id: "more", label: "More", icon: <LuSlidersHorizontal size={20} /> },
        ].map(tab => {
          const isActive = currentTab === tab.id && !activeSubPage;
          return (
            <button
              key={tab.id}
              onClick={() => { setCurrentTab(tab.id as any); setHomeView("main"); setActiveSubPage(null); }}
              className={`flex flex-col items-center gap-1 transition ${isActive ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              <span style={{ color: isActive ? currentTheme.color : undefined }}>{tab.icon}</span>
              <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}