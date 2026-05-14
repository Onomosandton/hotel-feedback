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

// Consistent ID ensures all devices (laptop/mobile) see the same data
const SHARED_APP_ID = "hotel_feedback_main_sync";

const DEPARTMENTS = [
  'Front Desk', 'Housekeeping', 'Food & Beverage', 'Maintenance', 'Concierge', 'Spa & Wellness', 'Valet/Parking'
];

const SUGGESTED_RESOLUTIONS = {
  'Front Desk': 'Listen actively, apologize, and offer a complimentary room upgrade or late checkout.',
  'Housekeeping': 'Dispatch housekeeping immediately, apologize, and offer a complimentary amenity.',
  'Food & Beverage': 'Replace the item immediately, and consider comping the meal.',
  'Maintenance': 'Send maintenance within 15 mins. Offer a room move if needed.',
  'Concierge': 'Apologize, provide alternative recommendation, and offer a small courtesy gift.',
  'Spa & Wellness': 'Reschedule if needed, apologize, and offer a discount.',
  'Valet/Parking': 'Retrieve vehicle promptly, apologize, and waive the fee.'
};

const SUGGESTED_COMPLIMENT_ACTIONS = {
  'Front Desk': 'Thank the guest and note it on the guest profile for their next stay.',
  'Housekeeping': 'Pass the praise to the specific housekeeper and recognize them on the staff board.',
  'Food & Beverage': 'Share the compliment with the chef and servers immediately.',
  'Maintenance': 'Commend the technician for their promptness and quality.',
  'Concierge': 'Recognize the concierge and share the success story with the team.',
  'Spa & Wellness': 'Praise the therapist and encourage the guest to leave a public review.',
  'Valet/Parking': 'Thank the valet team for their efficiency.'
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
        setCloudError(`Cloud Login Error: ${error.message}. Please enable Anonymous login in Firebase.`);
        setLoading(false);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return; 

    // Accessing the collection using the path format required for the environment
    const entriesRef = collection(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'feedback_entries');
    
    const unsubscribe = onSnapshot(entriesRef, 
      (snapshot) => {
        const loadedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by date newest first
        loadedEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(loadedEntries);
        setLoading(false);
        setCloudError(null);
      },
      (error) => {
        console.error('Firestore Error:', error);
        setCloudError(`Permission Error: Database access denied. Please go to Firebase Rules and click "Publish".`);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const addEntry = async (newEntry) => {
    if (!user) return showToast('Error: Not connected to cloud.');
    try {
      const entriesRef = collection(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'feedback_entries');
      await addDoc(entriesRef, { ...newEntry, userId: user.uid });
      setActiveTab('history'); 
      showToast('Entry synced to all devices!');
    } catch (error) {
      console.error('Save Error:', error);
      showToast(`Cloud Save Failed: ${error.message}`);
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
      showToast('Internal note synced.');
    } catch (error) { console.error(error); }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center max-w-md mx-auto p-10 text-center font-sans">
        <Loader2 className="animate-spin text-indigo-600 mb-6" size={60} />
        <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase text-center">Initializing Cloud</h2>
        <p className="text-gray-400 mt-2 italic text-sm text-center">Verifying permissions with Google Firebase...</p>
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
              <RefreshCw size={8} className="mr-1 animate-spin" /> LIVE CLOUD SYNC ACTIVE
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
        <div className="bg-red-600 text-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center z-20 flex flex-col items-center justify-center leading-tight">
          <div className="flex items-center mb-1">
            <AlertCircle size={14} className="mr-2 shrink-0" /> CONNECTION PROBLEM
          </div>
          <p className="opacity-80 lowercase font-normal">{cloudError}</p>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-24 relative">
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
      
      {/* Sync Diagnostic Footer */}
      <div className="absolute bottom-0 left-0 w-full bg-gray-50 border-t border-gray-100 px-3 py-1 text-[8px] text-gray-300 font-mono flex justify-between pointer-events-none">
        <span>SYNC_ID: {SHARED_APP_ID}</span>
        <span>AUTH_STATUS: {user ? 'CONNECTED' : 'WAITING'}</span>
      </div>
    </div>
  );
}

// --- DASHBOARD ---

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
      topDept: Object.keys(depts).reduce((a, b) => depts[a] > depts[b] ? a : b, 'N/A'),
      topStaff: Object.keys(staff).reduce((a, b) => staff[a] > staff[b] ? a : b, 'N/A')
    };
  }, [filtered]);

  // Dept Breakdown for UI list
  const deptList = Object.keys(DEPARTMENTS.reduce((acc, curr) => ({...acc, [curr]: 0}), {})).map(d => {
    const e = filtered.filter(x => x.department === d);
    return { name: d, compliments: e.filter(x => x.type === 'compliment').length, complaints: e.filter(x => x.type === 'complaint').length };
  }).sort((a,b) => (b.compliments + b.complaints) - (a.compliments + a.complaints));

  // Trend line generator
  const trendData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d.toDateString(), comps: 0, compls: 0 });
    }
    entries.forEach(e => {
      const day = days.find(d => d.date === new Date(e.date).toDateString());
      if (day) { e.type === 'compliment' ? day.comps++ : day.compls++; }
    });
    const maxVal = Math.max(...days.map(d => Math.max(d.comps, d.compls, 1)));
    return { days, maxVal };
  }, [entries]);

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-2">
        <select value={range} onChange={(e) => setRange(e.target.value)} className="bg-white border border-gray-200 text-xs font-black uppercase p-2 rounded-lg shadow-sm outline-none">
          <option value="1">Today</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
        <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Live Intelligence</div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-100 p-5 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-green-700 leading-none">{stats.comps}</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-green-500 mt-2">Compliments</span>
        </div>
        <div className="bg-red-50 border border-red-100 p-5 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-red-700 leading-none">{stats.complaints}</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-red-500 mt-2">Complaints</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Open Issues" value={stats.open} color="text-amber-600 bg-amber-50 border-amber-100" onClick={onOpenTicketsClick} />
        <MetricCard label="Total Cost" value={`${currency}${stats.cost.toFixed(2)}`} color="text-gray-800 bg-white" />
        <MetricCard label="Top Staff" value={stats.topStaff} color="text-purple-600 bg-purple-50 border-purple-100" />
        <MetricCard label="Busy Dept" value={stats.topDept} color="text-blue-600 bg-blue-50 border-blue-100" />
      </div>

      <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6">Department Snapshot</h2>
      <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
        {deptList.filter(d => d.compliments + d.complaints > 0).map(d => (
          <div key={d.name} className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-700">{d.name}</span>
            <div className="flex space-x-3 font-black">
              <span className="text-green-600">+{d.compliments}</span>
              <span className="text-red-600">-{d.complaints}</span>
            </div>
          </div>
        ))}
        {!deptList.some(d => d.compliments + d.complaints > 0) && <p className="text-center text-gray-300 italic text-[10px]">No activity recorded.</p>}
      </div>

      <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6 flex items-center">
        <Activity size={14} className="mr-2 text-indigo-500" /> 7-Day Performance Trend
      </h2>
      <div className="bg-white p-4 pt-10 rounded-2xl border border-gray-100 h-44 flex items-end justify-between space-x-1 pb-8">
        {trendData.days.map((day, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div className="flex w-full justify-center items-end space-x-0.5 h-24">
              <div className="w-1/2 bg-green-400 rounded-t-sm" style={{ height: `${(day.comps / trendData.maxVal) * 100}%` }}></div>
              <div className="w-1/2 bg-red-400 rounded-t-sm" style={{ height: `${(day.compls / trendData.maxVal) * 100}%` }}></div>
            </div>
            <span className="text-[8px] font-black text-gray-400 uppercase mt-2 rotate-45 transform origin-left whitespace-nowrap">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, onClick }) {
  return (
    <div onClick={onClick} className={`${color} p-4 rounded-xl border shadow-sm transition-transform active:scale-95 cursor-pointer`}>
      <span className="text-[8px] font-black uppercase tracking-widest opacity-50 block mb-1">{label}</span>
      <span className="text-sm font-black truncate block">{value}</span>
    </div>
  );
}

// --- FORM ---

function AddEntryForm({ onSave, currency }) {
  const [type, setType] = useState('complaint');
  const [form, setForm] = useState({ guestName: '', guestEmail: '', guestPhone: '', department: DEPARTMENTS[0], reason: '', handledBy: '', actionTaken: '', cost: '', status: 'resolved', staffMentioned: '', followUpEmail: '' });

  const submit = (e) => {
    e.preventDefault();
    onSave({ 
      ...form, 
      type, 
      date: new Date().toISOString(), 
      sentiment: analyzeSentiment(form.reason + " " + form.actionTaken),
      cost: type === 'complaint' ? Number(form.cost) : 0,
      status: type === 'complaint' ? form.status : 'resolved'
    });
  };

  return (
    <form onSubmit={submit} className="p-4 space-y-4">
      <div className="flex bg-gray-200 rounded-xl p-1 shadow-inner">
        <button type="button" onClick={() => setType('compliment')} className={`flex-1 py-3 text-xs font-black uppercase rounded-lg transition-all ${type === 'compliment' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Compliment</button>
        <button type="button" onClick={() => setType('complaint')} className={`flex-1 py-3 text-xs font-black uppercase rounded-lg transition-all ${type === 'complaint' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Complaint</button>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-300 border-b pb-2">Guest Info</h3>
        <input required value={form.guestName} onChange={e=>setForm({...form, guestName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none" placeholder="Name / Room No." />
        <div className="grid grid-cols-2 gap-3">
          <input type="email" value={form.guestEmail} onChange={e=>setForm({...form, guestEmail: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none" placeholder="Guest Email" />
          <input type="tel" value={form.guestPhone} onChange={e=>setForm({...form, guestPhone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none" placeholder="Guest Phone" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-300 border-b pb-2">Entry Details</h3>
        <select value={form.department} onChange={e=>setForm({...form, department: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none">
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <input required value={form.reason} onChange={e=>setForm({...form, reason: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-medium outline-none" placeholder="Specific Issue / Reason" />
        
        <div className={`p-4 rounded-xl border flex items-start space-x-3 ${type === 'complaint' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'}`}>
          <Lightbulb className={type === 'complaint' ? 'text-blue-500' : 'text-green-500'} size={20} />
          <div className="text-[10px] leading-relaxed italic">
            <span className="font-black uppercase tracking-wider block mb-1 not-italic opacity-50">AI Tip:</span>
            "{type === 'complaint' ? SUGGESTED_RESOLUTIONS[form.department] : SUGGESTED_COMPLIMENT_ACTIONS[form.department]}"
          </div>
        </div>

        {type === 'compliment' && <input value={form.staffMentioned} onChange={e=>setForm({...form, staffMentioned: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none" placeholder="Staff Name Praised (Optional)" />}
        <textarea required value={form.actionTaken} onChange={e=>setForm({...form, actionTaken: e.target.value})} rows="3" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none" placeholder="Action Taken / Resolution Notes..." />
      </div>

      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
        <h3 className="text-[9px] font-black uppercase tracking-widest text-indigo-300 border-b border-indigo-100 pb-2">Verification</h3>
        <input required value={form.handledBy} onChange={e=>setForm({...form, handledBy: e.target.value})} className="w-full bg-white border border-indigo-200 rounded-xl p-4 text-sm font-black text-indigo-700 outline-none" placeholder="Your Full Name" />
      </div>

      {type === 'complaint' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-300 border-b pb-2">Resolution Flow</h3>
          <div className="grid grid-cols-2 gap-4">
            <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none">
              <option value="open">Keep Ticket Open</option><option value="resolved">Resolved Now</option>
            </select>
            <input type="number" value={form.cost} onChange={e=>setForm({...form, cost: e.target.value})} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-black text-red-600 outline-none" placeholder={`Cost (${currency})`} />
          </div>
          {form.status === 'open' && (
            <input type="email" value={form.followUpEmail} onChange={e=>setForm({...form, followUpEmail: e.target.value})} className="w-full bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm outline-none placeholder:text-amber-300" placeholder="Manager Email for SLA Alert" />
          )}
        </div>
      )}

      <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm transition-transform active:scale-95">Push to Cloud Sync</button>
    </form>
  );
}

// --- HISTORY ---

function History({ entries, onResolve, onAddComment, currency, filter, setFilter }) {
  const [commentInput, setCommentInput] = useState({});

  const filtered = entries.filter(e => filter === 'all' ? true : e.status === filter);

  const handleSendEmail = (entry, emailType) => {
    let to = "", sub = "", body = "";
    if (emailType === 'manager') {
      to = entry.followUpEmail;
      sub = `URGENT: Open Complaint - ${entry.department}`;
      body = `GUEST: ${entry.guestName}\nISSUE: ${entry.reason}\nLOGGED BY: ${entry.handledBy}\n\nPlease resolve via tracker.`;
    } else {
      to = entry.guestEmail;
      sub = entry.type === 'compliment' ? "Thank you from the Hotel!" : "Following up on your experience";
      body = `Dear ${entry.guestName},\n\nWe appreciate your feedback regarding the ${entry.department}.\n\nBest regards,\nManagement`;
    }
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
  };

  if (entries.length === 0) return <div className="p-20 text-center font-black text-gray-300 uppercase text-xs tracking-widest italic">Syncing cloud data...</div>;

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-500">
      <div className="flex bg-gray-200 rounded-xl p-1 mb-4 shadow-inner">
        {['all', 'open', 'resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${filter === f ? 'bg-white shadow text-indigo-700' : 'text-gray-400'}`}>{f}</button>
        ))}
      </div>

      {filtered.map(entry => (
        <div key={entry.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-4" style={{ borderLeftColor: entry.type === 'compliment' ? '#10b981' : '#ef4444' }}>
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-2">
              {entry.type === 'compliment' ? <ThumbsUp className="text-green-500" size={16} /> : <ThumbsDown className="text-red-500" size={16} />}
              <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${entry.sentiment?.color || 'bg-gray-50 text-gray-400'}`}>{entry.sentiment?.label || 'Neutral'}</span>
            </div>
            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{new Date(entry.date).toLocaleDateString()}</span>
          </div>

          <h3 className="font-black text-gray-800 text-lg leading-tight mb-1">{entry.guestName}</h3>
          <p className="text-sm font-bold text-gray-600 leading-snug">{entry.reason}</p>
          
          <div className="grid grid-cols-2 gap-3 mt-4 text-[9px] font-black uppercase tracking-widest text-gray-400">
            <div>DEPT: <span className="text-gray-800">{entry.department}</span></div>
            <div>BY: <span className="text-gray-800">{entry.handledBy}</span></div>
            {entry.staffMentioned && <div className="col-span-2 text-indigo-600 font-black"><Award size={12} className="inline mr-1" /> {entry.staffMentioned}</div>}
            {entry.type === 'complaint' && <div>COST: <span className="text-red-600">{currency}{Number(entry.cost).toFixed(2)}</span></div>}
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-xl text-xs text-gray-600 italic leading-relaxed border border-gray-100 shadow-inner">
            <span className="text-[8px] font-black uppercase not-italic opacity-40 block mb-1">Official Response</span>
            "{entry.actionTaken}"
          </div>

          {/* Shared Internal Notes */}
          <div className="mt-5 space-y-2">
            <h4 className="text-[8px] font-black uppercase text-gray-400 flex items-center mb-2"><MessageSquare size={10} className="mr-1" /> Team Sync Notes</h4>
            {entry.comments?.map((c, i) => (
              <div key={i} className="text-[10px] bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">
                <span className="font-black text-indigo-700 uppercase tracking-tighter mr-1">{c.author}:</span> {c.text}
              </div>
            ))}
            <div className="flex space-x-2 mt-2">
              <input value={commentInput[entry.id]?.text || ''} onChange={e=>setCommentInput({...commentInput, [entry.id]: {text: e.target.value}})} placeholder="Update teammates..." className="flex-1 bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs outline-none" />
              <button onClick={()=>{ if(!commentInput[entry.id]?.text) return; onAddComment(entry.id, commentInput[entry.id].text, "Staff"); setCommentInput({...commentInput, [entry.id]: {text:''}}); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-[10px] shadow-sm">POST</button>
            </div>
          </div>

          <div className="mt-6 flex flex-col space-y-2">
            {entry.guestEmail && (
              <button onClick={() => handleSendEmail(entry, 'guest')} className="w-full py-3 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
                <Mail size={14} className="mr-2 text-gray-400" /> Email Guest
              </button>
            )}
            {entry.status === 'open' && (
              <>
                {entry.followUpEmail && (
                  <button onClick={() => handleSendEmail(entry, 'manager')} className="w-full bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center shadow-lg active:scale-95">
                    <AlertCircle size={14} className="mr-2" /> Alert Manager Now
                  </button>
                )}
                <button onClick={() => onResolve(entry.id)} className="w-full bg-amber-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center shadow-lg active:scale-95">
                  <CheckCircle size={14} className="mr-2" /> Finalize Ticket
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimerIcon(props) {
  return <Clock {...props} />;
}
