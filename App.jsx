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
  Trophy,
  Medal,
  ShieldAlert,
  UserCheck,
  Users,
  UserX,
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

const CURRENCY_MAP = {
  '$': 'USD', '€': 'EUR', '£': 'GBP', 'R': 'ZAR'
};

// --- IMMUTABLE DIGITAL SOP ESCALATION MATRIX ---
const SOP_FRAMEWORK = {
  quick: {
    label: 'Quick Resolve',
    color: 'bg-teal-50 border-teal-200 text-teal-800',
    badge: 'text-teal-700 bg-teal-100 border-teal-200',
    authority: 'Line Staff Authorized',
    icon: <UserCheck size={16} className="text-teal-600" />,
    steps: 'Empowered for immediate resolution at the point of service. Authorized to apply minor bill corrections, room adjustments, or small courtesy food & beverage vouchers on the spot.'
  },
  intermediate: {
    label: 'Intermediate Escalation',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    badge: 'text-blue-700 bg-blue-100 border-blue-200',
    authority: 'Supervisor / HOD Required',
    icon: <Users size={16} className="text-blue-600" />,
    steps: 'Exceeds standard staff operational limits. The HOD or Duty Supervisor must take full ownership, physically connect or directly call the guest, and implement structured service recovery within 45 minutes.'
  },
  critical: {
    label: 'Critical Intervention',
    color: 'bg-red-50 border-red-200 text-red-800',
    badge: 'text-red-700 bg-red-100 border-red-200',
    authority: 'General Manager Mandate',
    icon: <ShieldAlert size={16} className="text-red-600 animate-pulse" />,
    steps: 'Severe operational incident or high-profile guest threat. Requires immediate background escalation alerts sent straight to the GM. Executive leadership must step in physically to handle resolution.'
  }
};

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
  const [exchangeRates, setExchangeRates] = useState({ USD: 1, EUR: 0.92, GBP: 0.79, ZAR: 18.50 });
  const [timeTicker, setTimeTicker] = useState(Date.now());

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => { if (data && data.rates) setExchangeRates(data.rates); })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const clockInterval = setInterval(() => setTimeTicker(Date.now()), 30000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
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

      // AUTOMATED WHATSAPP ROUTING
      if (newEntry.type === 'complaint' && (newEntry.department === 'Maintenance' || newEntry.department === 'Housekeeping' || newEntry.severity === 'critical')) {
        let alertHeading = newEntry.severity === 'critical' ? `🚨 *CRITICAL GM INTERVENTION REQUIRED* 🚨` : `🚨 *NEW TICKET ALERT* 🚨`;
        const formattedMsg = `${alertHeading}\n\n*SOP Status:* ${SOP_FRAMEWORK[newEntry.severity || 'quick'].label}\n*Dept:* ${newEntry.department}\n*Room/Guest:* ${newEntry.guestName}\n*Issue:* ${newEntry.reason}\n*Logged By:* ${newEntry.handledBy}\n\n_Action Required immediately according to operational SOP directives._`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedMsg)}`;
        setTimeout(() => { window.open(whatsappUrl, '_blank'); }, 800);
      }
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
    if (!user) return showToast('Error: Cloud connection pending.');
    try {
      const entryRef = doc(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'feedback_entries', id);
      await updateDoc(entryRef, {
        comments: arrayUnion({ text: commentText, author: authorName || 'Staff', time: new Date().toISOString() })
      });
      showToast('Team note successfully saved!');
    } catch (error) { 
      showToast(`Failed to save note: ${error.message}`);
    }
  };

  const markEmailSent = async (id, emailType) => {
    if (!user) return;
    try {
      const entryRef = doc(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'feedback_entries', id);
      const updateData = emailType === 'manager' ? { managerEmailSent: true } : emailType === 'escalation' ? { escalationSent: true } : { guestEmailSent: true };
      await updateDoc(entryRef, updateData);
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
          <CheckCircle size={18} className="text-green-400 mr-2 shrink-0" /> {toast}
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
            <option value="$">USD ($)</option><option value="€">EUR (€)</option><option value="£">GBP (£)</option><option value="R">ZAR (R)</option>
          </select>
        </div>
      </header>
      
      {cloudError && (
        <div className="bg-red-600 text-white px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center z-20 flex flex-col items-center justify-center leading-tight shadow-xl">
          <div className="flex items-center mb-1 text-sm text-white"><AlertCircle size={18} className="mr-2 shrink-0 animate-pulse" /> ACCESS DENIED</div>
          <p className="opacity-90 font-bold mb-2">{cloudError}</p>
          <button onClick={() => window.location.reload()} className="bg-white text-red-600 px-4 py-1 rounded-full font-black text-[9px]">Retry Sync</button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-32 relative">
        {activeTab === 'dashboard' && <Dashboard entries={entries} currency={currency} exchangeRates={exchangeRates} onOpenTicketsClick={() => { setHistoryFilter('open'); setActiveTab('history'); }} />}
        {activeTab === 'add' && <AddEntryForm onSave={addEntry} currency={currency} exchangeRates={exchangeRates} />}
        {activeTab === 'history' && <History entries={entries} onResolve={resolveEntry} onAddComment={addComment} onMarkEmailSent={markEmailSent} currency={currency} exchangeRates={exchangeRates} filter={historyFilter} setFilter={setHistoryFilter} ticker={timeTicker} />}
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
            <div className="flex items-center space-x-1.5"><ShieldCheck size={10} className={user ? "text-green-400" : "text-amber-400"} /><span className="uppercase font-black tracking-widest text-white/90">Shared Database</span></div>
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

function Dashboard({ entries, currency, exchangeRates, onOpenTicketsClick }) {
  const [range, setRange] = useState('30');
  const filtered = useMemo(() => {
    if (range === 'all') return entries;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(range));
    return entries.filter(e => new Date(e.date) >= cutoff);
  }, [entries, range]);

  const staffLeaderboard = useMemo(() => {
    const listMap = {};
    filtered.forEach(e => {
      if (e.type === 'compliment' && e.staffMentioned) {
        const cleanedName = e.staffMentioned.trim();
        if (cleanedName) listMap[cleanedName] = (listMap[cleanedName] || 0) + 1;
      }
    });
    return Object.entries(listMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filtered]);

  const stats = useMemo(() => {
    let comps = 0, complaints = 0, cost = 0, open = 0;
    const targetISO = CURRENCY_MAP[currency] || 'USD';
    const currentViewMultiplier = exchangeRates[targetISO] || 1;

    filtered.forEach(e => {
      if (e.type === 'compliment') {
        comps++;
      } else {
        complaints++;
        cost += ((Number(e.cost) || 0) * currentViewMultiplier);
        if (e.status === 'open') open++;
      }
    });
    return { comps, complaints, cost, open };
  }, [filtered, currency, exchangeRates]);

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <select value={range} onChange={(e) => setRange(e.target.value)} className="bg-white border border-gray-200 text-xs font-black uppercase p-2 rounded-lg shadow-sm outline-none">
          <option value="1">Today</option><option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="all">All Time</option>
        </select>
        <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Analytics</div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <StatBox label="Compliments" value={stats.comps} color="text-green-600 bg-green-50 border-green-100" />
        <StatBox label="Complaints" value={stats.complaints} color="text-red-600 bg-red-50 border-red-100" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Open Issues" value={stats.open} color="text-amber-600 bg-amber-50" onClick={onOpenTicketsClick} />
        <MetricCard label="Total Cost" value={`${currency}${stats.cost.toFixed(2)}`} color="text-gray-800 bg-white" />
      </div>

      <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6 flex items-center">
        <Trophy size={14} className="mr-2 text-purple-600" /> Staff Performance Board
      </h2>
      <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3.5 shadow-sm">
        {staffLeaderboard.map((member, index) => {
          const medalColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
          return (
            <div key={member.name} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
              <div className="flex items-center space-x-3 truncate">
                <span className="w-5 text-xs font-black text-gray-400 text-center">
                  {index < 3 ? <Medal size={16} className={medalColors[index]} /> : `${index + 1}`}
                </span>
                <span className="font-bold text-gray-800 truncate">{member.name}</span>
              </div>
              <span className="bg-purple-50 text-purple-700 font-black text-xs px-3 py-1 rounded-full shrink-0 flex items-center">
                 <ThumbsUp size={10} className="mr-1" /> {member.count} Praises
              </span>
            </div>
          );
        })}
        {staffLeaderboard.length === 0 && (
          <p className="text-center text-gray-300 italic text-[10px] py-2">No staff mentions captured yet.</p>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className={`${color} p-5 rounded-2xl border flex flex-col items-center justify-center`}><span className="text-4xl font-black leading-none">{value}</span><span className="text-[9px] font-black uppercase tracking-widest mt-2 opacity-70">{label}</span></div>
  );
}

function MetricCard({ label, value, color, onClick }) {
  return (
    <div onClick={onClick} className={`${color} p-4 rounded-xl border border-gray-100 shadow-sm transition-transform active:scale-95 cursor-pointer flex flex-col justify-between`}><span className="text-[8px] font-black uppercase tracking-widest opacity-50 block mb-1">{label}</span><span className="text-sm font-black truncate block leading-tight">{value}</span></div>
  );
}

function AddEntryForm({ onSave, currency, exchangeRates }) {
  const [type, setType] = useState('complaint');
  const [form, setForm] = useState({ 
    guestName: '', guestEmail: '', guestPhone: '', department: DEPARTMENTS[0], reason: '', 
    handledBy: '', actionTaken: '', cost: '', status: 'resolved', severity: 'quick',
    followUpEmail: '', followUpPhone: '', guestEmailSent: false, managerEmailSent: false, escalationSent: false, staffMentioned: ''
  });

  const submit = (e) => {
    e.preventDefault();
    const currentISO = CURRENCY_MAP[currency] || 'USD';
    const activeRateScale = exchangeRates[currentISO] || 1;
    const normalizedCostInUSD = (Number(form.cost) || 0) / activeRateScale;

    onSave({ 
      ...form, 
      type, 
      date: new Date().toISOString(), 
      sentiment: analyzeSentiment(form.reason), 
      cost: normalizedCostInUSD,
      severity: type === 'complaint' ? form.severity : 'quick',
      comments: [] 
    });
  };

  return (
    <form onSubmit={submit} className="p-4 space-y-4">
      <div className="flex bg-gray-200 rounded-xl p-1 shadow-inner">
        <button type="button" onClick={() => setType('compliment')} className={`flex-1 py-3 text-xs font-black uppercase rounded-lg transition-all ${type === 'compliment' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Compliment</button>
        <button type="button" onClick={() => setType('complaint')} className={`flex-1 py-3 text-xs font-black uppercase rounded-lg transition-all ${type === 'complaint' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Complaint</button>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-300 border-b pb-2">Guest Identity</h3>
        <input required value={form.guestName} onChange={e=>setForm({...form, guestName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none" placeholder="Name / Room No." />
        <div className="grid grid-cols-2 gap-3">
          <input type="email" value={form.guestEmail} onChange={e=>setForm({...form, guestEmail: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none" placeholder="Guest Email" />
          <input type="tel" value={form.guestPhone} onChange={e=>setForm({...form, guestPhone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none" placeholder="Guest Phone" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-300 border-b pb-2">Record Incident</h3>
        <select value={form.department} onChange={e=>setForm({...form, department: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none">
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        
        {/* SOP SEVERITY SELECTION DROP-DOWN BLOCK */}
        {type === 'complaint' && (
          <div>
            <label className="block text-[8px] font-black uppercase text-gray-400 tracking-wider mb-1.5 ml-1">SOP Classification Tier</label>
            <select value={form.severity} onChange={e=>setForm({...form, severity: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none text-gray-700">
              <option value="quick">Quick Resolve (Line Staff)</option>
              <option value="intermediate">Intermediate (Supervisor/HOD Follow-up)</option>
              <option value="critical">Critical (General Manager Intervention)</option>
            </select>
          </div>
        )}

        <input required value={form.reason} onChange={e=>setForm({...form, reason: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-medium outline-none" placeholder="Specific Issue / Reason" />
        
        {/* SYSTEM ENFORCED SOP TIP MATRIX BOX */}
        {type === 'complaint' && (
          <div className={`p-4 rounded-xl border flex flex-col space-y-2 transition-all ${SOP_FRAMEWORK[form.severity].color}`}>
            <div className="flex items-center space-x-2 border-b pb-1.5 border-black/5">
              {SOP_FRAMEWORK[form.severity].icon}
              <span className="font-black text-xs uppercase tracking-wider">{SOP_FRAMEWORK[form.severity].authority}</span>
            </div>
            <p className="text-[10px] font-medium leading-relaxed italic">"{SOP_FRAMEWORK[form.severity].steps}"</p>
          </div>
        )}

        {type === 'compliment' && (
           <input value={form.staffMentioned} onChange={e=>setForm({...form, staffMentioned: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold text-purple-700 outline-none placeholder:text-gray-400" placeholder="Staff Name to Recognize" />
        )}
        <textarea required value={form.actionTaken} onChange={e=>setForm({...form, actionTaken: e.target.value})} rows="3" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none" placeholder="Action Taken / Resolution Details..." />
      </div>

      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
        <input required value={form.handledBy} onChange={e=>setForm({...form, handledBy: e.target.value})} className="w-full bg-white border border-indigo-200 rounded-xl p-4 text-sm font-black text-indigo-700 outline-none" placeholder="Your Name" />
      </div>

      {type === 'complaint' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-300 border-b pb-2">Resolution Flow</h3>
          <div className="grid grid-cols-2 gap-4">
            <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none text-red-700">
              <option value="open">Keep Ticket Open</option><option value="resolved">Resolved Now</option>
            </select>
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">{currency}</span>
              <input type="number" step="any" value={form.cost} onChange={e=>setForm({...form, cost: e.target.value})} className="bg-white border border-gray-200 rounded-xl p-4 pl-8 text-sm font-black text-red-600 outline-none w-full" placeholder="Cost" />
            </div>
          </div>
          {form.status === 'open' && (
            <div className="space-y-3 pt-2 border-t border-gray-100 animate-in fade-in duration-300">
              <input type="email" value={form.followUpEmail} onChange={e=>setForm({...form, followUpEmail: e.target.value})} className="w-full bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm outline-none placeholder:text-amber-400" placeholder={form.severity === 'critical' ? "General Manager Email" : "Supervisor / HOD Email"} />
              <input type="tel" value={form.followUpPhone} onChange={e=>setForm({...form, followUpPhone: e.target.value})} className="w-full bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm outline-none placeholder:text-amber-400" placeholder={form.severity === 'critical' ? "GM WhatsApp Mobile (+...)" : "Handler WhatsApp Mobile (+...)"} />
            </div>
          )}
        </div>
      )}
      <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm transition-transform active:scale-95">Push to Cloud Sync</button>
    </form>
  );
}

function History({ entries, onResolve, onAddComment, onMarkEmailSent, currency, exchangeRates, filter, setFilter, ticker }) {
  const [commentInput, setCommentInput] = useState({});
  const filtered = entries.filter(e => filter === 'all' ? true : e.status === filter);
  const currentISO = CURRENCY_MAP[currency] || 'USD';
  const displayConversionFactor = exchangeRates[currentISO] || 1;

  const getSLADetails = (entry) => {
    if (entry.type !== 'complaint' || entry.status !== 'open') return { isBreached: false };
    const msElapsed = Date.now() - new Date(entry.date).getTime();
    const hoursElapsed = msElapsed / 3600000;
    return {
      isBreached: hoursElapsed >= 2, 
      hours: Math.floor(hoursElapsed),
      minutes: Math.floor((msElapsed % 3600000) / 60000)
    };
  };

  const handleSendEmail = (entry, emailType) => {
    let to = "", sub = "", body = "";
    if (emailType === 'manager') {
      to = entry.followUpEmail || "";
      sub = entry.severity === 'critical' ? `🚨 [CRITICAL GM ESCALATION]: ${entry.department}` : `[HOD NOTICE] OPEN TICKET: ${entry.department}`;
      body = `SOP LEVEL: ${SOP_FRAMEWORK[entry.severity || 'quick'].label}\n\nGUEST/ROOM: ${entry.guestName}\nREASON: ${entry.reason}\nLOGGED BY: ${entry.handledBy}`;
    } else if (emailType === 'escalation') {
      const sla = getSLADetails(entry);
      to = entry.followUpEmail || "";
      sub = `🚨 [SLA BREACH ALERT] ${entry.department} Ticket Overdue`;
      body = `WARNING: The following ticket has breached its 2-hour resolution window.\n\nOverdue by: ${sla.hours}h ${sla.minutes}m\nRoom/Guest: ${entry.guestName}\nIssue: ${entry.reason}\nLogged By: ${entry.handledBy}\n\nPlease update or resolve this issue immediately.`;
    } else {
      to = entry.guestEmail || "";
      sub = entry.type === 'compliment' ? "Thank you from the Hotel!" : "Following up on your experience";
      body = `Dear ${entry.guestName},\n\nWe appreciate your feedback regarding the ${entry.department}.\n\nBest regards,\nManagement`;
    }
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    onMarkEmailSent(entry.id, emailType);
  };

  const handleWhatsAppEscalation = (entry) => {
    const sla = getSLADetails(entry);
    const cleanedPhone = (entry.followUpPhone || "").replace(/\s+/g, '');
    let msg = "";
    
    if (entry.severity === 'critical') {
      msg = `🚨 *CRITICAL GM ACTION INTERVENTION* 🚨\n\nA critical incident requires executive review and physical service recovery action.\n\n*Room/Guest:* ${entry.guestName}\n*Issue:* ${entry.reason}\n*Department:* ${entry.department}\n*Logged By:* ${entry.handledBy}\n\n_SOP dictates immediate executive response contact._`;
    } else {
      msg = `⚠️ *SLA BREACH NOTIFICATION* ⚠️\n\nThis ticket has crossed its 2-hour threshold without finalization.\n\n*Overdue Time:* ${sla.hours}h ${sla.minutes}m\n*Room/Guest:* ${entry.guestName}\n*Issue:* ${entry.reason}\n*Department:* ${entry.department}\n\n_Please action and complete this ticket on the link immediately!_`;
    }
    
    const whatsappUrl = cleanedPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      
    window.open(whatsappUrl, '_blank');
    onMarkEmailSent(entry.id, 'escalation');
  };

  if (entries.length === 0) return <div className="p-20 text-center font-black text-gray-300 uppercase text-xs italic">No records...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex bg-gray-200 rounded-xl p-1 mb-4 shadow-inner">
        {['all', 'open', 'resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${filter === f ? 'bg-white shadow text-indigo-700' : 'text-gray-400'}`}>{f}</button>
        ))}
      </div>
      {filtered.map(entry => {
        const localDisplayCost = (Number(entry.cost) || 0) * displayConversionFactor;
        const sla = getSLADetails(entry);
        const activeSeverity = entry.severity || 'quick';

        return (
          <div 
            key={entry.id} 
            className={`bg-white p-5 rounded-2xl shadow-sm border border-l-4 transition-all duration-300 ${
              sla.isBreached ? 'border-red-600 bg-red-50/20' : 'border-gray-100'
            }`} 
            style={{ borderLeftColor: sla.isBreached ? '#dc2626' : (entry.type === 'compliment' ? '#10b981' : activeSeverity === 'critical' ? '#ef4444' : activeSeverity === 'intermediate' ? '#3b82f6' : '#10b981') }}
          >
            {sla.isBreached && (
              <div className="mb-3 -mx-5 -mt-5 bg-red-600 text-white font-black uppercase text-[9px] tracking-widest p-2 flex items-center justify-center space-x-2 animate-pulse rounded-t-xl">
                <Clock size={12} />
                <span>⚠️ SLA BREACHED: Overdue by {sla.hours}h {sla.minutes}m</span>
              </div>
            )}

            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                {entry.type === 'compliment' ? <ThumbsUp className="text-green-500" size={16} /> : <ThumbsDown className="text-red-500" size={16} />}
                
                {/* DYNAMIC HIERARCHICAL SOP STATUS BADGES */}
                {entry.type === 'complaint' && (
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border ${SOP_FRAMEWORK[activeSeverity].badge}`}>
                     {SOP_FRAMEWORK[activeSeverity].label}
                  </span>
                )}
                
                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black border ${entry.sentiment?.color || 'bg-gray-50 text-gray-400'}`}>{entry.sentiment?.label || 'Neutral'}</span>
              </div>
              <span className="text-[9px] font-bold text-gray-300">{new Date(entry.date).toLocaleDateString()}</span>
            </div>
            
            <h3 className="font-black text-gray-800 text-lg leading-tight mb-1">{entry.guestName}</h3>
            <p className="text-sm font-bold text-gray-600 leading-snug">{entry.reason}</p>
            
            <div className="grid grid-cols-2 gap-3 mt-4 text-[9px] font-black uppercase tracking-widest text-gray-400">
              <div>DEPT: <span className="text-gray-800">{entry.department}</span></div>
              <div>BY: <span className="text-gray-800">{entry.handledBy}</span></div>
              {entry.type === 'complaint' && <div>COST: <span className="text-red-600">{currency}{localDisplayCost.toFixed(2)}</span></div>}
              {entry.type === 'compliment' && entry.staffMentioned && <div className="col-span-2 text-purple-700 font-bold flex items-center"><Award size={12} className="mr-1" /> Recognized: {entry.staffMentioned}</div>}
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-xl text-xs text-gray-600 italic border border-gray-100">"{entry.actionTaken}"</div>
            
            {/* Notes system */}
            <div className="mt-5 space-y-2">
              {entry.comments?.map((c, i) => (
                <div key={i} className="text-[10px] bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">
                  <span className="font-black text-indigo-700 uppercase">{c.author}:</span> {c.text}
                </div>
              ))}
              <div className="flex space-x-2 mt-2">
                <input value={commentInput[entry.id]?.author || ''} onChange={e=>setCommentInput({...commentInput, [entry.id]: {...commentInput[entry.id], author: e.target.value}})} placeholder="Name..." className="w-1/4 bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs outline-none" />
                <input value={commentInput[entry.id]?.text || ''} onChange={e=>setCommentInput({...commentInput, [entry.id]: {...commentInput[entry.id], text: e.target.value}})} placeholder="Type note..." className="flex-1 bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs outline-none" />
                <button onClick={()=>{ if(!commentInput[entry.id]?.text) return; onAddComment(entry.id, commentInput[entry.id].text, commentInput[entry.id].author || "Staff"); setCommentInput({...commentInput, [entry.id]: {...commentInput[entry.id], text:''}}); }} className="bg-indigo-600 text-white px-3 py-2 rounded-lg font-black text-[10px]">POST</button>
              </div>
            </div>
            
            {/* Action Buttons Matrix */}
            <div className="mt-6 flex flex-col space-y-2">
              {sla.isBreached && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <p className="text-[8px] font-black text-red-600 uppercase tracking-wider text-center">Urgent Escalation Center</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleWhatsAppEscalation(entry)} className={`py-2 px-1 text-[9px] font-black uppercase rounded-lg border flex items-center justify-center transition-all ${entry.escalationSent ? 'bg-green-600 border-green-700 text-white' : 'bg-white border-red-300 text-red-700 hover:bg-red-50'}`}>
                      <MessageSquare size={12} className="mr-1" /> {entry.escalationSent ? "Escalated" : "WhatsApp Group"}
                    </button>
                    {entry.followUpEmail && (
                      <button onClick={() => handleSendEmail(entry, 'escalation')} className={`py-2 px-1 text-[9px] font-black uppercase rounded-lg border flex items-center justify-center transition-all ${entry.escalationSent ? 'bg-green-600 border-green-700 text-white' : 'bg-white border-red-300 text-red-700 hover:bg-red-50'}`}>
                        <Mail size={12} className="mr-1" /> Email Handler
                      </button>
                    )}
                  </div>
                </div>
              )}

              {entry.guestEmail && (
                <button onClick={() => handleSendEmail(entry, 'guest')} className={`w-full py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-colors shadow-sm ${entry.guestEmailSent ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                  {entry.guestEmailSent ? <CheckCircle size={14} className="mr-2" /> : <Mail size={14} className="mr-2 text-gray-400" />} {entry.guestEmailSent ? 'GUEST NOTIFIED' : 'Email Guest'}
                </button>
              )}
              
              {entry.status === 'open' && (
                <>
                  {entry.followUpEmail && !sla.isBreached && (
                    <button 
                      onClick={() => handleSendEmail(entry, 'manager')} 
                      className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center shadow-lg active:scale-95 transition-colors ${
                        entry.managerEmailSent ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                      }`}
                    >
                      {entry.managerEmailSent ? <CheckCircle size={14} className="mr-2" /> : <AlertCircle size={14} className="mr-2" />} 
                      {/* DYNAMIC SCALE TEXT MAP MATCHING Hierarchy Level */}
                      {entry.managerEmailSent ? (activeSeverity === 'critical' ? 'GM NOTIFIED' : 'HOD ALERTED') : (activeSeverity === 'critical' ? 'Escalate to GM Now' : 'Alert Supervisor / HOD')}
                    </button>
                  )}
                  
                  {/* DYNAMIC WHATSAPP SHORTCUT DISPATCH TRIGGER FOR CRITICAL NOT BREACHED TICKETS */}
                  {activeSeverity === 'critical' && !sla.isBreached && (
                    <button onClick={() => handleWhatsAppEscalation(entry)} className="w-full bg-emerald-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center">
                       <MessageSquare size={14} className="mr-2" /> WhatsApp GM Direct Link
                    </button>
                  )}

                  <button onClick={() => onResolve(entry.id)} className="w-full bg-amber-500 text-white py-3 rounded-xl text-[10px] font-black uppercase mt-2 shadow-lg">Close Ticket</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
