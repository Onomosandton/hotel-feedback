import React, { useState, useMemo, useEffect } from 'react';
import { 
  Home, PlusCircle, List, ThumbsUp, ThumbsDown, Coins, Award, Calendar,
  AlertCircle, CheckCircle, Clock, Lightbulb, FileText, Mail, Download,
  MessageSquare, Activity, Phone, Loader2, RefreshCw, Database,
  ShieldCheck, Trophy, Medal, ShieldAlert, UserCheck, Users, AlertTriangle,
  ChevronDown, Archive, Sparkles, PartyPopper, Heart, ArrowLeft, Star
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

// ==========================================
// 1. MAIN UNIFIED PORTAL CONTROLLER
// ==========================================
export default function App() {
  const [currentView, setCurrentView] = useState('portal'); // 'portal', 'feedback', 'recognition'

  if (currentView === 'feedback') {
    return <FeedbackApp onBackToPortal={() => setCurrentView('portal')} />;
  }

  if (currentView === 'recognition') {
    return <RecognitionApp onBackToPortal={() => setCurrentView('portal')} />;
  }

  // --- START SCREEN UI ---
  return (
    <div className="flex flex-col h-screen w-full bg-[#f6ebda] font-sans relative overflow-hidden items-center justify-center p-4">
      
      <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-5xl font-bold text-[#003040] mb-3 tracking-tight">Onomo Staff Portal</h1>
        <p className="text-gray-500 font-medium md:text-lg">Where would you like to go today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl animate-in fade-in zoom-in-95 duration-500 delay-150">
        
        {/* APP 1: GUEST FEEDBACK */}
        <div 
          onClick={() => setCurrentView('feedback')}
          className="bg-white border-2 border-[#003040] rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#003040] hover:text-white transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-2 group"
        >
          <div className="bg-[#a0c8d2]/20 p-6 rounded-full mb-6 group-hover:bg-white/10 transition-colors">
            <Building2 size={64} className="text-[#003040] group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-2xl font-bold mb-3 group-hover:text-white text-[#003040]">Guest Feedback</h2>
          <p className="text-sm font-medium opacity-70 group-hover:opacity-90 max-w-[250px]">
            Log complaints, incidents, and praises. Trigger escalations and track daily operations.
          </p>
        </div>

        {/* APP 2: TEAM RECOGNITION */}
        <div 
          onClick={() => setCurrentView('recognition')}
          className="bg-gradient-to-br from-[#ffb131] to-[#f18a00] border-2 border-[#f18a00] rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:from-[#f18a00] hover:to-[#cf6231] transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-2 text-white group"
        >
          <div className="bg-white/20 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
            <PartyPopper size={64} className="text-white drop-shadow-md" />
          </div>
          <h2 className="text-2xl font-bold mb-3 drop-shadow-sm">Team Cheers</h2>
          <p className="text-sm font-medium opacity-90 max-w-[250px]">
            Recognize your colleagues, celebrate the O-Smile, and crown the Employee of the Month!
          </p>
        </div>

      </div>
      
      <div className="absolute bottom-8 opacity-40 flex items-center text-xs font-bold text-[#003040] tracking-widest uppercase">
        <ShieldCheck size={14} className="mr-1.5" /> Secure Live Production Environment
      </div>
    </div>
  );
}


// ==========================================
// 2. TEAM RECOGNITION APP (FUN & FUNKY)
// ==========================================
function RecognitionApp({ onBackToPortal }) {
  const [activeTab, setActiveTab] = useState('give'); // 'give', 'board'
  const [entries, setEntries] = useState([]);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  
  // ALIGNED TO ONOMO CORE VALUES
  const CORE_VALUES = [
    'The Authentic O-Smile (Proudly Diverse) 🌍',
    'Going the Extra Mile (Drive) 🚀',
    'The Ultimate Team Player (Respect) 🤝',
    'Brilliant Problem Solver (Audacity) 💡',
    'Always Having My Back (Trust) 🛡️'
  ];

  const [form, setForm] = useState({
    recipient: '',
    coreValue: CORE_VALUES[0],
    message: '',
    sender: ''
  });

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const entriesRef = collection(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'recognition_entries');
    const unsubscribe = onSnapshot(entriesRef, (snapshot) => {
      const loadedEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(loadedEntries);
    });
    return () => unsubscribe();
  }, [user]);

  const submitCheer = async (e) => {
    e.preventDefault();
    if (!user) return showToast('Connection error.');
    try {
      const entriesRef = collection(db, 'artifacts', SHARED_APP_ID, 'public', 'data', 'recognition_entries');
      await addDoc(entriesRef, { 
        ...form, 
        date: new Date().toISOString(),
        userId: user.uid 
      });
      setForm({ recipient: '', coreValue: CORE_VALUES[0], message: '', sender: '' });
      setActiveTab('board');
      showToast('🎉 Cheer sent successfully!');
    } catch (error) {
      showToast(`Error: ${error.message}`);
    }
  };

  // Leaderboard Math (This Month Only)
  const leaderboard = useMemo(() => {
    const listMap = {};
    const now = new Date();
    
    entries.forEach(e => {
      const eDate = new Date(e.date);
      if (eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear()) {
        const name = e.recipient.trim();
        if (name) listMap[name] = (listMap[name] || 0) + 1;
      }
    });

    return Object.entries(listMap)
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points);
  }, [entries]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#fffdf9] font-sans relative overflow-hidden">
      {toast && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-[#f18a00] text-white px-6 py-4 rounded-full shadow-2xl z-50 text-sm font-bold flex items-center space-x-2 animate-bounce">
          <Sparkles size={20} /><span>{toast}</span>
        </div>
      )}

      {/* FUN HEADER */}
      <header className="bg-gradient-to-r from-[#ffb131] to-[#f18a00] text-white px-4 md:px-8 py-4 shadow-lg z-20 w-full flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button onClick={onBackToPortal} className="bg-white/20 p-2 rounded-full hover:bg-white/40 transition-colors">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center">
              Team Cheers <Sparkles size={20} className="ml-2" />
            </h1>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/80">Recognize Greatness</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 relative w-full p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* TAB TOGGLES */}
          <div className="flex bg-orange-50 rounded-2xl p-2 shadow-inner border border-orange-100">
            <button onClick={() => setActiveTab('give')} className={`flex-1 py-3 text-sm md:text-base font-bold rounded-xl transition-all ${activeTab === 'give' ? 'bg-white shadow-md text-[#f18a00]' : 'text-orange-900/50 hover:bg-orange-100'}`}>Give a Cheer</button>
            <button onClick={() => setActiveTab('board')} className={`flex-1 py-3 text-sm md:text-base font-bold rounded-xl transition-all ${activeTab === 'board' ? 'bg-white shadow-md text-[#f18a00]' : 'text-orange-900/50 hover:bg-orange-100'}`}>The Leaderboard</button>
          </div>

          {activeTab === 'give' && (
            <form onSubmit={submitCheer} className="bg-white p-6 md:p-8 rounded-3xl border border-orange-100 shadow-xl space-y-6 animate-in zoom-in-95 duration-300">
              <div className="text-center mb-6">
                <Heart size={48} className="text-[#cf6231] mx-auto mb-2" />
                <h2 className="text-2xl font-extrabold text-gray-800">Who made you smile today?</h2>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Colleague's Name</label>
                <input required value={form.recipient} onChange={e=>setForm({...form, recipient: e.target.value})} className="w-full border-2 border-orange-100 rounded-2xl p-4 text-lg font-bold outline-none focus:border-[#f18a00] bg-orange-50/50 transition-colors" placeholder="Who are you cheering for?" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Cheer (Core Value)</label>
                <div className="relative">
                  <select value={form.coreValue} onChange={e=>setForm({...form, coreValue: e.target.value})} className="w-full border-2 border-orange-100 rounded-2xl p-4 text-sm md:text-lg font-bold outline-none focus:border-[#f18a00] bg-orange-50/50 transition-colors appearance-none cursor-pointer text-[#cf6231]">
                    {CORE_VALUES.map(v => <option key={v}>{v}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none" size={24} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Leave a nice message</label>
                <textarea required value={form.message} onChange={e=>setForm({...form, message: e.target.value})} rows="3" className="w-full border-2 border-orange-100 rounded-2xl p-4 text-base outline-none focus:border-[#f18a00] bg-orange-50/50 transition-colors resize-none" placeholder="Thank you for always..." />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">From (Your Name)</label>
                <input required value={form.sender} onChange={e=>setForm({...form, sender: e.target.value})} className="w-full border-2 border-orange-100 rounded-2xl p-4 text-base outline-none focus:border-[#f18a00] bg-white transition-colors" placeholder="Your name" />
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-[#ffb131] to-[#f18a00] text-white font-black text-xl py-5 rounded-2xl hover:scale-[1.02] transition-transform shadow-lg flex items-center justify-center">
                <PartyPopper size={24} className="mr-3" /> Send Cheer!
              </button>
            </form>
          )}

          {activeTab === 'board' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* THE CROWN */}
              {leaderboard.length > 0 && (
                <div className="bg-gradient-to-b from-[#ffb131] to-[#f18a00] rounded-3xl p-8 text-center text-white shadow-2xl relative overflow-hidden">
                  <Star size={120} className="absolute -top-10 -right-10 text-white/20 rotate-45" />
                  <Trophy size={64} className="mx-auto mb-4 drop-shadow-md text-yellow-200" />
                  <h3 className="text-sm font-bold tracking-widest uppercase mb-1 opacity-90">Current Employee of the Month</h3>
                  <h2 className="text-5xl font-black mb-2">{leaderboard[0].name}</h2>
                  <div className="inline-block bg-white/20 px-6 py-2 rounded-full font-bold text-lg backdrop-blur-sm">
                    {leaderboard[0].points} Cheers Received
                  </div>
                </div>
              )}

              {/* THE LIST */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl space-y-4">
                <h3 className="font-bold text-xl text-gray-800 border-b border-gray-100 pb-3 flex items-center">
                   <Activity className="mr-2 text-[#cf6231]" size={20} /> This Month's Ranking
                </h3>
                {leaderboard.map((member, i) => (
                  <div key={member.name} className="flex items-center justify-between p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                    <div className="flex items-center space-x-4">
                      <span className={`text-2xl font-black w-8 text-center ${i===0?'text-[#f18a00]':i===1?'text-slate-400':i===2?'text-[#cf6231]':'text-gray-300'}`}>#{i+1}</span>
                      <span className="font-bold text-lg text-gray-800">{member.name}</span>
                    </div>
                    <span className="bg-white text-[#f18a00] font-black px-4 py-2 rounded-xl shadow-sm border border-orange-100 flex items-center">
                       {member.points} <Sparkles size={14} className="ml-1.5" />
                    </span>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                   <div className="text-center py-10 text-gray-400 font-bold">No cheers yet this month. Be the first!</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


// ==========================================
// 3. GUEST FEEDBACK APP (SERIOUS & OPERATIONAL)
// ==========================================
// Constants needed specific to Feedback
const DEPARTMENTS = [
  'Front Desk', 'Housekeeping', 'Food & Beverage', 'Maintenance', 'Concierge', 'Spa & Wellness', 'Valet/Parking', 'Security/General'
];

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

const CURRENCY_MAP = { '$': 'USD', '€': 'EUR', '£': 'GBP', 'R': 'ZAR' };
const HOD_EMAIL_LIST = "nicolene.claassen@onomohotel.com;chef.sandton@onomohotel.com;rdm.sandton@onomohotel.com;afom.sandton@onomohotel.com;fom.sandton@onomohotel.com;maintenance.sandton@onomohotel.com;hk.sandton@onomohotel.com;restaurant.sandton@onomohotel.com";

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
  if (/(fire|flood|injury|theft|stolen|vip|gm|general manager|emergency|medical|danger|police|assault|broken lock|power out|no water|furious|unacceptable|terrible|worst|shouting|legal)/.test(lower)) return 'critical';
  if (/(leak|supervisor|slow|rude|dirty|manager|upgrade|delay|wait|noise|loud|hot water|broken|aircon|ac|tv|fridge|card|key|smell|stain|infestation|bug|pest)/.test(lower)) return 'intermediate';
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

function FeedbackApp({ onBackToPortal }) {
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
    onAuthStateChanged(auth, setUser);
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
    if (openWhatsAppTrigger) openWhatsAppTrigger();
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

      {/* HEADER WITH UNIFIED PORTAL BACK BUTTON */}
      <header className="bg-[#003040] text-white px-4 md:px-6 py-4 shadow-md z-20 w-full flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <button onClick={onBackToPortal} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors" title="Back to Portal">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-wide">Guest Tracker</h1>
            <div className="flex items-center text-[9px] md:text-[10px] text-[#a0c8d2] font-semibold tracking-wider mt-0.5">
              <RefreshCw size={8} className="mr-1.5 animate-spin" /> Live Sync Active
            </div>
          </div>
        </div>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-[#003040]/80 text-white border border-[#a0c8d2]/20 rounded p-1.5 text-xs outline-none focus:ring-2 focus:ring-[#a0c8d2] cursor-pointer font-semibold shadow-sm hover:bg-[#003040]">
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
                {tab === 'dashboard' ? <Activity size={20} className="mr-3 shrink-0" /> : tab === 'add' ? <PlusCircle size={20} className="mr-3 shrink-0" /> : <List size={20} className="mr-3 shrink-0" />}
                <span className="text-sm capitalize">{tab === 'add' ? 'New Entry' : tab}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-8 relative w-full">
          {activeTab === 'dashboard' && <FeedbackDashboard entries={entries} currency={currency} exchangeRates={exchangeRates} onOpenTicketsClick={() => { setHistoryFilter('open'); setActiveTab('history'); }} onStatClick={(filter) => { setHistoryFilter(filter); setActiveTab('history'); }} onArchiveMonth={archiveResolvedTickets} />}
          {activeTab === 'add' && <FeedbackAddForm onSave={addEntry} currency={currency} exchangeRates={exchangeRates} />}
          {activeTab === 'history' && <FeedbackHistory entries={entries} onResolve={resolveEntry} onAddComment={addComment} onMarkEmailSent={markEmailSent} currency={currency} exchangeRates={exchangeRates} filter={historyFilter} setFilter={setHistoryFilter} ticker={timeTicker} />}
        </main>
      </div>

      <nav className="md:hidden bg-white border-t border-gray-200 absolute bottom-0 w-full flex justify-around p-2 z-30 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {['dashboard', 'add', 'history'].map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); if(tab==='history') setHistoryFilter('all'); }} className={`flex flex-col items-center p-2 rounded-lg w-1/3 transition-colors ${activeTab === tab ? 'text-[#f18a00] bg-[#f18a00]/10' : 'text-gray-500 hover:text-[#003040]'}`}>
            {tab === 'dashboard' ? <Activity size={24} /> : tab === 'add' ? <PlusCircle size={24} /> : <List size={24} />}
            <span className="text-xs mt-1 font-semibold capitalize">{tab === 'add' ? 'New' : tab}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function FeedbackDashboard({ entries, currency, exchangeRates, onOpenTicketsClick, onStatClick, onArchiveMonth }) {
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

  const exportCSV = () => {
    const headers = ['Type', 'Date', 'Guest/Location', 'Department', 'Severity', 'Reason', 'Action', 'Base Cost (USD)', 'Status', 'Handled By', 'Sentiment'];
    const rows = filtered.map(e => `"${e.type}","${new Date(e.date).toLocaleDateString()}","${e.guestName}","${e.department}","${e.severity || 'quick'}","${(e.reason||'').replace(/"/g, '""')}","${(e.actionTaken||'').replace(/"/g, '""')}","${e.cost || 0}","${e.status || 'resolved'}","${e.handledBy || ''}","${e.sentiment?.label||'N/A'}"`);
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
    let detailsText = "";
    todaysEntries.forEach((e, i) => {
      const statusText = (e.type === 'complaint' || e.type === 'incident') ? ` | Status: ${e.status.toUpperCase()}` : '';
      detailsText += `${i + 1}. [${e.type.toUpperCase()}] ${e.department} - ${e.guestName}\n   Issue/Reason: ${e.reason}${statusText}\n\n`;
    });
    const subject = `Daily Hotel Feedback Report - ${new Date().toLocaleDateString()}`;
    const body = `HOTEL FEEDBACK EOD REPORT\nDate: ${new Date().toLocaleDateString()}\n\n--- DETAILED LOGS ---\n${detailsText || "No feedback logged today."}\n\nGenerated by Onomo Feedback Tracker`;
    window.location.href = `mailto:${HOD_EMAIL_LIST}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest hidden md:block">Filter:</span>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg focus:ring-[#003040] block p-2 pr-10 w-full md:w-auto">
            <option value="1">Today</option><option value="7">Last 7 Days</option><option value="month">This Month</option><option value="all">All Time</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button onClick={onArchiveMonth} className="flex-1 md:flex-none flex items-center justify-center text-xs md:text-sm bg-gray-200 text-gray-700 px-3 py-2.5 rounded-lg font-semibold hover:bg-gray-300 shadow-sm"><Archive size={16} className="mr-1.5" /> Archive Month</button>
          <button onClick={generateEODReport} className="flex-1 md:flex-none flex items-center justify-center text-xs md:text-sm bg-[#cf6231] text-white px-3 py-2.5 rounded-lg font-semibold hover:bg-[#cf6231]/90 shadow-sm"><Mail size={16} className="mr-1.5" /> EOD Report</button>
          <button onClick={exportCSV} className="flex-1 md:flex-none flex items-center justify-center text-xs md:text-sm bg-[#003040] text-white px-3 py-2.5 rounded-lg font-semibold hover:bg-[#003040]/90 shadow-sm"><Download size={16} className="mr-1.5" /> CSV</button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 md:gap-6">
        <div onClick={()=>onStatClick('compliment')} className="bg-[#595733]/10 border-[#595733]/20 text-[#595733] p-4 md:p-6 rounded-2xl border shadow-sm flex flex-col items-center justify-center min-h-[100px] cursor-pointer hover:bg-[#595733]/20"><span className="text-3xl md:text-4xl font-bold mb-2">{stats.comps}</span><span className="text-xs md:text-sm font-semibold uppercase tracking-widest">Praises</span></div>
        <div onClick={()=>onStatClick('complaint')} className="bg-[#8e2a2a]/10 border-[#8e2a2a]/20 text-[#8e2a2a] p-4 md:p-6 rounded-2xl border shadow-sm flex flex-col items-center justify-center min-h-[100px] cursor-pointer hover:bg-[#8e2a2a]/20"><span className="text-3xl md:text-4xl font-bold mb-2">{stats.complaints}</span><span className="text-xs md:text-sm font-semibold uppercase tracking-widest">Complaints</span></div>
        <div onClick={()=>onStatClick('incident')} className="bg-[#a0c8d2]/30 border-[#a0c8d2]/40 text-[#003040] p-4 md:p-6 rounded-2xl border shadow-sm flex flex-col items-center justify-center min-h-[100px] cursor-pointer hover:bg-[#a0c8d2]/50"><span className="text-3xl md:text-4xl font-bold mb-2">{stats.incidents}</span><span className="text-xs md:text-sm font-semibold uppercase tracking-widest">Incidents</span></div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        <div onClick={onOpenTicketsClick} className="bg-white border-red-200 text-[#8e2a2a] p-4 md:p-6 rounded-2xl border shadow-sm cursor-pointer hover:shadow-md flex flex-col justify-between"><div className="flex items-center space-x-2 mb-2"><AlertCircle size={18}/><span className="text-xs md:text-sm font-bold opacity-70 uppercase tracking-widest">Tickets Open</span></div><span className="text-2xl md:text-3xl font-bold text-[#003040]">{stats.open}</span></div>
        <div className="bg-white border-gray-200 text-[#003040] p-4 md:p-6 rounded-2xl border shadow-sm flex flex-col justify-between"><div className="flex items-center space-x-2 mb-2"><Coins size={18} className="text-[#a0c8d2]"/><span className="text-xs md:text-sm font-bold opacity-70 uppercase tracking-widest">Resolution Cost</span></div><span className="text-2xl md:text-3xl font-bold">{currency}{stats.cost.toFixed(2)}</span></div>
      </div>
    </div>
  );
}

function FeedbackAddForm({ onSave, currency, exchangeRates }) {
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
      ...form, type, date: new Date().toISOString(), sentiment: analyzeSentiment(form.reason), 
      cost: normalizedCostInUSD, severity: inferredSeverity, isArchived: false, comments: [] 
    };

    let whatsappCallback = null;
    if ((type === 'complaint' || type === 'incident') && (form.department === 'Maintenance' || form.department === 'Housekeeping' || inferredSeverity === 'critical')) {
      const msg = `${inferredSeverity === 'critical' ? '🚨 *CRITICAL GM INTERVENTION REQUIRED* 🚨' : '🚨 *NEW TICKET ALERT* 🚨'}\n\n*Type:* ${type.toUpperCase()}\n*SOP Status:* ${SOP_FRAMEWORK[inferredSeverity].label}\n*Dept:* ${form.department}\n*Guest/Location:* ${form.guestName}\n*Details:* ${form.reason}\n*Logged By:* ${form.handledBy}`;
      whatsappCallback = () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, 'whatsapp_shared_tab');
    }
    onSave(finalizedEntry, whatsappCallback);
    setForm({ guestName: '', guestEmail: '', guestPhone: '', department: DEPARTMENTS[0], reason: '', handledBy: '', actionTaken: activeActionOptions[0], cost: '', status: 'resolved', followUpEmail: '', followUpPhone: '', guestEmailSent: false, managerEmailSent: false, escalationSent: false, staffMentioned: '' });
  };

  return (
    <form onSubmit={submit} className="p-4 md:p-8 space-y-4 md:space-y-6 font-sans max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm">
        <button type="button" onClick={() => setType('compliment')} className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg transition-all ${type === 'compliment' ? 'bg-[#595733]/10 shadow-sm text-[#595733]' : 'text-gray-500 hover:bg-gray-50'}`}>Compliment</button>
        <button type="button" onClick={() => setType('complaint')} className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg transition-all ${type === 'complaint' ? 'bg-[#8e2a2a]/10 shadow-sm text-[#8e2a2a]' : 'text-gray-500 hover:bg-gray-50'}`}>Complaint</button>
        <button type="button" onClick={() => setType('incident')} className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-bold rounded-lg transition-all ${type === 'incident' ? 'bg-[#003040]/10 shadow-sm text-[#003040]' : 'text-gray-500 hover:bg-gray-50'}`}>Incident Log</button>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-bold text-xl text-[#003040] border-b border-gray-100 pb-3 flex items-center"><Users className="mr-2 text-[#a0c8d2]" size={20} /> {type === 'incident' ? 'Incident Location/Guest' : 'Guest Details'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{type === 'incident' ? 'Guest Name or Area' : 'Guest Name / Room No.'}</label>
            <input required value={form.guestName} onChange={e=>setForm({...form, guestName: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 md:p-4 text-sm outline-none focus:ring-2 focus:ring-[#003040]" placeholder="Room 412" />
          </div>
        </div>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-bold text-xl text-[#003040] border-b border-gray-100 pb-3 flex items-center"><FileText className="mr-2 text-[#a0c8d2]" size={20} /> Event Documentation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department Mentioned</label>
            <div className="relative">
              <select value={form.department} onChange={e=>setForm({...form, department: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 md:p-4 pr-10 text-sm outline-none bg-white focus:ring-2 focus:ring-[#003040] cursor-pointer appearance-none">
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Specific Issue / Details</label>
            <textarea required value={form.reason} onChange={e=>setForm({...form, reason: e.target.value})} rows="2" className="w-full border border-gray-300 rounded-xl p-3 md:p-4 text-sm outline-none focus:ring-2 focus:ring-[#003040] resize-none" placeholder="Provide details..." />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#a0c8d2]/10 p-4 rounded-xl border border-[#a0c8d2]/30 flex flex-col space-y-2">
              <div className="flex items-center space-x-2 pb-2 border-b border-black/5"><Lightbulb className="text-[#003040]" size={18} /><span className="font-bold text-sm text-[#003040]">AI Guidance</span></div>
              <p className="text-xs md:text-sm text-[#003040]/80 leading-relaxed font-medium">{type === 'complaint' ? SUGGESTED_RESOLUTIONS[form.department] : type === 'incident' ? SUGGESTED_INCIDENT_ACTIONS[form.department] : SUGGESTED_COMPLIMENT_ACTIONS[form.department]}</p>
            </div>
            {(type === 'complaint' || type === 'incident') && form.reason.trim().length > 2 && (
              <div className={`p-4 rounded-xl border flex flex-col space-y-2 transition-all duration-300 ${SOP_FRAMEWORK[inferredSeverity].color}`}>
                <div className="flex items-center space-x-2 border-b pb-2 border-black/5">{SOP_FRAMEWORK[inferredSeverity].icon}<span className="font-bold text-sm uppercase tracking-wide">SOP: {SOP_FRAMEWORK[inferredSeverity].label}</span></div>
                <p className="text-xs md:text-sm font-bold opacity-90">{SOP_FRAMEWORK[inferredSeverity].authority}</p>
                <p className="text-xs md:text-sm italic opacity-80 mt-1">"{SOP_FRAMEWORK[inferredSeverity].steps}"</p>
              </div>
            )}
        </div>

        {type === 'compliment' && (
           <div>
             <label className="block text-sm font-semibold text-gray-700 mb-1.5">Staff Member Mentioned</label>
             <input value={form.staffMentioned} onChange={e=>setForm({...form, staffMentioned: e.target.value})} className="w-full border border-[#cf6231]/30 bg-[#cf6231]/5 rounded-xl p-3 md:p-4 text-sm outline-none focus:ring-2 focus:ring-[#cf6231] text-[#cf6231] font-bold" placeholder="Who did the guest praise?" />
           </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Action Taken</label>
          <div className="relative">
            <select value={form.actionTaken} onChange={e=>setForm({...form, actionTaken: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 md:p-4 pr-10 text-sm outline-none bg-white focus:ring-2 focus:ring-[#003040] cursor-pointer appearance-none">
              {activeActionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          </div>
        </div>
      </div>

      {(type === 'complaint' || type === 'incident') && (
        <div className="bg-white p-5 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-xl text-[#003040] border-b border-gray-100 pb-3 flex items-center"><Activity className="mr-2 text-[#a0c8d2]" size={20} /> Escalation & Costs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
              <select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 md:p-4 text-sm outline-none focus:ring-2 focus:ring-[#003040] bg-white font-bold text-[#8e2a2a]">
                <option value="open">Requires Further Action (Open)</option><option value="resolved" className="text-green-700">Resolved & Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cost</label>
              <input type="number" step="any" value={form.cost} onChange={e=>setForm({...form, cost: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 md:p-4 text-sm font-bold text-[#8e2a2a] outline-none focus:ring-2 focus:ring-[#003040]" placeholder="0.00" />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
         <div className="w-full md:w-1/3 bg-[#a0c8d2]/10 p-3 md:p-4 rounded-xl border border-[#a0c8d2]/30 shadow-sm">
            <label className="block text-xs font-bold text-[#003040] mb-1.5 uppercase tracking-wider">Logged By Profile</label>
            <input required value={form.handledBy} onChange={e=>setForm({...form, handledBy: e.target.value})} className="w-full border border-[#a0c8d2] rounded-lg p-2.5 text-sm font-bold text-[#003040] outline-none focus:ring-2 focus:ring-[#003040] bg-white text-center" placeholder="Your Name" />
         </div>
         <button type="submit" className="w-full md:w-2/3 bg-[#003040] text-white font-bold py-4 md:py-6 rounded-xl text-lg hover:bg-[#003040]/90 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center">
            <Database size={24} className="mr-3 text-[#a0c8d2]" /> Push to Cloud Securely
         </button>
      </div>
    </form>
  );
}

function FeedbackHistory({ entries, onResolve, onAddComment, onMarkEmailSent, currency, exchangeRates, filter, setFilter, ticker }) {
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
    const minsElapsed = (Date.now() - new Date(entry.date).getTime()) / 60000;
    return { isBreached: minsElapsed >= 15, hours: Math.floor(minsElapsed / 60), minutes: Math.floor(minsElapsed % 60) };
  };

  const handleSendEmail = (entry, emailType) => {
    let to = "", sub = "", body = "";
    if (emailType === 'manager') {
      to = entry.followUpEmail || "";
      sub = entry.severity === 'critical' ? `🚨 [CRITICAL]: ${entry.department}` : `[HOD NOTICE]: ${entry.department}`;
      body = `SOP LEVEL: ${SOP_FRAMEWORK[entry.severity || 'quick'].label}\nTYPE: ${entry.type.toUpperCase()}\nGUEST/ROOM: ${entry.guestName}\nREASON: ${entry.reason}\nLOGGED BY: ${entry.handledBy}`;
    } else {
      to = entry.guestEmail || "";
      const lowerReason = entry.reason ? entry.reason.charAt(0).toLowerCase() + entry.reason.slice(1) : "this matter";
      const lowerAction = entry.actionTaken ? entry.actionTaken.charAt(0).toLowerCase() + entry.actionTaken.slice(1) : "addressed the situation";
      if (entry.type === 'compliment') {
        sub = `Thank you for experiencing ONOMO Hospitality!`;
        body = `Dear ${entry.guestName},\n\nThank you for sharing your feedback regarding our ${entry.department}. It brings us immense joy to hear that ${lowerReason}.\n\nWarmest regards,\nONOMO Hotel Sandton`;
      } else {
        sub = `Following up on your experience at ONOMO Sandton`;
        body = `Dear ${entry.guestName},\n\nI am writing to you personally regarding your experience with our ${entry.department}. Please accept our sincere apologies that ${lowerReason}.\n\nTo ensure your comfort, we have immediately ${lowerAction}. Please let us know if you need any further assistance.\n\nWarm regards,\nONOMO Hotel Sandton`;
      }
    }
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    onMarkEmailSent(entry.id, emailType);
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

      {filtered.length === 0 ? (
         <div className="p-12 md:p-24 bg-white rounded-2xl border border-gray-200 text-center text-gray-400 flex flex-col items-center h-full justify-center shadow-sm">
            <List size={64} className="mb-4 text-gray-200" /><p className="text-lg font-medium">No records found.</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filtered.map(entry => {
            const localDisplayCost = (Number(entry.cost) || 0) * displayConversionFactor;
            const sla = getSLADetails(entry);
            const activeSeverity = entry.severity || 'quick';
            const leftBorderColor = sla.isBreached ? '#8e2a2a' : (entry.type === 'incident' ? '#003040' : entry.type === 'compliment' ? '#595733' : activeSeverity === 'critical' ? '#8e2a2a' : activeSeverity === 'intermediate' ? '#cf6231' : '#595733');

            return (
              <div key={entry.id} className={`bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-l-8 transition-all duration-300 flex flex-col h-full ${sla.isBreached ? 'border-[#8e2a2a] bg-[#8e2a2a]/5 hover:shadow-md' : 'border-gray-200 hover:shadow-md'} ${entry.isArchived ? 'opacity-80 grayscale-[30%]' : ''}`} style={{ borderLeftColor: leftBorderColor }}>
                <div>
                  {sla.isBreached && !entry.isArchived && (
                    <div className="mb-4 -mx-5 md:-mx-6 -mt-5 md:-mt-6 bg-[#8e2a2a] text-white font-bold uppercase text-[10px] md:text-xs tracking-wider p-2.5 flex items-center justify-center space-x-2 animate-pulse rounded-t-xl shadow-sm"><Clock size={14} /><span>⚠️ SLA BREACHED: Overdue {sla.hours}h {sla.minutes}m</span></div>
                  )}
                  <h3 className="font-bold text-gray-900 text-lg md:text-xl break-words mt-2">{entry.guestName}</h3>
                  <p className="text-sm md:text-base font-semibold text-gray-600 mt-1 whitespace-pre-wrap break-words">{entry.reason}</p>
                  
                  <div className="grid grid-cols-2 gap-y-3 mt-4 text-xs md:text-sm text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div><span className="block text-[9px] uppercase tracking-widest font-bold mb-0.5">Dept</span><span className="font-bold text-gray-800 break-words">{entry.department}</span></div>
                    <div><span className="block text-[9px] uppercase tracking-widest font-bold mb-0.5">Logged By</span><span className="font-bold text-gray-800 break-words">{entry.handledBy}</span></div>
                  </div>
                  <div className="mt-4"><span className="text-gray-400 font-bold uppercase tracking-widest block text-[9px] mb-1.5">Action Taken</span><p className="text-gray-700 text-sm leading-relaxed italic break-words whitespace-pre-wrap">"{entry.actionTaken}"</p></div>
                </div>

                <div className="mt-auto pt-5 border-t border-gray-100 space-y-4">
                  {entry.status === 'open' && !entry.isArchived && (
                    <button onClick={() => onResolve(entry.id)} className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl text-sm font-bold shadow-md mt-2 transition-all active:scale-[0.98]">Close Ticket</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
