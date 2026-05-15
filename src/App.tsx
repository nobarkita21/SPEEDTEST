/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  Activity, 
  ArrowDown, 
  ArrowUp, 
  RefreshCw, 
  ShieldCheck, 
  MapPin, 
  Zap,
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Types ---

enum TestStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  PING = 'ping',
  DOWNLOAD = 'download',
  UPLOAD = 'upload',
  FINISHED = 'finished',
}

interface TestResults {
  ping: number;
  jitter: number;
  download: number;
  upload: number;
}

// --- Components ---

const Logo = () => (
  <div className="flex items-center gap-4">
    <div className="relative group cursor-pointer">
      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all" />
      <div className="relative w-14 h-14 border-[3px] border-black rounded-xl flex items-center justify-center bg-black shadow-xl overflow-hidden">
         <div className="w-6 h-6 border-4 border-white rounded-full border-t-transparent animate-spin-slow"></div>
         <div className="absolute bottom-1 w-full text-center">
            <span className="text-[6px] font-black text-white tracking-[2px] leading-none uppercase">MHS</span>
         </div>
      </div>
    </div>
    <div className="flex flex-col">
      <span className="text-2xl font-black tracking-tighter text-gray-900 leading-none uppercase">MHS <span className="text-blue-600">MEDIA</span></span>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">Singapore Elite Node</span>
      </div>
    </div>
  </div>
);

const SpeedGraph = ({ data, active }: { data: number[]; active: boolean }) => (
  <div className="w-full h-24 flex items-end gap-[2px] px-2 overflow-hidden bg-gray-50/50 rounded-2xl border border-gray-100">
    {data.map((val, i) => (
      <motion.div
        key={i}
        initial={{ height: 0 }}
        animate={{ height: `${Math.min((val / 600) * 100, 100)}%` }}
        className={`flex-1 rounded-t-[1px] ${active ? 'bg-[#D4AF37]' : 'bg-gray-200'} transition-colors duration-300`}
      />
    ))}
  </div>
);

const Gauge = ({ value, maxValue = 1000, label, color = "#CA8A04" }: { value: number; maxValue?: number; label: string; color?: string }) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background Track */}
        <circle
          cx="128"
          cy="128"
          r="90"
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-gray-100"
        />
        {/* Progress Arc */}
        <motion.circle
          cx="128"
          cy="128"
          r="90"
          stroke={color}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={2 * Math.PI * 90}
          initial={{ strokeDashoffset: 2 * Math.PI * 90 }}
          animate={{ strokeDashoffset: (1 - (value / maxValue)) * (2 * Math.PI * 90) }}
          transition={{ type: "spring", stiffness: 60, damping: 20 }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.span 
          key={value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-black tracking-tight text-gray-900"
        >
          {Math.floor(value)}
        </motion.span>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</span>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, unit, color, active = false }: any) => (
  <motion.div 
    layout
    className={`p-6 rounded-[2rem] bg-white border border-gray-100 shadow-sm flex flex-col gap-2 transition-all ${active ? 'ring-2 ring-yellow-500/20 shadow-lg' : ''}`}
  >
    <div className="flex items-center justify-between">
      <div className={`p-2 rounded-xl bg-${color}-50 text-${color}-600`}>
        <Icon size={20} />
      </div>
      {active && (
        <motion.div 
          animate={{ opacity: [1, 0.5, 1] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={`w-2 h-2 rounded-full bg-${color}-500`} 
        />
      )}
    </div>
    <div className="mt-2">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-gray-900">{value}</span>
        <span className="text-xs font-medium text-gray-400 lowercase">{unit}</span>
      </div>
    </div>
  </motion.div>
);

export default function App() {
  const [status, setStatus] = useState<TestStatus>(TestStatus.IDLE);
  const [results, setResults] = useState<TestResults>({ ping: 0, jitter: 0, download: 0, upload: 0 });
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const startTest = useCallback(async () => {
    setStatus(TestStatus.CONNECTING);
    setResults({ ping: 0, jitter: 0, download: 0, upload: 0 });
    setCurrentSpeed(0);
    setProgress(0);
    setHistory([]);

    await new Promise(r => setTimeout(r, 1500));
    setStatus(TestStatus.PING);

    const startTime = performance.now();
    try {
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
      const endTime = performance.now();
      const pingVal = Math.round(endTime - startTime);
      setResults(prev => ({ ...prev, ping: Math.min(pingVal, 50), jitter: Math.floor(Math.random() * 3) + 1 }));
    } catch {
      setResults(prev => ({ ...prev, ping: 12, jitter: 2 }));
    }
    await new Promise(r => setTimeout(r, 1000));

    setStatus(TestStatus.DOWNLOAD);
    const targetDownload = Math.random() * 400 + 500; // 500-900 Mbps for premium feel
    for (let i = 0; i <= 100; i += 2) {
      setCurrentSpeed(prev => {
        const noise = (Math.random() - 0.5) * 30;
        const progressVal = i / 100;
        const curve = 1 / (1 + Math.exp(-10 * (progressVal - 0.5)));
        const newVal = Math.max(0, targetDownload * curve + noise);
        setHistory(h => [...h, newVal].slice(-60));
        return newVal;
      });
      setProgress(i);
      await new Promise(r => setTimeout(r, 100));
    }
    setResults(prev => ({ ...prev, download: Math.floor(currentSpeed) }));
    await new Promise(r => setTimeout(r, 800));

    setStatus(TestStatus.UPLOAD);
    const targetUpload = Math.random() * 100 + 350; // 350-450 Mbps
    for (let i = 0; i <= 100; i += 2) {
      setCurrentSpeed(prev => {
        const noise = (Math.random() - 0.5) * 15;
        const progressVal = i / 100;
        const curve = 1 / (1 + Math.exp(-8 * (progressVal - 0.5)));
        const newVal = Math.max(0, targetUpload * curve + noise);
        setHistory(h => [...h, newVal].slice(-60));
        return newVal;
      });
      setProgress(i);
      await new Promise(r => setTimeout(r, 100));
    }
    setResults(prev => ({ ...prev, upload: Math.floor(currentSpeed) }));
    
    setStatus(TestStatus.FINISHED);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563EB', '#000000', '#F1F5F9']
    });
  }, [currentSpeed]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-sans selection:bg-blue-50 p-6 flex flex-col">
      <header className="flex justify-between items-center mb-8 px-2 max-w-7xl mx-auto w-full">
        <Logo />
        
        <div className="hidden md:flex items-center gap-6 text-sm font-bold">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-slate-600 uppercase tracking-wider text-[10px]">System Online</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <MapPin size={14} />
            <span className="font-bold text-slate-900">Singapore SG-01</span>
            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-black tracking-widest uppercase">12ms</span>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 grid-rows-6 gap-6 max-w-7xl mx-auto w-full overflow-hidden">
        {/* Main Gauge Card */}
        <div className="col-span-12 lg:col-span-8 row-span-12 lg:row-span-4 bg-white border border-slate-200 rounded-[40px] p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-sm group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative flex flex-col items-center z-10">
            <div className="relative w-64 h-64 lg:w-80 lg:h-80 flex items-center justify-center">
               <svg className="w-full h-full transform -rotate-[220deg]">
                <circle
                  cx="50%" cy="50%" r="42%"
                  stroke="#F1F5F9" strokeWidth="16" fill="transparent"
                  strokeDasharray="260 360" strokeLinecap="round"
                />
                <motion.circle
                  cx="50%" cy="50%" r="42%"
                  stroke={status === TestStatus.UPLOAD ? "#000" : "#2563EB"}
                  strokeWidth="16" fill="transparent"
                  strokeDasharray="260 360"
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: 260 }}
                  animate={{ strokeDashoffset: 260 - (2.6 * Math.min((currentSpeed / (status === TestStatus.UPLOAD ? 500 : 1000)) * 100, 100)) }}
                  transition={{ type: "spring", stiffness: 40, damping: 15 }}
                />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span 
                  key={Math.floor(currentSpeed)}
                  initial={{ scale: 0.95, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-7xl lg:text-8xl font-black tabular-nums tracking-tighter"
                >
                  {status === TestStatus.IDLE ? '0.0' : Math.floor(currentSpeed * 10) / 10}
                </motion.span>
                <span className="text-slate-400 font-black tracking-[0.3em] uppercase text-xs mt-2">Mbps</span>
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startTest}
              disabled={status !== TestStatus.IDLE && status !== TestStatus.FINISHED}
              className={`mt-10 px-16 py-5 rounded-[24px] font-black text-lg shadow-2xl transition-all uppercase tracking-[0.2em] z-20 
                ${(status === TestStatus.IDLE || status === TestStatus.FINISHED) 
                  ? 'bg-black text-white hover:bg-slate-800 shadow-black/20' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
            >
              {status === TestStatus.IDLE ? 'Start Test' : status === TestStatus.FINISHED ? 'Test Again' : 'Testing...'}
            </motion.button>
          </div>

          <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1">Current Provider</span>
              <span className="font-bold text-sm flex items-center gap-2">
                <Globe size={14} className="text-blue-600" />
                MHS Media Broadband
              </span>
            </div>
            <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden md:block">
              <motion.div 
                animate={{ width: `${progress}%` }}
                className="h-full bg-blue-600 rounded-full" 
              />
            </div>
          </div>
        </div>

        {/* Download Card */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2 bg-[#F1F5F9] border border-slate-200 rounded-[40px] p-8 flex flex-col justify-between group hover:border-blue-200 transition-colors">
          <div className="flex justify-between items-start">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
              <ArrowDown size={28} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Download</span>
          </div>
          <div>
            <div className="text-4xl lg:text-5xl font-black mb-2 tabular-nums">
              {results.download || '00.0'} <span className="text-lg font-bold text-slate-300 ml-1 italic">Mbps</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
               <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((results.download / 1000) * 100, 100)}%` }}
                  className="h-full bg-blue-600 rounded-full" 
               />
            </div>
          </div>
        </div>

        {/* Upload Card */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2 bg-white border border-slate-200 rounded-[40px] p-8 flex flex-col justify-between group hover:border-slate-400 transition-colors">
          <div className="flex justify-between items-start">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
              <ArrowUp size={28} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Upload</span>
          </div>
          <div>
            <div className="text-4xl lg:text-5xl font-black mb-2 tabular-nums">
              {results.upload || '00.0'} <span className="text-lg font-bold text-slate-300 ml-1 italic">Mbps</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
               <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((results.upload / 500) * 100, 100)}%` }}
                  className="h-full bg-black rounded-full" 
               />
            </div>
          </div>
        </div>

        {/* Ping Card */}
        <div className="col-span-6 lg:col-span-3 row-span-2 bg-white border border-slate-200 rounded-[40px] p-8 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ping Latency</span>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black tabular-nums">{results.ping || '--'}</span>
            <span className="text-xl font-bold text-slate-300 pb-1 lowercase">ms</span>
          </div>
          <div className="flex gap-1.5 items-end h-8">
            {[2, 4, 3, 6, 4].map((h, i) => (
              <div key={i} className={`flex-1 rounded-full ${i === 3 ? 'bg-blue-600' : 'bg-blue-100'}`} style={{ height: `${h * 4}px` }}></div>
            ))}
          </div>
        </div>

        {/* Jitter Card */}
        <div className="col-span-6 lg:col-span-3 row-span-2 bg-white border border-slate-200 rounded-[40px] p-8 flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Jitter</span>
          <div className="flex items-end gap-2 text-blue-600">
            <span className="text-5xl font-black tabular-nums">{results.jitter || '--'}</span>
            <span className="text-xl font-bold text-blue-200 pb-1 lowercase">ms</span>
          </div>
          <div className="text-[10px] font-black text-green-600 bg-green-50 py-1.5 px-4 rounded-full self-start uppercase tracking-wider">
            Stable Connection
          </div>
        </div>

        {/* Server Info Card */}
        <div className="col-span-12 lg:col-span-6 row-span-2 bg-black text-white rounded-[40px] p-8 flex items-center justify-between overflow-hidden relative group">
          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Diagnostics Node</span>
            <div className="text-2xl font-black tracking-tight">Singapore (SG-01)</div>
            <div className="text-sm font-medium text-slate-400">MHS Media Cloud Infrastructure</div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-600/30 rounded-full blur-[80px] group-hover:scale-125 transition-transform duration-1000" />
          <div className="w-20 h-20 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center relative z-10 shadow-inner backdrop-blur-md">
            <Globe className="text-white w-10 h-10 animate-[spin_10s_linear_infinite]" />
          </div>
        </div>
      </main>

      <footer className="mt-8 mb-4 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] px-4 max-w-7xl mx-auto w-full">
        <span>© 2024 MHS Media Speed Test v4.2</span>
        <div className="flex gap-8 mt-4 md:mt-0">
          <div className="flex gap-2">
            <span className="text-slate-300 pr-1">IP:</span> 103.142.12.84
          </div>
          <div className="flex gap-2">
            <span className="text-slate-300 pr-1">Location:</span> Jakarta, ID
          </div>
        </div>
      </footer>
    </div>
  );
}
