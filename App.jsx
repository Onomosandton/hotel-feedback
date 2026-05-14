import React, { useState, useMemo, useEffect } from 'react';
import { 
  Home, 
  PlusCircle, 
  List, 
  ThumbsUp, 
  ThumbsDown, 
  DollarSign, 
  Award, 
  Building2, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Lightbulb,
  FileText,
  X,
  Mail,
  Send,
  Download,
  Camera,
  MessageSquare,
  Activity,
  Phone,
  Loader2,
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
const localFirebaseConfig = {
  apiKey: "AIzaSyDWr2-WWHUEKp5rVRHisgBulm3GmKJAUlU",
  authDomain: "hotel-feedback-app-abbaa.firebaseapp.com",
  projectId: "hotel-feedback-app-abbaa",
  storageBucket: "hotel-feedback-app-abbaa.firebasestorage.app",
  messagingSenderId: "947480682084",
  appId: "1:947480682084:web:648898e9970b6f3a630971",
  measurementId: "G-MDF60ENP25"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : localFirebaseConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const SHARED_APP_ID = "hotel_feedback_main_sync";

const DEPARTMENTS = [
  'Front Desk', 'Housekeeping', 'Food & Beverage', 'Maintenance', 'Concierge', 'Spa & Wellness', 'Valet/Parking'
];

const analyzeSentiment = (text) => {
  const lower = (text || "").toLowerCase();
  if (/(furious|unacceptable|terrible|worst|disgusting|outrageous|angry)/.test(lower)) return { label: 'Furious', emoji: '😡', color: 'text-red-700 bg-red-100 border-red-200' };
  if (/(slow|dirty|broken|rude|bad|poor|annoyed|wait)/.test(lower)) return { label: 'Irritated', emoji: '😠', color: 'text-orange-700 bg-orange-100 border-orange-200' };
  if (/(great|excellent|amazing|love|perfect|wonderful|best)/.test(lower)) return { label: 'Delighted', emoji: '🤩', color: 'text-green-700 bg-green-100 border-green-200' };
  if (/(good|nice|friendly|clean|helpful|happy)/.test(lower)) return { label: 'Happy', emoji: '😊', color: 'text-teal-700 bg-teal-100 border-teal-200' };
  return { label: 'Neutral', emoji: '😐', color: 'text-gray-700 bg-gray-100 border-gray-200' };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [entries, setEntries] = useState([]);
  const [currency, setCurrency] = useState('$');
  const [toast, setToast] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error('Auth Error:', error);
        setCloudError(`Auth Failed: ${error.message}`);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return; 

    const entriesRef = collection(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'feedback_entries');
    
    const unsubscribe = onSnapshot(entriesRef, 
      (snapshot) => {
        const loadedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadedEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(loadedEntries);
        setLastSync(new Date().toLocaleTimeString());
        setLoading(false);
        setCloudError(null);
      },
      (error) => {
        console.error('Firestore Error:', error);
        setCloudError(`Database Error: ${error.message}. Please click "Publish" in your Firebase Rules tab.`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addEntry = async (newEntry) => {
    if (!user) return showToast('Error: Connection pending...');
    try {
      const entriesRef = collection(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'feedback_entries');
      await addDoc(entriesRef, { ...newEntry, userId: user.uid });
      setActiveTab('history'); 
      showToast('Synced to all devices!');
    } catch (error) {
      showToast(`Save failed: ${error.message}`);
    }
  };

  const resolveEntry = async (id) => {
    if (!user) return;
    try {
      const entryRef = doc(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'feedback_entries', id);
      await updateDoc(entryRef, { status: 'resolved', resolvedAt: new Date().toISOString() });
      showToast('Status updated!');
    } catch (error) { console.error(error); }
  };

  const addComment = async (id, commentText, authorName) => {
    if (!user) return;
    try {
      const entryRef = doc(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'feedback_entries', id);
      await updateDoc(entryRef, {
        comments: arrayUnion({ 
          text: commentText, 
          author: authorName || 'Staff', 
          time: new Date().toISOString() 
        })
      });
    } catch (error) { console.error(error); }
  };

  if (loading && !cloudError) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center max-w-md mx-auto p-10 text-center">
        <Loader2 className="animate-spin text-indigo-600 mb-6" size={60} />
        <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">Authenticating</h2>
        <p className="text-gray-400 mt-2 italic text-sm">Securing database connection...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {toast && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-[90%] bg-gray-800 text-white px-4 py-3 rounded-xl shadow-2xl z-50 text-sm text-center font-bold flex items-center justify-center animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={18} className="text-green-400 mr-2" /> {toast}
        </div>
      )}

      <header className="bg-indigo-900 text-white p-4 shadow-md z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Feedback Tracker</h1>
            <div className="flex items-center text-[9px] text-indigo-300 font-bold tracking-widest mt-1">
              <RefreshCw size={8} className="mr-1 animate-spin" /> {user ? "SYNC CONNECTED" : "OFFLINE"}
            </div>
          </div>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-indigo-800 text-white border border-indigo-700 rounded p-1 text-xs font-bold outline-none">
            <option value="$">USD ($)</option>
            <option value="€">EUR (€)</option>
            <option value="£">GBP (£)</option>
            <option value="R">ZAR (R)</option>
          </select>
        </div>
      </header>
      
      {cloudError && (
        <div className="bg-red-600 text-white px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center z-20 flex flex-col items-center justify-center leading-tight shadow-xl">
          <div className="flex items-center mb-1 text-sm text-white">
            <AlertCircle size={18} className="mr-2 shrink-0 animate-pulse" /> ACCESS DENIED
          </div>
          <p className="opacity-90 font-bold mb-2">{cloudError}</p>
          <button onClick={() => window.location.reload()} className="bg-white text-red-600 px-4 py-1 rounded-full font-black text-[9px]">Retry Sync</button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-32 relative">
        {activeTab === 'dashboard' && <Dashboard entries={entries} currency={currency} onOpenTicketsClick={() => { setHistoryFilter('open'); setActiveTab('history'); }} />}
        {activeTab === 'add' && <AddEntryForm onSave={addEntry} currency={currency} />}
        {activeTab === 'history' && <History entries={entries} onResolve={resolveEntry} onAddComment={addComment} currency={currency} filter={historyFilter} setFilter={setHistoryFilter} />}
      </main>

      <nav className="bg-white border-t border-gray-100 absolute bottom-0 w-full flex justify-around p-2 z-10 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {['dashboard', 'add', 'history'].map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); if(tab==='history') setHistoryFilter('all'); }} className={`flex flex-col items-center p-2 rounded-xl w-1/3 transition-all ${activeTab === tab ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400'}`}>
            {tab === 'dashboard' ? <Home size={24} /> : tab === 'add' ? <PlusCircle size={24} /> : <List size={24} />}
            <span className="text-[10px] font-black uppercase tracking-tighter mt-1">{tab}</span>
          </button>
        ))}
      </nav>
      
      <div className="absolute bottom-[72px] left-0 w-full bg-slate-900 text-white/60 px-3 py-2 text-[8px] font-mono flex flex-col space-y-1 z-10 border-t border-white/10 shadow-2xl">
        <div className="flex justify-between items-center">
            <div className="flex items-center space-x-1.5">
                <ShieldCheck size={10} className={user ? "text-green-400" : "text-amber-400"} />
                <span className="uppercase font-black tracking-widest text-white/90">Shared Database</span>
            </div>
            <span className={user ? "text-green-400" : "text-red-400"}>{user ? "ONLINE" : "ERROR"}</span>
        </div>
        <div className="flex justify-between items-center opacity-80 border-t border-white/5 pt-1 mt-1">
            <span>UID: <span className="text-blue-300">{user?.uid || "PENDING"}</span></span>
            <span>SYNC: <span className="text-white">{lastSync || "N/A"}</span></span>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTS ---

function Dashboard({ entries, currency, onOpenTicketsClick }) {
  const [range, setRange] = useState('30');
  const filtered = useMemo(() => {
    if (range === 'all') return entries;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(range));
    return entries.filter(e => new Date(e.date) >= cutoff);
  }, [entries, range]);

  const stats = useMemo(() => {
    let comps = 0, complaints = 0, cost = 0, open = 0;
    const depts = {}, staff = {};
    filtered.forEach(e => {
      if (e.type === 'compliment') {
        comps++;
        if (e.staffMentioned) staff[e.staffMentioned] = (staff[e.staffMentioned] || 0) + 1;
      } else {
        complaints++;
        cost += Number(e.cost) || 0;
        if (e.status === 'open') open++;
      }
      depts[e.department] = (depts[e.department] || 0) + 1;
    });
    return { 
      comps, complaints, cost, open,
      topDept: Object.keys(depts).length > 0 ? Object.keys(depts).reduce((a, b) => depts[a] > depts[b] ? a : b) : 'N/A',
      topStaff: Object.keys(staff).length > 0 ? Object.keys(staff).reduce((a, b) => staff[a] > staff[b] ? a : b) : 'N/A'
    };
  }, [filtered]);

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <select value={range} onChange={(e) => setRange(e.target.value)} className="bg-white border border-gray-200 text-xs font-black uppercase p-2 rounded-lg shadow-sm outline-none">
          <option value="1">Today</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
        <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Analytics</div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <StatBox label="Compliments" value={stats.comps} color="text-green-600 bg-green-50 border-green-100" />
        <StatBox label="Complaints" value={stats.complaints} color="text-red-600 bg-red-50 border-red-100" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Open Issues" value={stats.open} color="text-amber-600 bg-amber-50" onClick={onOpenTicketsClick} />
        <MetricCard label="Total Cost" value={`${currency}${stats.cost.toFixed(2)}`} color="text-gray-800 bg-white" />
        <MetricCard label="Star Staff" value={stats.topStaff} color="text-purple-600 bg-purple-50" />
        <MetricCard label="Busy Dept" value={stats.topDept} color="text-blue-600 bg-blue-50" />
      </div>

      <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6 flex items-center">
        <Activity size={14} className="mr-2 text-indigo-500" /> Trend (Last 7 Logs)
      </h2>
      <div className="bg-white p-4 pt-10 rounded-2xl border border-gray-100 h-32 flex items-end justify-between space-x-1 shadow-sm">
        {entries.slice(0, 7).reverse().map((e, i) => (
            <div key={i} className={`flex-1 rounded-t-md ${e.type === 'compliment' ? 'bg-green-400' : 'bg-red-400'}`} style={{ height: '100%' }}></div>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className={`${color} p-5 rounded-2xl border flex flex-col items-center justify-center`}>
      <span className="text-4xl font-black leading-none">{value}</span>
      <span className="text-[9px] font-black uppercase tracking-widest mt-2 opacity-70">{label}</span>
    </div>
  );
}

function MetricCard({ label, value, color, onClick }) {
  return (
    <div onClick={onClick} className={`${color} p-4 rounded-xl border border-gray-100 shadow-sm transition-transform active:scale-95 cursor-pointer`}>
      <span className="text-[8px] font-black uppercase tracking-widest opacity-50 block mb-1">{label}</span>
      <span className="text-sm font-black truncate block">{value}</span>
    </div>
  );
}

function AddEntryForm({ onSave, currency }) {
  const [type, setType] = useState('complaint');
  const [form, setForm] = useState({ guestName: '', guestEmail: '', guestPhone: '', department: DEPARTMENTS[0], reason: '', handledBy: '', actionTaken: '', cost: '', status: 'resolved' });

  const submit = (e) => {
    e.preventDefault();
    onSave({ ...form, type, date: new Date().toISOString(), sentiment: analyzeSentiment(form.reason), cost: Number(form.cost) || 0, comments: [] });
  };

  return (
    <form onSubmit={submit} className="p-4 space-y-4">
      <div className="flex bg-gray-200 rounded-xl p-1 shadow-inner">
        <button type="button" onClick={() => setType('compliment')} className={`flex-1 py-3 text-xs font-black uppercase rounded-lg transition-all ${type === 'compliment' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Compliment</button>
        <button type="button" onClick={() => setType('complaint')} className={`flex-1 py-3 text-xs font-black uppercase rounded-lg transition-all ${type === 'complaint' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Complaint</button>
      </div>
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <input required value={form.guestName} onChange={e=>setForm({...form, guestName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none" placeholder="Guest / Room No." />
        <select value={form.department} onChange={e=>setForm({...form, department: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none">{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select>
        <textarea required value={form.reason} onChange={e=>setForm({...form, reason: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none" placeholder="Reason..." />
        <textarea required value={form.actionTaken} onChange={e=>setForm({...form, actionTaken: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none" placeholder="Action Taken..." />
      </div>
      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
        <input required value={form.handledBy} onChange={e=>setForm({...form, handledBy: e.target.value})} className="w-full bg-white border border-indigo-200 rounded-xl p-4 text-sm font-black text-indigo-700 outline-none" placeholder="Your Name" />
      </div>
      {type === 'complaint' && (
        <div className="grid grid-cols-2 gap-4">
          <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="bg-white border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none"><option value="open">Open</option><option value="resolved">Resolved</option></select>
          <input type="number" value={form.cost} onChange={e=>setForm({...form, cost: e.target.value})} className="bg-white border border-gray-200 rounded-xl p-4 text-sm font-black text-red-600 outline-none" placeholder="Cost" />
        </div>
      )}
      <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm transition-transform active:scale-95">Sync to Cloud</button>
    </form>
  );
}

function History({ entries, onResolve, onAddComment, currency, filter, setFilter }) {
  const [cmt, setCmt] = useState({});
  const filtered = entries.filter(e => filter === 'all' ? true : e.status === filter);

  if (entries.length === 0) return <div className="p-20 text-center font-black text-gray-300 uppercase text-xs italic">No records...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex bg-gray-200 rounded-xl p-1 mb-4 shadow-inner">
        {['all', 'open', 'resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${filter === f ? 'bg-white shadow text-indigo-700' : 'text-gray-400'}`}>{f}</button>
        ))}
      </div>
      {filtered.map(entry => (
        <div key={entry.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4" style={{ borderLeftColor: entry.type === 'compliment' ? '#10b981' : '#ef4444' }}>
          <div className="flex justify-between items-start mb-3">
            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black border ${entry.sentiment?.color || 'bg-gray-50 text-gray-400'}`}>{entry.sentiment?.label || 'Neutral'}</span>
            <span className="text-[9px] font-bold text-gray-300">{new Date(entry.date).toLocaleDateString()}</span>
          </div>
          <h3 className="font-black text-gray-800 text-lg leading-tight mb-1">{entry.guestName}</h3>
          <p className="text-sm font-bold text-gray-600 leading-snug">{entry.reason}</p>
          <div className="mt-4 p-4 bg-gray-50 rounded-xl text-xs text-gray-600 italic border border-gray-100">"{entry.actionTaken}"</div>
          <div className="mt-5 space-y-2">
            {entry.comments?.map((c, i) => (
              <div key={i} className="text-[10px] bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">
                <span className="font-black text-indigo-700 uppercase">{c.author}:</span> {c.text}
              </div>
            ))}
            <div className="flex space-x-2 mt-2">
              <input value={cmt[entry.id] || ''} onChange={e=>setCmt({...cmt, [entry.id]: e.target.value})} placeholder="Note..." className="flex-1 bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs outline-none" />
              <button onClick={()=>{ if(!cmt[entry.id]) return; onAddComment(entry.id, cmt[entry.id], "Staff"); setCmt({...cmt, [entry.id]:''}); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-[10px]">POST</button>
            </div>
          </div>
          {entry.status === 'open' && (
             <button onClick={() => onResolve(entry.id)} className="w-full bg-amber-500 text-white py-3 rounded-xl text-[10px] font-black uppercase mt-4 shadow-lg">Close Ticket</button>
          )}
        </div>
      ))}
    </div>
  );
}
  return <Clock {...props} />;
}
