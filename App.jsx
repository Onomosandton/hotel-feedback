This is a brilliant operational pivot. The difference between a good hotel and an exceptional hotel is realizing that service recovery (or celebration) must happen *before* the guest checks out!

To achieve this "intelligence" without forcing you to pay for external AI API keys, I have built **Dynamic Contextual String Interpolation** directly into the email engine.

### 🧠 How the new Email Intelligence works:

When a manager clicks "Email Guest", the app now actively reads the ticket and stitches the exact details into the Onomo-branded template.

* It reads the **Department**.
* It takes the **Reason** the staff member typed out and weaves it smoothly into the sentence.
* It looks at the **Action Taken** dropdown and tells the guest exactly what was done to fix it.
* If a staff member is praised, it dynamically adds a custom sentence promising to celebrate that specific staff member.
* **In-House Focus:** Every email is now anchored in the present tense, letting the guest know you are watching over them *right now* while they are still in the building, rather than wishing them a safe journey home.

Here is an example of what the app will now auto-generate for a complaint:

> *"Dear Mr. Smith, ... Please accept our most sincere apologies that **the aircon was leaking water onto the floor**. ... To ensure your comfort, we have immediately **upgraded / changed your guest room**. Since you are still with us, your peace of mind is our highest priority..."*

Copy this final, polished code block and replace your `App.jsx` on GitHub to push this intelligent email engine live!

```react
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Home, 
  PlusCircle, 
  List, 
  ThumbsUp, 
  ThumbsDown, 
  Coins, 
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
  AlertTriangle,
  ChevronDown,
  Archive
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

const SHARED_APP_ID = "onomo_live_production_v1";

const DEPARTMENTS = [
  'Front Desk', 'Housekeeping', 'Food & Beverage', 'Maintenance', 'Concierge', 'Spa & Wellness', 'Valet/Parking', 'Security/General'
];

// --- DYNAMIC ACTION OPTIONS ---
const COMPLAINT_ACTIONS = [
  'apologized and resolved immediately',
  'provided a complimentary F&B voucher',
  'upgraded / changed your guest room',
  'ensured the maintenance repair was completed',
  'provided a housekeeping recovery / amenity',
  'adjusted / waived the charges on your bill',
  'escalated the matter to the Department Head',
  'escalated the matter directly to the General Manager',
  'logged the issue for immediate internal review'
];

const COMPLIMENT_ACTIONS = [
  'Thanked guest & logged on guest profile',
  'Shared praise at daily briefing',
  'Recognized staff member directly',
  'Added to monthly recognition board',
  'Sent follow-up appreciation note'
];

const CURRENCY_MAP = {
  '$': 'USD', '€': 'EUR', '£': 'GBP', 'R': 'ZAR'
};

const HOD_EMAIL_LIST = "nicolene.claassen@onomohotel.com;chef.sandton@onomohotel.com;rdm.sandton@onomohotel.com;afom.sandton@onomohotel.com;fom.sandton@onomohotel.com;maintenance.sandton@onomohotel.com;hk.sandton@onomohotel.com;restaurant.sandton@onomohotel.com";

// --- AI DEPARTMENTAL SUGGESTION DICTIONARIES ---
const SUGGESTED_RESOLUTIONS = {
  'Front Desk': 'Listen actively, apologize sincerely, and offer a complimentary room upgrade or late checkout if appropriate.',
  'Housekeeping': 'Dispatch housekeeping immediately to rectify. Apologize and offer a complimentary amenity (e.g., fruit basket).',
  'Food & Beverage': 'Replace the item immediately. Consider comping the meal or offering a complimentary beverage/dessert.',
  'Maintenance': 'Send maintenance within 15 mins. Offer a room move if the issue cannot be resolved swiftly.',
  'Concierge': 'Apologize for the inconvenience, provide a better alternative recommendation, and offer a small courtesy gift.',
  'Spa & Wellness': 'Reschedule the service if needed, apologize, and offer a discount on their next treatment.',
  'Valet/Parking': 'Retrieve the vehicle promptly, apologize, and waive the parking fee for the day.',
  'Security/General': 'Ensure guest safety immediately. Escalate to management and document all details.'
};

const SUGGESTED_COMPLIMENT_ACTIONS = {
  'Front Desk': 'Thank the guest, share the feedback at the next briefing, and note it on the guest profile.',
  'Housekeeping': 'Pass the praise to the specific housekeeper and recognize them on the staff board.',
  'Food & Beverage': 'Share the compliment with the chef and servers. Invite the guest back.',
  'Maintenance': 'Commend the technician for their promptness and quality.',
  'Concierge': 'Recognize the concierge for their excellent recommendations.',
  'Spa & Wellness': 'Praise the therapist and encourage the guest to leave a public review.',
  'Valet/Parking': 'Thank the valet team for their efficiency and care.',
  'Security/General': 'Commend the team for maintaining a safe and welcoming environment.'
};

const SUGGESTED_INCIDENT_ACTIONS = {
  'Front Desk': 'Log incident details, secure any evidence, and inform the Duty Manager.',
  'Housekeeping': 'Do not disturb the scene. Immediately contact Security and the Executive Housekeeper.',
  'Food & Beverage': 'If medical, call for first aid. Clear the immediate area and notify the F&B Manager.',
  'Maintenance': 'Cordon off the area to prevent injury. Notify the Chief Engineer and Duty Manager.',
  'Concierge': 'Assist the guest calmly. Contact local authorities or medical help if instructed by management.',
  'Spa & Wellness': 'Provide immediate care if medical. Document the incident and notify the Spa Manager.',
  'Valet/Parking': 'Document vehicle damage or theft details. Involve Security and the guest immediately.',
  'Security/General': 'Follow standard emergency protocols. Secure the area, assist guests, and alert the General Manager.'
};

// --- SOP ESCALATION DIRECTIVES ---
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
    steps: 'Exceeds standard staff limits. The HOD or Duty Supervisor must take direct ownership, contact the guest, and implement structured service recovery within 15 to 45 minutes.'
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

const determineSOPSeverity = (text) => {
  const lower = (text || "").toLowerCase();
  if (/(fire|flood|injury|theft|stolen|vip|gm|general manager|emergency|medical|danger|police|assault|broken lock|power out|no water|furious|unacceptable|terrible|worst|shouting|legal)/.test(lower)) {
    return 'critical';
  }
  if (/(leak|supervisor|slow|rude|dirty|manager|upgrade|delay|wait|noise|loud|hot water|broken|aircon|ac|tv|fridge|card|key|smell|stain|infestation|bug|pest)/.test(lower)) {
    return 'intermediate';
  }
  return 'quick';
};

const analyzeSentiment = (text) => {
  const lower = (text || "").toLowerCase();
  if (/(furious|unacceptable|terrible|worst|disgusting|outrageous|angry|stolen|injury|emergency)/.test(lower)) return { label: 'Severe', emoji: '🚨', color: 'text-[#8e2a2a] bg-[#8e2a2a]/10 border-[#8e2a2a]/20' };
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
      setHistoryFilter('all');
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

  const archiveResolvedTickets = async () => {
    if (!window.confirm("Perform Monthly Reset? This will move all currently RESOLVED tickets into the Archive tab, clearing your active feeds for the new month.")) return;
    
    try {
      entries.forEach(e => {
        if (e.status === 'resolved' && !e.isArchived) {
          const entryRef = doc(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'feedback_entries', e.id);
          updateDoc(entryRef, { isArchived: true });
        }
      });
      showToast("Monthly Reset Complete: Resolved tickets safely archived.");
    } catch (error) {
      showToast(`Archive failed: ${error.message}`);
    }
  };

  if (loading && !cloudError) {
    return (
      <div className="flex flex-col h-screen w-full bg-[#f6ebda] items-center justify-center text-center font-sans">
        <Loader2 className="animate-spin text-[#003040] mb-4" size={48} />
        <p className="text-[#003040] font-medium animate-pulse">Syncing with secure cloud...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#f6ebda] font-sans relative overflow-hidden">
      {toast && (
        <div className="absolute top-20 md:top-6 left-1/2 transform -translate-x-1/2 w-[90%] md:w-auto md:min-w-[300px] bg-gray-800 text-white px-6 py-4 rounded-xl shadow-2xl z-50 text-sm text-center font-medium animate-in fade-in slide-in-from-top-4 flex items-center justify-center space-x-3">
          <CheckCircle size={20} className="text-green-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <header className="bg-[#003040] text-white px-4 md:px-8 py-4 shadow-md z-20 w-full flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-wide">Onomo Feedback Tracker</h1>
          <div className="flex items-center text-[10px] md:text-xs text-[#a0c8d2] font-semibold tracking-wider mt-0.5 md:mt-1">
            <RefreshCw size={10} className="mr-1.5 animate-spin" /> Live Sync Active
          </div>
        </div>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-[#003040]/80 text-white border border-[#a0c8d2]/20 rounded p-1.5 md:p-2 text-xs md:text-sm outline-none focus:ring-2 focus:ring-[#a0c8d2] cursor-pointer font-semibold shadow-sm hover:bg-[#003040]">
          <option value="$">USD ($)</option><option value="€">EUR (€)</option><option value="£">GBP (£)</option><option value="R">ZAR (R)</option>
        </select>
      </header>
      
      {cloudError && (
        <div className="bg-[#8e2a2a] text-white px-4 py-3 text-xs md:text-sm font-semibold flex items-center justify-center text-center z-20 shadow-md">
          <AlertCircle size={16} className="mr-2 shrink-0" /> {cloudError}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden w-full relative">
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)] flex-shrink-0 relative">
          <nav className="flex-1 px-4 py-8 space-y-3">
            {['dashboard', 'add', 'history'].map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab); if(tab==='history') setHistoryFilter('all'); }} className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === tab ? 'text-[#f18a00] bg-[#f18a00]/10 font-bold shadow-sm' : 'text-gray-500 hover:text-[#003040] hover:bg-gray-50 font-medium'}`}>
                {tab === 'dashboard' ? <Home size={20} className="mr-3 shrink-0" /> : tab === 'add' ? <PlusCircle size={20} className="mr-3 shrink-0" /> : <List size={20} className="mr-3 shrink-0" />}
                <span className="text-sm capitalize">{tab === 'add' ? 'New Entry' : tab}</span>
              </button>
            ))}
          </nav>
          
          <div className="p-4 m-4 bg-slate-900 text-white/60 text-[10px] rounded-xl font-mono flex flex-col space-y-2 border border-slate-800 shadow-inner">
            <div className="flex items-center space-x-1.5 border-b border-white/10 pb-2"><ShieldCheck size={12} className={user ? "text-green-400" : "text-amber-400"} /><span className="uppercase font-bold text-white/90 tracking-widest">System Link</span></div>
            <div className="flex justify-between items-center pt-1"><span>UID: <span className="text-blue-300">{user?.uid?.substring(0,6) || "..."}</span></span><span>{user ? "ONLINE" : "ERROR"}</span></div>
            <div className="flex justify-between items-center"><span>SYNC:</span><span className="text-white font-bold">{lastSync || "..."}</span></div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-8 relative w-full">
          {activeTab === 'dashboard' && <Dashboard entries={entries} currency={currency} exchangeRates={exchangeRates} onOpenTicketsClick={() => { setHistoryFilter('open'); setActiveTab('history'); }} onStatClick={(filter) => { setHistoryFilter(filter); setActiveTab('history'); }} onArchiveMonth={archiveResolvedTickets} />}
          {activeTab === 'add' && <AddEntryForm onSave={addEntry} currency={currency} exchangeRates={exchangeRates} />}
          {activeTab === 'history' && <History entries={entries} onResolve={resolveEntry} onAddComment={addComment} onMarkEmailSent={markEmailSent} currency={currency} exchangeRates={exchangeRates} filter={historyFilter} setFilter={setHistoryFilter} ticker={timeTicker} />}
        </main>
      </div>

      <nav className="md:hidden bg-white border-t border-gray-200 absolute bottom-0 w-full flex justify-around p-2 z-30 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {['dashboard', 'add', 'history'].map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); if(tab==='history') setHistoryFilter('all'); }} className={`flex flex-col items-center p-2 rounded-lg w-1/3 transition-colors ${activeTab === tab ? 'text-[#f18a00] bg-[#f18a00]/10' : 'text-gray-500 hover:text-[#003040]'}`}>
            {tab === 'dashboard' ? <Home size={24} /> : tab === 'add' ? <PlusCircle size={24} /> : <List size={24} />}
            <span className="text-xs mt-1 font-semibold capitalize">{tab === 'add' ? 'New Entry' : tab}</span>
          </button>
        ))}
      </nav>
      
      <div className="md:hidden absolute bottom-[72px] left-0 w-full bg-slate-900 text-white/60 px-3 py-1 text-[8px] font-mono flex justify-between border-t border-white/10 z-20 pointer-events-none">
        <span>Production Status: Live</span>
        {lastSync && <span>Sync: {lastSync}</span>}
      </div>
    </div>
  );
}

// --- COMPONENTS ---

function Dashboard({ entries, currency, exchangeRates, onOpenTicketsClick, onStatClick, onArchiveMonth }) {
  const [range, setRange] = useState('month'); 
  
  const filtered = useMemo(() => {
    return entries.filter(e => {
      const eDate = new Date(e.date);
      if (range === 'all') return true;
      if (range === 'month') {
         const now = new Date();
         return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear();
      }
      if (range === '1') return eDate.toDateString() === new Date().toDateString();
      
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(range));
      return eDate >= cutoff;
    });
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
    let comps = 0, complaints = 0, incidents = 0, cost = 0, open = 0;
    const targetISO = CURRENCY_MAP[currency] || 'USD';
    const currentViewMultiplier = exchangeRates[targetISO] || 1;

    filtered.forEach(e => {
      if (e.type === 'compliment') comps++;
      else if (e.type === 'incident') {
        incidents++;
        cost += ((Number(e.cost) || 0) * currentViewMultiplier);
        if (e.status === 'open') open++;
      } else {
        complaints++;
        cost += ((Number(e.cost) || 0) * currentViewMultiplier);
        if (e.status === 'open') open++;
      }
    });
    return { comps, complaints, incidents, cost, open };
  }, [filtered, currency, exchangeRates]);

  const trendData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toDateString(),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        complaints: 0,
        compliments: 0
      });
    }

    filtered.forEach(e => {
      const eDate = new Date(e.date).toDateString();
      const dayMatch = days.find(d => d.date === eDate);
      if (dayMatch) {
        if (e.type === 'complaint' || e.type === 'incident') dayMatch.complaints++;
        if (e.type === 'compliment') dayMatch.compliments++;
      }
    });

    const maxVal = Math.max(...days.map(d => Math.max(d.complaints, d.compliments, 1)));
    return { days, maxVal };
  }, [filtered]);

  const exportCSV = () => {
    const headers = ['Type', 'Date', 'Guest/Location', 'Guest Email', 'Guest Phone', 'Department', 'Severity', 'Reason', 'Action', 'Base Cost (USD)', 'Status', 'Handled By', 'Sentiment'];
    const rows = filtered.map(e => {
      const sentimentStr = e.sentiment ? e.sentiment.label : 'N/A';
      const safeReason = e.reason ? String(e.reason).replace(/"/g, '""') : '';
      const safeAction = e.actionTaken ? String(e.actionTaken).replace(/"/g, '""') : '';
      return `"${e.type}","${new Date(e.date).toLocaleDateString()}","${e.guestName}","${e.guestEmail || ''}","${e.guestPhone || ''}","${e.department}","${e.severity || 'quick'}","${safeReason}","${safeAction}","${e.cost || 0}","${e.status || 'resolved'}","${e.handledBy || ''}","${sentimentStr}"`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `onomo_feedback_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateEODReport = () => {
    const todayStr = new Date().toDateString();
    const todaysEntries = entries.filter(e => new Date(e.date).toDateString() === todayStr);

    let eodComps = 0, eodComplaints = 0, eodIncidents = 0, eodCost = 0, eodOpen = 0;
    const targetISO = CURRENCY_MAP[currency] || 'USD';
    const currentViewMultiplier = exchangeRates[targetISO] || 1;
    let detailsText = "";

    todaysEntries.forEach((e, i) => {
      if (e.type === 'compliment') eodComps++;
      else if (e.type === 'incident') {
        eodIncidents++;
        eodCost += ((Number(e.cost) || 0) * currentViewMultiplier);
        if (e.status === 'open') eodOpen++;
      } else {
        eodComplaints++;
        eodCost += ((Number(e.cost) || 0) * currentViewMultiplier);
        if (e.status === 'open') eodOpen++;
      }
      
      const statusText = (e.type === 'complaint' || e.type === 'incident') ? ` | Status: ${e.status.toUpperCase()}` : '';
      detailsText += `${i + 1}. [${e.type.toUpperCase()}] ${e.department} - ${e.guestName}\n   Issue/Reason: ${e.reason}${statusText}\n\n`;
    });

    const subject = `Daily Hotel Feedback Report - ${new Date().toLocaleDateString()}`;
    const body = `HOTEL FEEDBACK EOD REPORT\nDate: ${new Date().toLocaleDateString()}\n\n--- TODAY'S SUMMARY ---\nCompliments: ${eodComps}\nComplaints: ${eodComplaints}\nIncidents: ${eodIncidents}\nTickets Still Open: ${eodOpen}\nResolution Cost: ${currency}${eodCost.toFixed(2)}\n\n--- DETAILED LOGS ---\n${detailsText || "No feedback logged today."}\n\nGenerated by Onomo Feedback Tracker`;

    window.location.href = `mailto:${HOD_EMAIL_LIST}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest hidden md:block">Filter:</span>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg focus:ring-[#003040] focus:border-[#003040] block p-2 pr-10 font-medium w-full md:w-auto appearance-none relative">
            <option value="1">Today</option><option value="7">Last 7 Days</option><option value="month">This Month</option><option value="all">All Time</option>
          </select>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button onClick={onArchiveMonth} className="flex-1 md:flex-none flex items-center justify-center text-xs md:text-sm bg-gray-200 text-gray-700 px-3 py-2.5 rounded-lg font-semibold hover:bg-gray-300 transition-colors shadow-sm" title="Archive resolved tickets">
            <Archive size={16} className="mr-1.5" /> Archive Month
          </button>
          <button onClick={generateEODReport} className="flex-1 md:flex-none flex items-center justify-center text-xs md:text-sm bg-[#cf6231] text-white px-3 py-2.5 rounded-lg font-semibold hover:bg-[#cf6231]/90 transition-colors shadow-sm">
            <Mail size={16} className="mr-1.5" /> EOD Report
          </button>
          <button onClick={exportCSV} className="flex-1 md:flex-none flex items-center justify-center text-xs md:text-sm bg-[#003040] text-white px-3 py-2.5 rounded-lg font-semibold hover:bg-[#003040]/90 transition-colors shadow-sm">
            <Download size={16} className="mr-1.5" /> Export CSV
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 md:gap-6">
        <StatBox label="Praises" value={stats.comps} color="text-[#595733] bg-[#595733]/10 border-[#595733]/20 hover:bg-[#595733]/20 cursor-pointer transition-colors" onClick={() => onStatClick('compliment')} />
        <StatBox label="Complaints" value={stats.complaints} color="text-[#8e2a2a] bg-[#8e2a2a]/10 border-[#8e2a2a]/20 hover:bg-[#8e2a2a]/20 cursor-pointer transition-colors" onClick={() => onStatClick('complaint')} />
        <StatBox label="Incidents" value={stats.incidents} color="text-[#003040] bg-[#a0c8d2]/30 border-[#a0c8d2]/40 hover:bg-[#a0c8d2]/50 cursor-pointer transition-colors" onClick={() => onStatClick('incident')} />
      </div>
      
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        <MetricCard label="Tickets Open" value={stats.open} color="bg-white border-red-200 text-[#8e2a2a]" onClick={onOpenTicketsClick} icon={<AlertCircle size={18} className="text-[#8e2a2a]" />} />
        <MetricCard label="Total Resolution Cost" value={`${currency}${stats.cost.toFixed(2)}`} color="bg-white border-gray-200 text-[#003040]" icon={<Coins size={18} className="text-[#a0c8d2]" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="flex flex-col">
          <h2 className="text-lg md:text-xl font-bold text-[#003040] mb-3 flex items-center">
            <Trophy size={20} className="mr-2 text-[#ffb131]" /> Staff Performance Board
          </h2>
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 space-y-4 shadow-sm flex-1">
            {staffLeaderboard.map((member, index) => {
              const medalColors = ["text-[#ffb131]", "text-slate-400", "text-[#cf6231]"];
              return (
                <div key={member.name} className="flex justify-between items-center text-sm md:text-base border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center space-x-3 md:space-x-4 truncate">
                    <span className="w-6 md:w-8 text-center font-bold">
                      {index < 3 ? <Medal size={22} className={medalColors[index]} /> : <span className="text-gray-400">{index + 1}</span>}
                    </span>
                    <span className="font-semibold text-gray-800 truncate">{member.name}</span>
                  </div>
                  <span className="bg-[#ffb131]/10 text-[#cf6231] font-bold text-xs md:text-sm px-3 md:px-4 py-1.5 rounded-full flex items-center">
                    <ThumbsUp size={14} className="mr-1.5" /> {member.count} Praises
                  </span>
                </div>
              );
            })}
            {staffLeaderboard.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 opacity-60">
                 <Trophy size={48} className="mb-3" />
                 <p className="italic text-sm">No staff mentions captured yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <h2 className="text-lg md:text-xl font-bold text-[#003040] mb-3 flex items-center">
            <Activity size={20} className="mr-2 text-[#a0c8d2]" /> 7-Day Issue Trend
          </h2>
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 flex-1 flex flex-col justify-end min-h-[220px] shadow-sm">
            <div className="flex items-end justify-between space-x-1 md:space-x-2 h-40 relative">
              <div className="absolute top-0 right-0 flex flex-col items-end space-y-1 opacity-60 z-10 bg-white/50 p-1">
                 <span className="text-[10px] font-bold text-[#595733] flex items-center"><span className="w-2 h-2 bg-[#595733] mr-1 rounded-sm"></span> Praises</span>
                 <span className="text-[10px] font-bold text-[#8e2a2a] flex items-center"><span className="w-2 h-2 bg-[#8e2a2a] mr-1 rounded-sm"></span> Issues</span>
              </div>

              {trendData.days.map((day, i) => (
                <div key={i} className="flex flex-col items-center flex-1 group h-full justify-end pb-6 relative">
                  <div className="flex w-full justify-center items-end space-x-0.5 h-full">
                    <div className="w-1/2 bg-[#595733] rounded-t-sm transition-all hover:opacity-80" style={{ height: `${(day.compliments / trendData.maxVal) * 100}%` }}></div>
                    <div className="w-1/2 bg-[#8e2a2a] rounded-t-sm transition-all hover:opacity-80" style={{ height: `${(day.complaints / trendData.maxVal) * 100}%` }}></div>
                  </div>
                  <span className="text-[10px] md:text-xs text-gray-500 font-medium absolute bottom-0">{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatBox({ label, value, color, onClick }) {
  return (
    <div onClick={onClick} className={`${color} p-4 md:p-6 rounded-2xl border shadow-sm flex flex-col items-center justify-center min-h-[100px] ${onClick ? 'active:scale-95' : ''}`}>
      <span className="text-3xl md:text-4xl font-bold leading-none mb-2">{value}</span>
      <span className="text-xs md:text-sm font-semibold text-center opacity-80 uppercase tracking-widest break-words">{label}</span>
    </div>
  );
}

function MetricCard({ label, value, color, onClick, icon }) {
  return (
    <div onClick={onClick} className={`${color} p-4 md:p-6 rounded-2xl border shadow-sm transition-all min-h-[100px] active:scale-[0.98] ${onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300' : ''} flex flex-col justify-between`}>
      <div className="flex flex-col md:flex-row md:items-center items-start md:space-x-2 space-y-1 md:space-y-0 mb-3">
        {icon}
        <span className="text-xs md:text-sm font-bold opacity-70 uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-2xl md:text-3xl font-bold truncate block text-[#003040]">{value}</span>
    </div>
  );
}

function AddEntryForm({ onSave, currency, exchangeRates }) {
  const [type, setType] = useState('complaint');
  const [form, setForm] = useState({ 
    guestName: '', guestEmail: '', guestPhone: '', department: DEPARTMENTS[0], reason: '', 
    handledBy: '', actionTaken: COMPLAINT_ACTIONS[0], cost: '', status: 'resolved',
    followUpEmail: '', followUpPhone: '', guestEmailSent: false, managerEmailSent: false, escalationSent: false, staffMentioned: ''
  });

  const activeActionOptions = type === 'compliment' ? COMPLIMENT_ACTIONS : COMPLAINT_ACTIONS;

  useEffect(() => {
    if (!activeActionOptions.includes(form.actionTaken)) {
      setForm(prev => ({ ...prev, actionTaken: activeActionOptions[0] }));
    }
  }, [type, activeActionOptions, form.actionTaken]);

  const inferredSeverity = useMemo(() => {
    return (type === 'complaint' || type === 'incident') ? determineSOPSeverity(form.reason) : 'quick';
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
      isArchived: false,
      comments: [] 
    };

    let whatsappCallback = null;
    if ((type === 'complaint' || type === 'incident') && (form.department === 'Maintenance' || form.department === 'Housekeeping' || inferredSeverity === 'critical')) {
      let alertHeading = inferredSeverity === 'critical' ? `🚨 *CRITICAL GM INTERVENTION REQUIRED* 🚨` : `🚨 *NEW TICKET ALERT* 🚨`;
      const formattedMsg = `${alertHeading}\n\n*Type:* ${type.toUpperCase()}\n*SOP Status:* ${SOP_FRAMEWORK[inferredSeverity].label}\n*Dept:* ${form.department}\n*Guest/Location:* ${form.guestName}\n*Details:* ${form.reason}\n*Logged By:* ${form.handledBy}`;
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedMsg)}`;
      
      whatsappCallback = () => {
        window.open(whatsappUrl, 'whatsapp_shared_tab');
      };
    }

    onSave(finalizedEntry, whatsappCallback);
    
    setForm({ 
      guestName: '', guestEmail: '', guestPhone: '', department: DEPARTMENTS[0], reason: '', 
      handledBy: '', actionTaken: activeActionOptions[0], cost: '', status: 'resolved',
      followUpEmail: '', followUpPhone: '', guestEmailSent: false, managerEmailSent: false, escalationSent: false, staffMentioned: ''
    });
  };

  return (
    <form onSubmit={submit} className="p-4 md:p-8 space-y-4 md:space-y-6 font-sans max-w-4xl mx-auto animate-in fade-in duration-500">
      
      <div className="flex bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm">
        <button type="button" onClick={() => setType('compliment')} className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg transition-all ${type === 'compliment' ? 'bg-[#595733]/10 shadow-sm text-[#595733]' : 'text-gray-500 hover:bg-gray-50'}`}>Compliment</button>
        <button type="button" onClick={() => setType('complaint')} className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg transition-all ${type === 'complaint' ? 'bg-[#8e2a2a]/10 shadow-sm text-[#8e2a2a]' : 'text-gray-500 hover:bg-gray-50'}`}>Complaint</button>
        <button type="button" onClick={() => setType('incident')} className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg transition-all ${type === 'incident' ? 'bg-[#003040]/10 shadow-sm text-[#003040]' : 'text-gray-500 hover:bg-gray-50'}`}>Incident Log</button>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-bold text-xl text-[#003040] border-b border-gray-100 pb-3 flex items-center">
          <Users className="mr-2 text-[#a0c8d2]" size={20} /> {type === 'incident' ? 'Incident Location/Guest' : 'Guest Details'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{type === 'incident' ? 'Guest Name or Specific Area' : 'Guest Name / Room No.'}</label>
            <input required value={form.guestName} onChange={e=>setForm({...form, guestName: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 md:p-4 text-sm outline-none focus:ring-2 focus:ring-[#003040] transition-shadow" placeholder="e.g. Room 412 or Lobby Area" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Guest Email</label>
            <div className="relative">
               <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input type="email" value={form.guestEmail} onChange={e=>setForm({...form, guestEmail: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 md:p-4 pl-10 md:pl-12 text-sm outline-none focus:ring-2 focus:ring-[#003040] transition-shadow" placeholder="guest@email.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Guest Phone</label>
            <div className="relative">
               <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input type="tel" value={form.guestPhone} onChange={e=>setForm({...form, guestPhone: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 md:p-4 pl-10 md:pl-12 text-sm outline-none focus:ring-2 focus:ring-[#003040] transition-shadow" placeholder="+1 234..." />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-bold text-xl text-[#003040] border-b border-gray-100 pb-3 flex items-center">
          <FileText className="mr-2 text-[#a0c8d2]" size={20} /> Event Documentation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department Mentioned</label>
            <div className="relative">
              <select value={form.department} onChange={e=>setForm({...form, department: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 md:p-4 pr-10 md:pr-12 text-sm outline-none bg-white focus:ring-2 focus:ring-[#003040] cursor-pointer appearance-none">
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Specific Issue / Details</label>
            <textarea required value={form.reason} onChange={e=>setForm({...form, reason: e.target.value})} rows="2" className="w-full border border-gray-300 rounded-xl p-3 md:p-4 text-sm outline-none focus:ring-2 focus:ring-[#003040] resize-none" placeholder={type !== 'compliment' ? "Provide details to auto-classify escalation..." : "What exactly did they love?"} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#a0c8d2]/10 p-4 rounded-xl border border-[#a0c8d2]/30 flex flex-col space-y-2">
              <div className="flex items-center space-x-2 pb-2 border-b border-black/5">
                <Lightbulb className="text-[#003040]" size={18} />
                <span className="font-bold text-sm text-[#003040]">AI Department Guidance</span>
              </div>
              <p className="text-xs md:text-sm text-[#003040]/80 leading-relaxed font-medium">
                {type === 'complaint' ? SUGGESTED_RESOLUTIONS[form.department] 
                 : type === 'incident' ? SUGGESTED_INCIDENT_ACTIONS[form.department] 
                 : SUGGESTED_COMPLIMENT_ACTIONS[form.department]}
              </p>
            </div>
            
            {(type === 'complaint' || type === 'incident') && form.reason.trim().length > 2 && (
              <div className={`p-4 rounded-xl border flex flex-col space-y-2 transition-all duration-300 ${SOP_FRAMEWORK[inferredSeverity].color}`}>
                <div className="flex items-center space-x-2 border-b pb-2 border-black/5">
                  {SOP_FRAMEWORK[inferredSeverity].icon}
                  <span className="font-bold text-sm uppercase tracking-wide">SOP: {SOP_FRAMEWORK[inferredSeverity].label}</span>
                </div>
                <p className="text-xs md:text-sm leading-relaxed font-bold opacity-90">{SOP_FRAMEWORK[inferredSeverity].authority}</p>
                <p className="text-xs md:text-sm leading-relaxed italic opacity-80 mt-1">"{SOP_FRAMEWORK[inferredSeverity].steps}"</p>
              </div>
            )}
        </div>

        {type === 'compliment' && (
           <div>
             <label className="block text-sm font-semibold text-gray-700 mb-1.5">Staff Member Mentioned (Optional)</label>
             <div className="relative">
                <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#cf6231]" size={18} />
                <input value={form.staffMentioned} onChange={e=>setForm({...form, staffMentioned: e.target.value})} className="w-full border border-[#cf6231]/30 bg-[#cf6231]/5 rounded-xl p-3 md:p-4 pl-10 md:pl-12 text-sm outline-none focus:ring-2 focus:ring-[#cf6231] text-[#cf6231] font-bold" placeholder="Who did the guest praise?" />
             </div>
           </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Action Taken / Standard Resolution</label>
          <div className="relative">
            <select value={form.actionTaken} onChange={e=>setForm({...form, actionTaken: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 md:p-4 pr-10 md:pr-12 text-sm outline-none bg-white focus:ring-2 focus:ring-[#003040] cursor-pointer appearance-none">
              {activeActionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          </div>
        </div>
      </div>

      {(type === 'complaint' || type === 'incident') && (
        <div className="bg-white p-5 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-xl text-[#003040] border-b border-gray-100 pb-3 flex items-center">
             <Activity className="mr-2 text-[#a0c8d2]" size={20} /> Escalation & Costs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
              <div className="relative">
                <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 md:p-4 pr-10 md:pr-12 text-sm outline-none focus:ring-2 focus:ring-[#003040] bg-white font-bold text-[#8e2a2a] cursor-pointer appearance-none">
                  <option value="open">Requires Further Action (Open)</option><option value="resolved" className="text-green-700">Resolved & Closed</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cost / Damage</label>
              <div className="relative w-full">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold"><Coins size={18} /></span>
                <input type="number" step="any" value={form.cost} onChange={e=>setForm({...form, cost: e.target.value})} className="bg-white border border-gray-300 rounded-xl p-3 md:p-4 pl-12 md:pl-14 text-sm font-bold text-[#8e2a2a] outline-none w-full focus:ring-2 focus:ring-[#003040]" placeholder="0.00" />
              </div>
            </div>
          </div>
          
          {form.status === 'open' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-4 border-t border-gray-100 animate-in fade-in duration-300">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{inferredSeverity === 'critical' ? 'GM Email Target' : 'Supervisor / HOD Email Target'}</label>
                <div className="relative">
                   <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                   <input type="email" value={form.followUpEmail} onChange={e=>setForm({...form, followUpEmail: e.target.value})} className="w-full bg-[#f6ebda]/50 border border-gray-200 rounded-xl p-3 md:p-4 pl-10 md:pl-12 text-sm outline-none focus:ring-2 focus:ring-[#003040]" placeholder="manager@hotel.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{inferredSeverity === 'critical' ? 'GM WhatsApp Number Target' : 'Handler WhatsApp Number'}</label>
                <div className="relative">
                   <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                   <input type="tel" value={form.followUpPhone} onChange={e=>setForm({...form, followUpPhone: e.target.value})} className="w-full bg-[#f6ebda]/50 border border-gray-200 rounded-xl p-3 md:p-4 pl-10 md:pl-12 text-sm outline-none focus:ring-2 focus:ring-[#003040]" placeholder="+27 82 123 4567" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
         <div className="w-full md:w-1/3 bg-[#a0c8d2]/10 p-3 md:p-4 rounded-xl border border-[#a0c8d2]/30 shadow-sm">
            <label className="block text-xs font-bold text-[#003040] mb-1.5 uppercase tracking-wider">Logged By Profile</label>
            <input required value={form.handledBy} onChange={e=>setForm({...form, handledBy: e.target.value})} className="w-full border border-[#a0c8d2] rounded-lg p-2.5 text-sm font-bold text-[#003040] outline-none focus:ring-2 focus:ring-[#003040] bg-white text-center" placeholder="Your Full Name" />
         </div>
         <button type="submit" className="w-full md:w-2/3 bg-[#003040] text-white font-bold py-4 md:py-6 rounded-xl text-lg hover:bg-[#003040]/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center">
            <Database size={24} className="mr-3 text-[#a0c8d2]" /> Push to Cloud Securely
         </button>
      </div>
    </form>
  );
}

function History({ entries, onResolve, onAddComment, onMarkEmailSent, currency, exchangeRates, filter, setFilter, ticker }) {
  const [commentInput, setCommentInput] = useState({});
  
  const filtered = entries.filter(e => {
    if (filter === 'archived') return e.isArchived;
    if (e.isArchived) return false;

    if (filter === 'all') return true;
    if (filter === 'open') return e.status === 'open';
    if (filter === 'resolved') return e.status === 'resolved';
    if (filter === 'compliment') return e.type === 'compliment';
    if (filter === 'complaint') return e.type === 'complaint';
    if (filter === 'incident') return e.type === 'incident';
    return true;
  });
  
  const currentISO = CURRENCY_MAP[currency] || 'USD';
  const displayConversionFactor = exchangeRates[currentISO] || 1;

  const getSLADetails = (entry) => {
    if ((entry.type !== 'complaint' && entry.type !== 'incident') || entry.status !== 'open') return { isBreached: false };
    const msElapsed = Date.now() - new Date(entry.date).getTime();
    const minutesElapsed = msElapsed / 60000;
    
    return {
      isBreached: minutesElapsed >= 15, 
      hours: Math.floor(minutesElapsed / 60),
      minutes: Math.floor(minutesElapsed % 60)
    };
  };

  const handleSendEmail = (entry, emailType) => {
    let to = "", sub = "", body = "";
    if (emailType === 'manager') {
      to = entry.followUpEmail || "";
      sub = entry.severity === 'critical' ? `🚨 [CRITICAL GM ESCALATION]: ${entry.department}` : `[HOD NOTICE] OPEN TICKET: ${entry.department}`;
      body = `SOP LEVEL: ${SOP_FRAMEWORK[entry.severity || 'quick'].label}\n\nTYPE: ${entry.type.toUpperCase()}\nGUEST/ROOM: ${entry.guestName}\nREASON: ${entry.reason}\nLOGGED BY: ${entry.handledBy}`;
    } else if (emailType === 'escalation') {
      const sla = getSLADetails(entry);
      to = entry.followUpEmail || "";
      sub = `🚨 [SLA BREACH ALERT] ${entry.department} Ticket Overdue`;
      body = `WARNING: The following ticket has breached its 15-minute resolution window.\n\nOverdue by: ${sla.hours}h ${sla.minutes}m\nRoom/Guest: ${entry.guestName}\nIssue: ${entry.reason}\nLogged By: ${entry.handledBy}`;
    } else {
      
      // DYNAMIC IN-HOUSE CONTEXTUAL GUEST EMAIL ENGINE
      to = entry.guestEmail || "";
      
      // Clean up the text input so it flows smoothly in the middle of a sentence
      const lowerReason = entry.reason ? entry.reason.charAt(0).toLowerCase() + entry.reason.slice(1) : "this matter";
      const lowerAction = entry.actionTaken ? entry.actionTaken.charAt(0).toLowerCase() + entry.actionTaken.slice(1) : "addressed the situation";

      if (entry.type === 'compliment') {
        sub = `Thank you for experiencing ONOMO Hospitality!`;
        const staffShoutout = entry.staffMentioned ? ` I will personally ensure that ${entry.staffMentioned} is recognized for their fantastic service and true O-Smile.` : '';
        
        body = `Dear ${entry.guestName},\n\nWarm greetings from the ONOMO Sandton family!\n\nThank you so much for sharing your wonderful feedback regarding our ${entry.department}. It brings us immense joy to hear that ${lowerReason}.${staffShoutout}\n\nSince you are still in-house with us, we wanted to reach out immediately to celebrate this with you. African hospitality is at the heart of everything we do, and ensuring you feel at home is our greatest reward.\n\nPlease let us know if there is anything else we can do to make the rest of your stay even more special.\n\nWarmest regards,\nONOMO Hotel Sandton Management`;
        
      } else if (entry.type === 'incident') {
        sub = `Checking in on your experience at ONOMO Sandton`;
        body = `Dear ${entry.guestName},\n\nWarm greetings from ONOMO Hotel Sandton.\n\nI am reaching out personally following the incident reported regarding ${lowerReason}. Please accept our sincere concern, as your safety and comfort are our absolute highest priorities.\n\nWe have immediately ${lowerAction} to ensure everything is resolved and secure.\n\nAs you are still our guest, we want to ensure you feel completely looked after. Please let us know if you require any further assistance or if there is anything we can do to make the remainder of your stay more comfortable.\n\nWith warm regards and care,\nONOMO Hotel Sandton Management`;
        
      } else {
        sub = `Following up on your experience at ONOMO Sandton`;
        body = `Dear ${entry.guestName},\n\nWarm greetings from ONOMO Hotel Sandton.\n\nI am writing to you personally regarding your recent experience with our ${entry.department}. Please accept our most sincere apologies that ${lowerReason}. At ONOMO, we pride ourselves on delivering warm, flawless African hospitality, and it deeply saddens us when we fall short.\n\nTo ensure your comfort, we have immediately ${lowerAction}. We hope this helps to bring the ONOMO smile back to your stay.\n\nSince you are still with us, your peace of mind is our highest priority. I would love to ensure the rest of your time here is completely flawless. Please let us know if you need any further assistance.\n\nWith sincere apologies and warm regards,\nONOMO Hotel Sandton Management`;
      }
    }
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    onMarkEmailSent(entry.id, emailType);
  };

  const handleWhatsAppEscalation = (entry) => {
    const sla = getSLADetails(entry);
    const cleanedPhone = (entry.followUpPhone || "").replace(/\s+/g, '');
    let msg = "";
    
    if (entry.severity === 'critical') {
      msg = `🚨 *CRITICAL GM ACTION INTERVENTION* 🚨\n\nA critical incident requires executive review and physical service recovery action.\n\n*Type:* ${entry.type.toUpperCase()}\n*Room/Guest:* ${entry.guestName}\n*Issue:* ${entry.reason}\n*Department:* ${entry.department}\n*Logged By:* ${entry.handledBy}`;
    } else {
      msg = `⚠️ *SLA BREACH NOTIFICATION* ⚠️\n\nThis ticket has crossed its 15-minute threshold without finalization.\n\n*Overdue Time:* ${sla.hours}h ${sla.minutes}m\n*Room/Guest:* ${entry.guestName}\n*Issue:* ${entry.reason}\n*Department:* ${entry.department}`;
    }
    
    const whatsappUrl = cleanedPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      
    window.open(whatsappUrl, 'whatsapp_shared_tab');
    onMarkEmailSent(entry.id, 'escalation');
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      <div className="flex flex-wrap bg-white rounded-xl p-2 md:p-3 shadow-sm border border-gray-200 gap-2 w-full">
        {['all', 'open', 'resolved', 'complaint', 'incident', 'compliment', 'archived'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`flex-1 min-w-[30%] md:min-w-[100px] py-2 md:py-2.5 text-xs md:text-sm font-bold rounded-lg capitalize transition-all ${filter === f ? (f === 'archived' ? 'bg-gray-800 text-white' : 'bg-[#003040] shadow-md text-white') : 'text-gray-500 hover:bg-gray-100'}`}>
            {f === 'archived' ? <span className="flex items-center justify-center"><Archive size={14} className="mr-1.5" /> Archive</span> : f}
          </button>
        ))}
      </div>

      {entries.length === 0 || filtered.length === 0 ? (
         <div className="p-12 md:p-24 bg-white rounded-2xl border border-gray-200 text-center text-gray-400 flex flex-col items-center h-full justify-center shadow-sm">
            {filter === 'archived' ? <Archive size={64} className="mb-4 text-gray-200" /> : <List size={64} className="mb-4 text-gray-200" />}
            <p className="text-lg font-medium">No records found for this filter.</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filtered.map(entry => {
            const localDisplayCost = (Number(entry.cost) || 0) * displayConversionFactor;
            const sla = getSLADetails(entry);
            const activeSeverity = entry.severity || 'quick';

            const leftBorderColor = sla.isBreached 
              ? '#8e2a2a' 
              : (entry.type === 'incident'
                  ? '#003040'
                  : entry.type === 'compliment' 
                    ? '#595733' 
                    : activeSeverity === 'critical' 
                      ? '#8e2a2a' 
                      : activeSeverity === 'intermediate' 
                        ? '#cf6231' 
                        : '#595733');

            return (
              <div 
                key={entry.id} 
                className={`bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-l-8 transition-all duration-300 flex flex-col h-full ${
                  sla.isBreached ? 'border-[#8e2a2a] bg-[#8e2a2a]/5 hover:shadow-md' : 'border-gray-200 hover:shadow-md'
                } ${entry.isArchived ? 'opacity-80 grayscale-[30%]' : ''}`} 
                style={{ borderLeftColor: leftBorderColor }}
              >
                <div>
                  {entry.isArchived && (
                     <div className="mb-4 -mx-5 md:-mx-6 -mt-5 md:-mt-6 bg-gray-800 text-white font-bold uppercase text-[10px] md:text-xs tracking-wider p-2.5 flex items-center justify-center space-x-2 rounded-t-xl shadow-sm">
                       <Archive size={14} /><span>Archived Record</span>
                     </div>
                  )}

                  {sla.isBreached && !entry.isArchived && (
                    <div className="mb-4 -mx-5 md:-mx-6 -mt-5 md:-mt-6 bg-[#8e2a2a] text-white font-bold uppercase text-[10px] md:text-xs tracking-wider p-2.5 flex items-center justify-center space-x-2 animate-pulse rounded-t-xl shadow-sm">
                      <Clock size={14} />
                      <span>⚠️ SLA BREACHED: Overdue {sla.hours}h {sla.minutes}m</span>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                      {entry.type === 'compliment' && <ThumbsUp className="text-[#595733] shrink-0" size={20} />}
                      {entry.type === 'complaint' && <ThumbsDown className="text-[#8e2a2a] shrink-0" size={20} />}
                      {entry.type === 'incident' && <AlertTriangle className="text-[#003040] shrink-0" size={20} />}
                      
                      {(entry.type === 'complaint' || entry.type === 'incident') && (
                        <span className={`text-[10px] md:text-xs px-2.5 py-1 rounded-full font-bold border whitespace-nowrap ${SOP_FRAMEWORK[activeSeverity].badge}`}>
                          {SOP_FRAMEWORK[activeSeverity].label}
                        </span>
                      )}
                      
                      <span className={`text-[10px] md:text-xs px-2.5 py-1 rounded-full font-bold border whitespace-nowrap ${entry.sentiment?.color || 'bg-gray-50 text-gray-400'}`}>{entry.sentiment?.label || 'Neutral'}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 text-lg md:text-xl break-words">{entry.guestName}</h3>
                  <p className="text-sm md:text-base font-semibold text-gray-600 mt-1 whitespace-pre-wrap break-words">{entry.reason}</p>
                  
                  <div className="grid grid-cols-2 gap-y-3 mt-4 text-xs md:text-sm text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div><span className="block text-[9px] uppercase tracking-widest font-bold mb-0.5">Dept</span><span className="font-bold text-gray-800 break-words">{entry.department}</span></div>
                    <div><span className="block text-[9px] uppercase tracking-widest font-bold mb-0.5">Logged By</span><span className="font-bold text-gray-800 break-words">{entry.handledBy}</span></div>
                    <div className="col-span-2 flex justify-between items-center pt-2 border-t border-gray-200">
                       <span className="text-[10px] text-gray-400 font-bold flex items-center"><Calendar size={12} className="mr-1.5" /> {new Date(entry.date).toLocaleDateString()}</span>
                       {(entry.type === 'complaint' || entry.type === 'incident') && <span className="font-bold text-[#8e2a2a] flex items-center bg-white px-2 py-0.5 rounded shadow-sm border border-red-100"><Coins size={12} className="mr-1.5" /> {localDisplayCost.toFixed(2)}</span>}
                    </div>
                    {entry.type === 'compliment' && entry.staffMentioned && <div className="col-span-2 text-[#cf6231] font-bold flex items-center pt-2 border-t border-gray-200"><Award size={14} className="mr-1.5" /> Recognized: {entry.staffMentioned}</div>}
                  </div>

                  <div className="mt-4">
                    <span className="text-gray-400 font-bold uppercase tracking-widest block text-[9px] mb-1.5">Action Taken</span>
                    <p className="text-gray-700 text-sm leading-relaxed italic break-words whitespace-pre-wrap">"{entry.actionTaken}"</p>
                  </div>
                </div>

                <div className="mt-auto pt-5 border-t border-gray-100 space-y-4">
                  <div className="bg-[#f6ebda]/30 rounded-xl p-3 border border-[#a0c8d2]/30">
                    <h4 className="text-xs font-bold text-[#003040] mb-2 flex items-center"><MessageSquare size={14} className="mr-1.5" /> Internal Notes</h4>
                    <div className="space-y-2 mb-3 max-h-24 overflow-y-auto pr-1">
                      {entry.comments?.map((c, i) => (
                        <div key={i} className="bg-white p-2 rounded-lg border border-gray-200 text-xs shadow-sm">
                          <span className="font-bold text-[#cf6231]">{c.author}:</span> <span className="text-gray-700 break-words whitespace-pre-wrap">{c.text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                      <input value={commentInput[entry.id]?.author || ''} onChange={e=>setCommentInput({...commentInput, [entry.id]: {...commentInput[entry.id], author: e.target.value}})} placeholder="Name" className="w-full md:w-1/3 bg-white border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-[#003040]" />
                      <input value={commentInput[entry.id]?.text || ''} onChange={e=>setCommentInput({...commentInput, [entry.id]: {...commentInput[entry.id], text: e.target.value}})} placeholder="Note..." className="w-full md:flex-1 bg-white border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-[#003040]" />
                      <button onClick={()=>{ if(!commentInput[entry.id]?.text) return; onAddComment(entry.id, commentInput[entry.id].text, commentInput[entry.id].author || "Staff"); setCommentInput({...commentInput, [entry.id]: {...commentInput[entry.id], text:''}}); }} className="w-full md:w-auto bg-[#003040] hover:bg-[#003040]/90 transition-colors text-white px-3 py-2 rounded-lg font-bold text-xs shadow-sm active:scale-95">Post</button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2.5">
                    {sla.isBreached && !entry.isArchived && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                        <p className="text-[10px] font-bold text-[#8e2a2a] uppercase tracking-widest text-center">Urgent Escalation</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleWhatsAppEscalation(entry)} className={`py-2 px-1 text-[10px] md:text-xs font-bold rounded-lg border flex items-center justify-center shadow-sm transition-all ${entry.escalationSent ? 'bg-green-600 text-white border-green-700' : 'bg-white border-red-300 text-red-700 hover:bg-red-100'}`}>
                            <MessageSquare size={14} className="mr-1.5" /> {entry.escalationSent ? "Escalated" : "WhatsApp"}
                          </button>
                          {entry.followUpEmail && (
                            <button onClick={() => handleSendEmail(entry, 'escalation')} className={`py-2 px-1 text-[10px] md:text-xs font-bold rounded-lg border flex items-center justify-center shadow-sm transition-all ${entry.escalationSent ? 'bg-green-600 text-white border-green-700' : 'bg-white border-red-300 text-red-700 hover:bg-red-100'}`}>
                              <Mail size={14} className="mr-1.5" /> Email
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {!entry.isArchived && entry.guestEmail && (
                      <button onClick={() => handleSendEmail(entry, 'guest')} className={`w-full font-bold py-2.5 rounded-xl border transition-all text-xs md:text-sm flex items-center justify-center shadow-sm active:scale-[0.98] ${entry.guestEmailSent ? 'bg-[#595733]/10 border-[#595733]/30 text-[#595733]' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {entry.guestEmailSent ? <CheckCircle size={16} className="mr-2" /> : <Mail size={16} className="mr-2 text-gray-400" />} {entry.guestEmailSent ? 'GUEST NOTIFIED' : 'Email Guest'}
                      </button>
                    )}
                    
                    {entry.status === 'open' && !entry.isArchived && (
                      <>
                        {entry.followUpEmail && !sla.isBreached && (
                          <button onClick={() => handleSendEmail(entry, 'manager')} className={`w-full py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center shadow-sm transition-all active:scale-[0.98] ${entry.managerEmailSent ? 'bg-green-600 text-white' : 'bg-[#003040] text-white hover:bg-[#003040]/90'}`}>
                            {entry.managerEmailSent ? <CheckCircle size={16} className="mr-2" /> : <AlertCircle size={16} className="mr-2" />} 
                            {entry.managerEmailSent ? (activeSeverity === 'critical' ? 'GM NOTIFIED' : 'HOD ALERTED') : (activeSeverity === 'critical' ? 'Escalate to GM' : 'Alert HOD')}
                          </button>
                        )}
                        
                        {activeSeverity === 'critical' && !sla.isBreached && (
                          <button onClick={() => handleWhatsAppEscalation(entry)} className="w-full bg-[#595733] hover:bg-[#595733]/90 text-white font-bold py-2.5 rounded-xl text-xs md:text-sm flex items-center justify-center shadow-sm active:scale-[0.98] transition-all">
                            <MessageSquare size={16} className="mr-2" /> WhatsApp GM Link
                          </button>
                        )}

                        <button onClick={() => onResolve(entry.id)} className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-sm font-bold shadow-md mt-2 transition-all active:scale-[0.98]">Close Ticket</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

```
