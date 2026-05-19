
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
  Users
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

// --- SOP ESCALATION DIRECTIVES (ALIGNED TO ONOMO CORPORATE PANTONES) ---
const SOP_FRAMEWORK = {
  quick: {
    label: 'Quick Resolve',
    color: 'bg-[#595733]/10 border-[#595733]/20 text-[#595733]',
    badge: 'text-[#595733] bg-[#595733]/10 border-[#595733]/20',
    authority: 'Line Staff Authorized',
    icon: <UserCheck size={18} className="text-[#595733]" />,
    steps: 'Empowered for immediate resolution at the point of service. Authorized to apply minor bill corrections, room adjustments, or courtesy food & beverage vouchers on the spot.'
  },
  intermediate: {
    label: 'Intermediate Escalation',
    color: 'bg-[#cf6231]/10 border-[#cf6231]/20 text-[#cf6231]',
    badge: 'text-[#cf6231] bg-[#cf6231]/10 border-[#cf6231]/20',
    authority: 'Supervisor / HOD Required',
    icon: <Users size={18} className="text-[#cf6231]" />,
    steps: 'Exceeds standard staff limits. The HOD or Duty Supervisor must take direct ownership, contact the guest, and implement structured service recovery within 45 minutes.'
  },
  critical: {
    label: 'Critical Intervention',
    color: 'bg-[#8e2a2a]/10 border-[#8e2a2a]/20 text-[#8e2a2a]',
    badge: 'text-[#8e2a2a] bg-[#8e2a2a]/10 border-[#8e2a2a]/20',
    authority: 'General Manager Mandate',
    icon: <ShieldAlert size={18} className="text-[#8e2a2a] animate-pulse" />,
    steps: 'Severe operational incident or high-profile threat. Requires immediate background escalation alerts sent to the GM. Executive leadership must step in physically to resolve.'
  }
};

// --- DYNAMIC AI CLASSIFICATION ENGINES ---
const determineSOPSeverity = (text) => {
  const lower = (text || "").toLowerCase();
  if (/(fire|flood|injury|theft|vip|gm|general manager|emergency|medical|danger|police|assault|broken lock|power out|no water|furious|unacceptable|terrible|worst|shouting|legal)/.test(lower)) {
    return 'critical';
  }
  if (/(leak|supervisor|slow|rude|dirty|manager|upgrade|delay|wait|noise|loud|hot water|broken|aircon|ac|tv|fridge|card|key|smell|stain|infestation|bug|pest)/.test(lower)) {
    return 'intermediate';
  }
  return 'quick';
};

const analyzeSentiment = (text) => {
  const lower = (text || "").toLowerCase();
  if (/(furious|unacceptable|terrible|worst|disgusting|outrageous|angry)/.test(lower)) return { label: 'Furious', emoji: '😡', color: 'text-[#8e2a2a] bg-[#8e2a2a]/10 border-[#8e2a2a]/20' };
  if (/(slow|dirty|broken|rude|bad|poor|annoyed|wait)/.test(lower)) return { label: 'Irritated', emoji: '😠', color: 'text-[#cf6231] bg-[#cf6231]/10 border-[#cf6231]/20' };
  if (/(great|excellent|amazing|love|perfect|wonderful|best)/.test(lower)) return { label: 'Delighted', emoji: '🤩', color: 'text-[#595733] bg-[#595733]/10 border-[#595733]/20' };
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
        setCloudError(`Database Error: ${error.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addEntry = async (newEntry, openWhatsAppTrigger) => {
    if (!user) return showToast('Error: Connection pending...');
    
    if (openWhatsAppTrigger) {
      openWhatsAppTrigger();
    }

    try {
      const entriesRef = collection(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'feedback_entries');
      await addDoc(entriesRef, { ...newEntry, userId: user.uid });
      setActiveTab('history'); 
      showToast('Entry saved securely to cloud!');
    } catch (error) {
      showToast(`Save failed: ${error.message}`);
    }
  };

  const resolveEntry = async (id) => {
    if (!user) return;
    try {
      const entryRef = doc(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'feedback_entries', id);
      await updateDoc(entryRef, { status: 'resolved', resolvedAt: new Date().toISOString() });
      showToast('Ticket marked as resolved.');
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
      <div className="flex flex-col h-screen bg-[#f6ebda] items-center justify-center max-w-md mx-auto p-10 text-center font-sans">
        <Loader2 className="animate-spin text-[#003040] mb-4" size={48} />
        <p className="text-[#003040] font-medium animate-pulse">Syncing with secure cloud...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f6ebda] font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {toast && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-[90%] bg-gray-800 text-white px-4 py-3 rounded-xl shadow-2xl z-50 text-sm text-center font-medium animate-in fade-in slide-in-from-top-4 flex items-center justify-center space-x-2">
          <CheckCircle size={18} className="text-green-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* HEADER BAR BRANDING */}
      <header className="bg-[#003040] text-white p-4 shadow-md z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-wide">Feedback Tracker</h1>
            <div className="flex items-center text-[10px] text-[#a0c8d2] font-semibold tracking-wider mt-0.5">
              <RefreshCw size={8} className="mr-1 animate-spin" /> Live Sync Active
            </div>
          </div>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-[#003040]/80 text-white border border-[#a0c8d2]/20 rounded p-1 text-xs outline-none focus:ring-2 focus:ring-[#a0c8d2] cursor-pointer font-semibold">
            <option value="$">USD ($)</option><option value="€">EUR (€)</option><option value="£">GBP (£)</option><option value="R">ZAR (R)</option>
          </select>
        </div>
      </header>
      
      {cloudError && (
        <div className="bg-[#8e2a2a] text-white px-4 py-3 text-xs font-semibold flex items-center justify-center text-center z-20 shadow-md">
          <AlertCircle size={14} className="mr-2 shrink-0" /> {cloudError}
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-32 relative">
        {activeTab === 'dashboard' && <Dashboard entries={entries} currency={currency} exchangeRates={exchangeRates} onOpenTicketsClick={() => { setHistoryFilter('open'); setActiveTab('history'); }} />}
        {activeTab === 'add' && <AddEntryForm onSave={addEntry} currency={currency} exchangeRates={exchangeRates} />}
        {activeTab === 'history' && <History entries={entries} onResolve={resolveEntry} onAddComment={addComment} onMarkEmailSent={markEmailSent} currency={currency} exchangeRates={exchangeRates} filter={historyFilter} setFilter={setHistoryFilter} ticker={timeTicker} />}
      </main>

      {/* MAIN NAVIGATION TAB MATRIX */}
      <nav className="bg-white border-t border-gray-200 absolute bottom-0 w-full flex justify-around p-2 z-10 pb-safe">
        {['dashboard', 'add', 'history'].map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); if(tab==='history') setHistoryFilter('all'); }} className={`flex flex-col items-center p-2 rounded-lg w-1/3 transition-colors ${activeTab === tab ? 'text-[#f18a00] bg-[#f18a00]/10' : 'text-gray-500 hover:text-[#003040]'}`}>
            {tab === 'dashboard' ? <Home size={24} /> : tab === 'add' ? <PlusCircle size={24} /> : <List size={24} />}
            <span className="text-xs mt-1 font-semibold capitalize">{tab === 'add' ? 'New Entry' : tab}</span>
          </button>
        ))}
      </nav>
      
      <div className="absolute bottom-[72px] left-0 w-full bg-slate-900 text-white/60 px-3 py-1 text-[8px] font-mono flex justify-between border-t border-white/10 z-10 pointer-events-none">
        <span>Shared Environment Link Up: Validated</span>
        {lastSync && <span>Sync: {lastSync}</span>}
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
      <div className="flex justify-between items-center mb-2">
        <select value={range} onChange={(e) => setRange(e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-[#003040] focus:border-[#003040] block p-2 font-medium shadow-sm">
          <option value="1">Today</option><option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="all">All Time</option>
        </select>
        <span className="text-sm font-semibold text-gray-400">Live Insights</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <StatBox label="Compliments" value={stats.comps} color="text-green-700 bg-green-50 border-green-100" />
        <StatBox label="Complaints" value={stats.complaints} color="text-[#8e2a2a] bg-[#8e2a2a]/5 border-[#8e2a2a]/10" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Open Issues" value={stats.open} color="bg-red-50 border-red-100 text-[#8e2a2a]" onClick={onOpenTicketsClick} icon={<AlertCircle size={16} />} />
        <MetricCard label="Total Cost" value={`${currency}${stats.cost.toFixed(2)}`} color="bg-white border-gray-200 text-gray-800" icon={<DollarSign size={16} />} />
      </div>

      {/* AMBER & PURPLE RECOGNITION LEADERBOARD */}
      <h2 className="text-lg font-semibold text-gray-700 mt-6 mb-2 flex items-center">
        <Trophy size={18} className="mr-2 text-[#ffb131]" /> Staff Performance Board
      </h2>
      <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
        {staffLeaderboard.map((member, index) => {
          const medalColors = ["text-[#ffb131]", "text-slate-400", "text-[#cf6231]"];
          return (
            <div key={member.name} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
              <div className="flex items-center space-x-3 truncate">
                <span className="w-5 text-center font-bold">
                  {index < 3 ? <Medal size={18} className={medalColors[index]} /> : index + 1}
                </span>
                <span className="font-semibold text-gray-800 truncate">{member.name}</span>
              </div>
              <span className="bg-[#ffb131]/10 text-[#cf6231] font-bold text-xs px-3 py-1 rounded-full flex items-center">
                 <ThumbsUp size={12} className="mr-1" /> {member.count} Praises
              </span>
            </div>
          );
        })}
        {staffLeaderboard.length === 0 && (
          <p className="text-center text-gray-400 italic text-sm py-2">No staff mentions captured yet.</p>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className={`${color} p-4 rounded-2xl border shadow-sm flex flex-col items-center justify-center`}>
      <span className="text-3xl font-bold leading-none">{value}</span>
      <span className="text-sm font-medium text-center mt-1 opacity-80">{label}</span>
    </div>
  );
}

function MetricCard({ label, value, color, onClick, icon }) {
  return (
    <div onClick={onClick} className={`${color} p-3 rounded-xl border shadow-sm transition-all active:scale-[0.98] ${onClick ? 'cursor-pointer hover:shadow-md' : ''} flex flex-col justify-between`}>
      <div className="flex items-center space-x-2 mb-1">
        {icon}
        <span className="text-xs font-medium opacity-70">{label}</span>
      </div>
      <span className="text-lg font-bold truncate block">{value}</span>
    </div>
  );
}

function AddEntryForm({ onSave, currency, exchangeRates }) {
  const [type, setType] = useState('complaint');
  const [form, setForm] = useState({ 
    guestName: '', guestEmail: '', guestPhone: '', department: DEPARTMENTS[0], reason: '', 
    handledBy: '', actionTaken: '', cost: '', status: 'resolved',
    followUpEmail: '', followUpPhone: '', guestEmailSent: false, managerEmailSent: false, escalationSent: false, staffMentioned: ''
  });

  const inferredSeverity = useMemo(() => {
    return type === 'complaint' ? determineSOPSeverity(form.reason) : 'quick';
  }, [form.reason, type]);

  const submit = (e) => {
    e.preventDefault();
    const currentISO = CURRENCY_MAP[currency] || 'USD';
    const activeRateScale = exchangeRates[currentISO] || 1;
    const normalizedCostInUSD = (Number(form.cost) || 0) / activeRateScale;

    const finalizedEntry = { 
      ...form, 
      type, 
      date: new Date().toISOString(), 
      sentiment: analyzeSentiment(form.reason), 
      cost: normalizedCostInUSD,
      severity: inferredSeverity, 
      comments: [] 
    };

    let whatsappCallback = null;
    if (type === 'complaint' && (form.department === 'Maintenance' || form.department === 'Housekeeping' || inferredSeverity === 'critical')) {
      let alertHeading = inferredSeverity === 'critical' ? `🚨 *CRITICAL GM INTERVENTION REQUIRED* 🚨` : `🚨 *NEW TICKET ALERT* 🚨`;
      const formattedMsg = `${alertHeading}\n\n*SOP Status:* ${SOP_FRAMEWORK[inferredSeverity].label}\n*Dept:* ${form.department}\n*Room/Guest:* ${form.guestName}\n*Issue:* ${form.reason}\n*Logged By:* ${form.handledBy}`;
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedMsg)}`;
      
      whatsappCallback = () => {
        window.open(whatsappUrl, '_blank');
      };
    }

    onSave(finalizedEntry, whatsappCallback);
  };

  return (
    <form onSubmit={submit} className="p-4 space-y-4 font-sans">
      <div className="flex bg-gray-200 rounded-lg p-1 mb-6">
        <button type="button" onClick={() => setType('compliment')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'compliment' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Compliment</button>
        <button type="button" onClick={() => setType('complaint')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'complaint' ? 'bg-white shadow text-[#8e2a2a]' : 'text-gray-500'}`}>Complaint</button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 border-b pb-2">Guest Details</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name / Room No.</label>
          <input required value={form.guestName} onChange={e=>setForm({...form, guestName: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-[#003040]" placeholder="e.g. Room 412 or John Doe" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guest Email</label>
            <input type="email" value={form.guestEmail} onChange={e=>setForm({...form, guestEmail: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-[#003040]" placeholder="guest@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guest Phone</label>
            <input type="tel" value={form.guestPhone} onChange={e=>setForm({...form, guestPhone: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-[#003040]" placeholder="+1 234..." />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 border-b pb-2">Feedback Details</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department Mentioned</label>
          <select value={form.department} onChange={e=>setForm({...form, department: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none bg-white focus:ring-2 focus:ring-[#003040]">
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Specific Issue / Reason</label>
          <input required value={form.reason} onChange={e=>setForm({...form, reason: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-[#003040]" placeholder={type === 'complaint' ? "Provide details to auto-classify escalation..." : "e.g. Great food"} />
        </div>
        
        {type === 'complaint' && form.reason.trim().length > 2 && (
          <div className={`p-4 rounded-xl border flex flex-col space-y-2 transition-all duration-300 ${SOP_FRAMEWORK[inferredSeverity].color}`}>
            <div className="flex items-center justify-between border-b pb-1.5 border-black/5">
              <div className="flex items-center space-x-2">
                {SOP_FRAMEWORK[inferredSeverity].icon}
                <span className="font-bold text-xs uppercase tracking-wide">AI Assigned SOP: {SOP_FRAMEWORK[inferredSeverity].label}</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed font-semibold opacity-95">Mandate: {SOP_FRAMEWORK[inferredSeverity].authority}</p>
            <p className="text-[11px] leading-relaxed italic opacity-80">"{SOP_FRAMEWORK[inferredSeverity].steps}"</p>
          </div>
        )}

        {type === 'compliment' && (
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member Mentioned (Optional)</label>
             <input value={form.staffMentioned} onChange={e=>setForm({...form, staffMentioned: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-[#003040] text-[#003040] font-semibold" placeholder="Who did the guest praise?" />
           </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
          <textarea required value={form.actionTaken} onChange={e=>setForm({...form, actionTaken: e.target.value})} rows="3" className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-[#003040]" placeholder="Details..." />
        </div>
      </div>

      <div className="bg-[#a0c8d2]/10 p-4 rounded-xl border border-[#a0c8d2]/30 shadow-sm">
        <label className="block text-sm font-medium text-[#003040] mb-1">Logged By (Your Name)</label>
        <input required value={form.handledBy} onChange={e=>setForm({...form, handledBy: e.target.value})} className="w-full border border-[#a0c8d2] rounded-lg p-3 text-sm font-semibold text-[#003040] outline-none focus:ring-2 focus:ring-[#003040] bg-white" placeholder="Jane Doe" />
      </div>

      {type === 'complaint' && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-800 border-b pb-2">Ticket Resolution</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-[#003040] bg-white font-medium">
                <option value="open">Open</option><option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost ({currency})</label>
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">{currency}</span>
                <input type="number" step="any" value={form.cost} onChange={e=>setForm({...form, cost: e.target.value})} className="bg-white border border-gray-300 rounded-lg p-3 pl-8 text-sm font-bold text-[#8e2a2a] outline-none w-full focus:ring-2 focus:ring-[#003040]" placeholder="0.00" />
              </div>
            </div>
          </div>
          {form.status === 'open' && (
            <div className="space-y-3 pt-2 border-t border-gray-100 animate-in fade-in duration-300">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{inferredSeverity === 'critical' ? 'General Manager Email' : 'Supervisor / HOD Email'}</label>
                <input type="email" value={form.followUpEmail} onChange={e=>setForm({...form, followUpEmail: e.target.value})} className="w-full bg-[#f6ebda]/50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-[#003040]" placeholder="manager@hotel.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{inferredSeverity === 'critical' ? 'GM WhatsApp Number' : 'Handler WhatsApp Number'}</label>
                <input type="tel" value={form.followUpPhone} onChange={e=>setForm({...form, followUpPhone: e.target.value})} className="w-full bg-[#f6ebda]/50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-[#003040]" placeholder="e.g. +27821234567" />
              </div>
            </div>
          )}
        </div>
      )}
      <button type="submit" className="w-full bg-[#003040] text-white font-bold py-4 rounded-xl mt-4 hover:bg-[#003040]/90 transition-colors shadow-lg active:scale-95">
        Submit & Sync to Cloud
      </button>
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
      body = `WARNING: The following ticket has breached its 2-hour resolution window.\n\nOverdue by: ${sla.hours}h ${sla.minutes}m\nRoom/Guest: ${entry.guestName}\nIssue: ${entry.reason}\nLogged By: ${entry.handledBy}`;
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
      msg = `🚨 *CRITICAL GM ACTION INTERVENTION* 🚨\n\nA critical incident requires executive review and physical service recovery action.\n\n*Room/Guest:* ${entry.guestName}\n*Issue:* ${entry.reason}\n*Department:* ${entry.department}\n*Logged By:* ${entry.handledBy}`;
    } else {
      msg = `⚠️ *SLA BREACH NOTIFICATION* ⚠️\n\nThis ticket has crossed its 2-hour threshold without finalization.\n\n*Overdue Time:* ${sla.hours}h ${sla.minutes}m\n*Room/Guest:* ${entry.guestName}\n*Issue:* ${entry.reason}\n*Department:* ${entry.department}`;
    }
    
    const whatsappUrl = cleanedPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      
    window.open(whatsappUrl, '_blank');
    onMarkEmailSent(entry.id, 'escalation');
  };

  if (entries.length === 0) return <div className="p-8 text-center text-gray-500 flex flex-col items-center h-full justify-center"><List size={48} className="mb-4 text-gray-300" /><p>No records found...</p></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex bg-gray-200 rounded-lg p-1 mb-4 shadow-inner">
        {['all', 'open', 'resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${filter === f ? 'bg-white shadow text-[#003040]' : 'text-gray-500'}`}>{f}</button>
        ))}
      </div>
      {filtered.map(entry => {
        const localDisplayCost = (Number(entry.cost) || 0) * displayConversionFactor;
        const sla = getSLADetails(entry);
        const activeSeverity = entry.severity || 'quick';

        // Direct border evaluation matrix maps to Onomo specific pantone tiers
        const leftBorderColor = sla.isBreached 
          ? '#8e2a2a' 
          : (entry.type === 'compliment' 
              ? '#595733' 
              : activeSeverity === 'critical' 
                ? '#8e2a2a' 
                : activeSeverity === 'intermediate' 
                  ? '#cf6231' 
                  : '#595733');

        return (
          <div 
            key={entry.id} 
            className={`bg-white p-4 rounded-xl shadow-sm border border-l-4 transition-all duration-300 ${
              sla.isBreached ? 'border-[#8e2a2a] bg-[#8e2a2a]/5' : 'border-gray-200'
            }`} 
            style={{ borderLeftColor: leftBorderColor }}
          >
            {sla.isBreached && (
              <div className="mb-3 -mx-4 -mt-4 bg-[#8e2a2a] text-white font-bold uppercase text-[10px] tracking-wider p-2 flex items-center justify-center space-x-2 animate-pulse rounded-t-xl">
                <Clock size={12} />
                <span>⚠️ SLA BREACHED: Overdue by {sla.hours}h {sla.minutes}m</span>
              </div>
            )}

            <div className="flex justify-between items-start mb-2 mt-1">
              <div className="flex items-center space-x-2">
                {entry.type === 'compliment' ? <ThumbsUp className="text-[#595733]" size={18} /> : <ThumbsDown className="text-[#8e2a2a]" size={18} />}
                
                {entry.type === 'complaint' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${SOP_FRAMEWORK[activeSeverity].badge}`}>
                     {SOP_FRAMEWORK[activeSeverity].label}
                  </span>
                )}
                
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${entry.sentiment?.color || 'bg-gray-50 text-gray-400'}`}>{entry.sentiment?.label || 'Neutral'}</span>
              </div>
              <span className="text-xs text-gray-400 flex items-center"><Calendar size={12} className="mr-1" /> {new Date(entry.date).toLocaleDateString()}</span>
            </div>
            
            <h3 className="font-semibold text-gray-800 text-lg">{entry.guestName}</h3>
            <p className="text-sm font-bold text-gray-600 mt-1 leading-snug">{entry.reason}</p>
            
            <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm text-gray-500">
              <div>Department: <span className="font-semibold text-gray-800">{entry.department}</span></div>
              <div>Logged By: <span className="font-semibold text-gray-800">{entry.handledBy}</span></div>
              {entry.type === 'complaint' && <div>Resolution Cost: <span className="font-semibold text-[#8e2a2a]">{currency}{localDisplayCost.toFixed(2)}</span></div>}
              {entry.type === 'compliment' && entry.staffMentioned && <div className="col-span-2 text-[#cf6231] font-semibold flex items-center"><Award size={14} className="mr-1" /> Recognized: {entry.staffMentioned}</div>}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-gray-500 block text-xs mb-1">Action Taken</span>
              <p className="text-gray-700 text-sm leading-relaxed italic">"{entry.actionTaken}"</p>
            </div>
            
            {/* Team Notes Section */}
            <div className="mt-4 bg-gray-50 rounded-xl p-3 border border-gray-200">
              <h4 className="text-xs font-bold text-gray-600 mb-2 flex items-center"><MessageSquare size={12} className="mr-1" /> Shared Team Notes</h4>
              <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
                {entry.comments?.map((c, i) => (
                  <div key={i} className="bg-white p-2 rounded border border-gray-100 text-xs">
                    <span className="font-bold text-[#003040]">{c.author}:</span> {c.text}
                  </div>
                ))}
              </div>
              <div className="flex space-x-2 mt-2">
                <input value={commentInput[entry.id]?.author || ''} onChange={e=>setCommentInput({...commentInput, [entry.id]: {...commentInput[entry.id], author: e.target.value}})} placeholder="Name" className="w-1/4 bg-white border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-[#003040]" />
                <input value={commentInput[entry.id]?.text || ''} onChange={e=>setCommentInput({...commentInput, [entry.id]: {...commentInput[entry.id], text: e.target.value}})} placeholder="Add internal note..." className="flex-1 bg-white border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-[#003040]" />
                <button onClick={()=>{ if(!commentInput[entry.id]?.text) return; onAddComment(entry.id, commentInput[entry.id].text, commentInput[entry.id].author || "Staff"); setCommentInput({...commentInput, [entry.id]: {...commentInput[entry.id], text:''}}); }} className="bg-[#003040] text-white px-3 py-2 rounded-lg font-bold text-xs shadow-sm active:scale-95">Post</button>
              </div>
            </div>
            
            {/* Operational Escalation Actions Trigger Maps */}
            <div className="mt-4 flex flex-col space-y-2">
              {sla.isBreached && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-[#8e2a2a] uppercase text-center">Urgent Escalation Center</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleWhatsAppEscalation(entry)} className={`py-2 px-1 text-xs font-semibold rounded-lg border flex items-center justify-center shadow-sm ${entry.escalationSent ? 'bg-green-600 text-white border-green-700' : 'bg-white border-red-300 text-red-700 hover:bg-red-50'}`}>
                      <MessageSquare size={14} className="mr-1" /> {entry.escalationSent ? "Escalated" : "WhatsApp Group"}
                    </button>
                    {entry.followUpEmail && (
                      <button onClick={() => handleSendEmail(entry, 'escalation')} className={`py-2 px-1 text-xs font-semibold rounded-lg border flex items-center justify-center shadow-sm ${entry.escalationSent ? 'bg-green-600 text-white border-green-700' : 'bg-white border-red-300 text-red-700 hover:bg-red-50'}`}>
                        <Mail size={14} className="mr-1" /> Email Handler
                      </button>
                    )}
                  </div>
                </div>
              )}

              {entry.guestEmail && (
                <button onClick={() => handleSendEmail(entry, 'guest')} className={`w-full font-semibold py-2 rounded-lg border transition-colors text-sm flex items-center justify-center shadow-sm ${entry.guestEmailSent ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'}`}>
                  {entry.guestEmailSent ? <CheckCircle size={14} className="mr-2" /> : <Mail size={14} className="mr-2 text-gray-400" />} {entry.guestEmailSent ? 'GUEST NOTIFIED' : 'Email Guest'}
                </button>
              )}
              
              {entry.status === 'open' && (
                <>
                  {entry.followUpEmail && !sla.isBreached && (
                    <button onClick={() => handleSendEmail(entry, 'manager')} className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center shadow-sm transition-colors ${entry.managerEmailSent ? 'bg-green-600 text-white' : 'bg-[#003040] text-white'}`}>
                      {entry.managerEmailSent ? <CheckCircle size={14} className="mr-2" /> : <AlertCircle size={14} className="mr-2" />} 
                      {entry.managerEmailSent ? (activeSeverity === 'critical' ? 'GM NOTIFIED' : 'HOD ALERTED') : (activeSeverity === 'critical' ? 'Escalate to GM Now' : 'Alert Supervisor / HOD')}
                    </button>
                  )}
                  
                  {activeSeverity === 'critical' && !sla.isBreached && (
                    <button onClick={() => handleWhatsAppEscalation(entry)} className="w-full bg-[#595733] hover:bg-[#595733]/90 text-white font-semibold py-3 rounded-lg text-sm flex items-center justify-center shadow-sm">
                       <MessageSquare size={14} className="mr-2" /> WhatsApp GM Direct Link
                    </button>
                  )}

                  <button onClick={() => onResolve(entry.id)} className="w-full bg-amber-500 text-white py-3 rounded-lg text-sm font-semibold shadow-md mt-2">Close Ticket</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
