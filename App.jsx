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
  Image as ImageIcon
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';

// --- FIREBASE SETUP ---
// IMPORTANT: Paste your actual Firebase config keys inside this object
// when running this app on your local computer or Vercel!
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const DEPARTMENTS = [
  'Front Desk',
  'Housekeeping',
  'Food & Beverage',
  'Maintenance',
  'Concierge',
  'Spa & Wellness',
  'Valet/Parking'
];

const DEPT_COLORS = {
  'Front Desk': '#3b82f6', 
  'Housekeeping': '#10b981', 
  'Food & Beverage': '#f59e0b', 
  'Maintenance': '#ef4444', 
  'Concierge': '#8b5cf6', 
  'Spa & Wellness': '#ec4899', 
  'Valet/Parking': '#6b7280' 
};

const SUGGESTED_RESOLUTIONS = {
  'Front Desk': 'Listen actively, apologize, and offer a complimentary room upgrade or late checkout.',
  'Housekeeping': 'Dispatch housekeeping immediately, apologize, and offer a complimentary amenity (e.g. fruit basket).',
  'Food & Beverage': 'Replace the item immediately, and consider comping the meal or offering a free dessert.',
  'Maintenance': 'Send maintenance within 15 mins. Offer a room move if the issue cannot be resolved quickly.',
  'Concierge': 'Apologize for the inconvenience, provide an alternative recommendation, and offer a small courtesy gift.',
  'Spa & Wellness': 'Reschedule the service if needed, apologize, and offer a discount on their next treatment.',
  'Valet/Parking': 'Retrieve the vehicle promptly, apologize, and waive the parking fee for the day.'
};

const SUGGESTED_COMPLIMENT_ACTIONS = {
  'Front Desk': 'Thank the guest, share the feedback with the team at the next briefing, and note it on the guest profile.',
  'Housekeeping': 'Pass the praise to the specific housekeeper, recognize them on the staff board, and thank the guest.',
  'Food & Beverage': 'Share the compliment with the chef and servers, and invite the guest back for another meal.',
  'Maintenance': 'Commend the technician for their promptness/quality and record it in their performance file.',
  'Concierge': 'Recognize the concierge for their excellent recommendations and share the success story with the team.',
  'Spa & Wellness': 'Praise the therapist, encourage the guest to leave a public review, and note their preferences.',
  'Valet/Parking': 'Thank the valet team for their efficiency and pass the guest\'s appreciation to the specific driver.'
};

// --- AI Sentiment Simulator ---
const analyzeSentiment = (text) => {
  const lower = text.toLowerCase();
  if (/(furious|unacceptable|terrible|worst|disgusting|outrageous)/.test(lower)) return { label: 'Furious', emoji: '😡', color: 'text-red-700 bg-red-100' };
  if (/(slow|dirty|broken|rude|bad|poor|annoyed)/.test(lower)) return { label: 'Irritated', emoji: '😠', color: 'text-orange-700 bg-orange-100' };
  if (/(great|excellent|amazing|love|perfect|wonderful)/.test(lower)) return { label: 'Delighted', emoji: '🤩', color: 'text-green-700 bg-green-100' };
  if (/(good|nice|friendly|clean|helpful)/.test(lower)) return { label: 'Happy', emoji: '😊', color: 'text-teal-700 bg-teal-100' };
  return { label: 'Neutral', emoji: '😐', color: 'text-gray-700 bg-gray-100' };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [entries, setEntries] = useState([]);
  const [currency, setCurrency] = useState('$');
  const [toast, setToast] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  // Firebase Authentication setup
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('Authentication Error:', error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Live Data from Firebase
  useEffect(() => {
    if (!user) return; 

    // Guarding paths according to rules
    const entriesRef = collection(db, 'artifacts', appId, 'public', 'data', 'feedback_entries');
    
    const unsubscribe = onSnapshot(entriesRef, 
      (snapshot) => {
        const loadedEntries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sorting happens locally
        loadedEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
        setEntries(loadedEntries);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const addEntry = async (newEntry) => {
    if (!user) return;
    try {
      const entriesRef = collection(db, 'artifacts', appId, 'public', 'data', 'feedback_entries');
      await addDoc(entriesRef, newEntry);
      setActiveTab('history'); 
      showToast('Entry saved securely to cloud!');
    } catch (error) {
      console.error('Error adding entry:', error);
      showToast('Error saving entry.');
    }
  };

  const resolveEntry = async (id) => {
    if (!user) return;
    try {
      const entryRef = doc(db, 'artifacts', appId, 'public', 'data', 'feedback_entries', id);
      await updateDoc(entryRef, { status: 'resolved', resolvedAt: new Date().toISOString() });
      showToast('Ticket marked as resolved.');
    } catch (error) {
      console.error('Error resolving entry:', error);
    }
  };

  const addComment = async (id, commentText, authorName) => {
    if (!user) return;
    try {
      const entryRef = doc(db, 'artifacts', appId, 'public', 'data', 'feedback_entries', id);
      await updateDoc(entryRef, {
        comments: arrayUnion({
          text: commentText,
          author: authorName || 'Staff Member',
          time: new Date().toISOString()
        })
      });
      showToast('Comment added.');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center font-sans max-w-md mx-auto shadow-2xl">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
        <p className="text-gray-500 font-medium animate-pulse">Syncing with secure cloud...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {toast && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-[90%] bg-gray-800 text-white px-4 py-3 rounded-xl shadow-2xl z-50 text-sm text-center font-medium animate-in fade-in slide-in-from-top-4 flex items-center justify-center space-x-2">
          <CheckCircle size={18} className="text-green-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-indigo-900 text-white p-4 shadow-md z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-wide">Feedback Tracker</h1>
          <div className="flex items-center space-x-2">
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-indigo-800 text-white border border-indigo-700 rounded p-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="$">USD ($)</option>
              <option value="€">EUR (€)</option>
              <option value="£">GBP (£)</option>
              <option value="R">ZAR (R)</option>
              <option value="A$">AUD (A$)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'dashboard' && (
          <Dashboard 
            entries={entries} 
            currency={currency} 
            onOpenTicketsClick={() => {
              setHistoryFilter('open');
              setActiveTab('history');
            }} 
          />
        )}
        {activeTab === 'add' && <AddEntryForm onSave={addEntry} currency={currency} />}
        {activeTab === 'history' && (
          <History 
            entries={entries} 
            onResolve={resolveEntry} 
            onAddComment={addComment}
            currency={currency} 
            filter={historyFilter} 
            setFilter={setHistoryFilter}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 absolute bottom-0 w-full flex justify-around p-2 z-10 pb-safe">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center p-2 rounded-lg w-1/3 transition-colors ${activeTab === 'dashboard' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-500'}`}
        >
          <Home size={24} />
          <span className="text-xs mt-1 font-medium">Dashboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('add')}
          className={`flex flex-col items-center p-2 rounded-lg w-1/3 transition-colors ${activeTab === 'add' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-500'}`}
        >
          <PlusCircle size={24} />
          <span className="text-xs mt-1 font-medium">New Entry</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('history');
            setHistoryFilter('all');
          }}
          className={`flex flex-col items-center p-2 rounded-lg w-1/3 transition-colors ${activeTab === 'history' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-500'}`}
        >
          <List size={24} />
          <span className="text-xs mt-1 font-medium">History</span>
        </button>
      </nav>
    </div>
  );
}

// --- DASHBOARD COMPONENT ---
function Dashboard({ entries, currency, onOpenTicketsClick }) {
  const [dateRange, setDateRange] = useState('30'); // '1', '7', '30', 'all'

  // Filter entries based on selected date range
  const filteredEntries = useMemo(() => {
    if (dateRange === 'all') return entries;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
    return entries.filter(e => new Date(e.date) >= cutoff);
  }, [entries, dateRange]);

  const stats = useMemo(() => {
    let compliments = 0;
    let complaints = 0;
    let totalCost = 0;
    let openTicketsCount = 0;
    const deptCount = {};
    const staffComplimentCount = {};

    filteredEntries.forEach(entry => {
      if (entry.type === 'compliment') {
        compliments++;
        if (entry.staffMentioned) {
          staffComplimentCount[entry.staffMentioned] = (staffComplimentCount[entry.staffMentioned] || 0) + 1;
        }
      }
      if (entry.type === 'complaint') {
        complaints++;
        totalCost += Number(entry.cost) || 0;
      }
      if (entry.status === 'open') openTicketsCount++;
      deptCount[entry.department] = (deptCount[entry.department] || 0) + 1;
    });

    const topDept = Object.keys(deptCount).length > 0 ? Object.keys(deptCount).reduce((a, b) => deptCount[a] > deptCount[b] ? a : b) : 'N/A';
    const topStaff = Object.keys(staffComplimentCount).length > 0 ? Object.keys(staffComplimentCount).reduce((a, b) => staffComplimentCount[a] > staffComplimentCount[b] ? a : b) : 'N/A';
    return { compliments, complaints, totalCost, topDept, topStaff, openTicketsCount };
  }, [filteredEntries]);

  // Department Quickview Breakdown
  const deptBreakdown = useMemo(() => {
    const breakdown = {};
    DEPARTMENTS.forEach(d => breakdown[d] = { complaints: 0, compliments: 0 });
    
    filteredEntries.forEach(e => {
      if (breakdown[e.department]) {
        if (e.type === 'complaint') breakdown[e.department].complaints++;
        if (e.type === 'compliment') breakdown[e.department].compliments++;
      }
    });
    
    return Object.entries(breakdown)
      .map(([dept, counts]) => ({ dept, ...counts }))
      .sort((a, b) => (b.complaints + b.compliments) - (a.complaints + a.compliments));
  }, [filteredEntries]);

  // CSV Export Functionality
  const exportCSV = () => {
    const headers = ['Type', 'Date', 'Guest Name', 'Guest Email', 'Guest Phone', 'Department', 'Reason', 'Action', 'Cost', 'Status', 'Handled By', 'Sentiment'];
    const rows = filteredEntries.map(e => {
      const sentimentStr = e.sentiment ? e.sentiment.label : 'N/A';
      return `"${e.type}","${new Date(e.date).toLocaleDateString()}","${e.guestName}","${e.guestEmail || ''}","${e.guestPhone || ''}","${e.department}","${e.reason || ''}","${e.actionTaken}","${e.cost || 0}","${e.status || 'N/A'}","${e.handledBy || ''}","${sentimentStr}"`;
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hotel_feedback_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trend Chart Data (Last 7 Days)
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

    entries.forEach(e => {
      const eDate = new Date(e.date).toDateString();
      const dayMatch = days.find(d => d.date === eDate);
      if (dayMatch) {
        if (e.type === 'complaint') dayMatch.complaints++;
        if (e.type === 'compliment') dayMatch.compliments++;
      }
    });

    const maxVal = Math.max(...days.map(d => Math.max(d.complaints, d.compliments, 1)));
    return { days, maxVal };
  }, [entries]);

  return (
    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-2">
        <select 
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-medium shadow-sm"
        >
          <option value="1">Today</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
        
        <button 
          onClick={exportCSV}
          className="flex items-center text-xs bg-green-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
        >
          <Download size={14} className="mr-1.5" />
          Export CSV
        </button>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-2xl p-4 shadow-sm border border-green-100 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-green-700">{stats.compliments}</span>
          <span className="text-sm font-medium text-green-600 text-center">Compliments</span>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 shadow-sm border border-red-100 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-red-700">{stats.complaints}</span>
          <span className="text-sm font-medium text-red-600 text-center">Complaints</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <MetricCard 
          icon={<AlertCircle className="text-red-500" />}
          title="Open Tickets"
          value={stats.openTicketsCount}
          color="bg-red-50 border-red-100"
          onClick={onOpenTicketsClick}
        />
        <MetricCard 
          icon={<DollarSign className="text-amber-500" />}
          title="Total Cost"
          value={`${currency}${stats.totalCost.toFixed(2)}`}
          color="bg-white"
        />
        <MetricCard 
          icon={<Award className="text-purple-500" />}
          title="Top Staff Member"
          value={stats.topStaff}
          color="bg-purple-50 border-purple-100"
        />
        <MetricCard 
          icon={<Building2 className="text-blue-500" />}
          title="Top Dept"
          value={stats.topDept}
          color="bg-blue-50 border-blue-100"
        />
      </div>

      {/* Department Quickview */}
      <h2 className="text-lg font-semibold text-gray-700 mt-6 mb-2">Department Overview</h2>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        {deptBreakdown.some(d => d.complaints > 0 || d.compliments > 0) ? (
          deptBreakdown.filter(d => d.complaints > 0 || d.compliments > 0).map(item => (
            <div key={item.dept} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
              <span className="text-gray-700 font-medium truncate flex-1 pr-2">{item.dept}</span>
              <div className="flex space-x-3 shrink-0">
                <span className="flex items-center text-green-600 font-bold w-8 justify-end"><ThumbsUp size={12} className="mr-1" />{item.compliments}</span>
                <span className="flex items-center text-red-600 font-bold w-8 justify-end"><ThumbsDown size={12} className="mr-1" />{item.complaints}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center">No feedback recorded in this period.</p>
        )}
      </div>

      {/* 7-Day Trend Chart */}
      <h2 className="text-lg font-semibold text-gray-700 mt-6 mb-2 flex items-center">
        <Activity size={18} className="mr-2 text-indigo-500" /> 7-Day Trend
      </h2>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-48 flex items-end justify-between space-x-1 pb-6 pt-8 relative">
        {trendData.days.map((day, i) => (
          <div key={i} className="flex flex-col items-center flex-1 group">
            <div className="flex w-full justify-center items-end space-x-0.5 h-24">
              {/* Compliment Bar */}
              <div 
                className="w-1/2 bg-green-400 rounded-t-sm transition-all" 
                style={{ height: `${(day.compliments / trendData.maxVal) * 100}%` }}
              ></div>
              {/* Complaint Bar */}
              <div 
                className="w-1/2 bg-red-400 rounded-t-sm transition-all" 
                style={{ height: `${(day.complaints / trendData.maxVal) * 100}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-gray-400 mt-2 rotate-45 transform origin-left">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value, color, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`${color} p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between ${onClick ? 'cursor-pointer hover:shadow-md transition-all active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <span className="font-medium text-gray-600 text-xs">{title}</span>
      </div>
      <span className="font-bold text-gray-800 text-xl">{value}</span>
    </div>
  );
}

// --- ADD ENTRY FORM COMPONENT ---
function AddEntryForm({ onSave, currency }) {
  const [type, setType] = useState('complaint');
  const [fileName, setFileName] = useState('');
  
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    department: DEPARTMENTS[0],
    reason: '',
    handledBy: '', 
    actionTaken: '',
    cost: '',
    status: 'resolved',
    followUpEmail: '',
    staffMentioned: ''
  });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Trigger AI Sentiment Analysis
    const sentiment = analyzeSentiment(formData.reason + " " + formData.actionTaken);

    onSave({
      ...formData,
      type,
      date: new Date().toISOString(),
      cost: type === 'complaint' ? Number(formData.cost) : 0,
      status: type === 'complaint' ? formData.status : 'resolved',
      sentiment: sentiment,
      attachedImage: fileName ? fileName : null,
      comments: [] // Initialize empty internal comments array
    });
    
    // Reset form mostly, keeping handledBy to make rapid entry easier
    setFormData(prev => ({
        ...prev,
        guestName: '', guestEmail: '', guestPhone: '',
        reason: '', actionTaken: '', cost: '',
        staffMentioned: ''
    }));
    setFileName('');
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex bg-gray-200 rounded-lg p-1 mb-6">
        <button
          type="button"
          onClick={() => setType('compliment')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'compliment' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}
        >
          Compliment
        </button>
        <button
          type="button"
          onClick={() => setType('complaint')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'complaint' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}
        >
          Complaint
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* --- GUEST DETAILS --- */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2">Guest Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name / Room No.</label>
              <input required type="text" name="guestName" value={formData.guestName} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Room 412 or John Doe" />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Email</label>
                  <input type="email" name="guestEmail" value={formData.guestEmail} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="guest@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Phone</label>
                  <input type="tel" name="guestPhone" value={formData.guestPhone} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+1 234..." />
                </div>
            </div>
        </div>

        {/* --- INCIDENT DETAILS --- */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2">Feedback Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department Mentioned</label>
              <select name="department" value={formData.department} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specific Issue / Reason</label>
              <input required type="text" name="reason" value={formData.reason} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder={type === 'complaint' ? "e.g. Broken AC" : "e.g. Great food"} />
            </div>

            {type === 'complaint' && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start space-x-2">
                <Lightbulb className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="block text-sm font-semibold text-blue-800 mb-0.5">Suggested Resolution:</span>
                  <p className="text-xs text-blue-700 leading-relaxed">{SUGGESTED_RESOLUTIONS[formData.department]}</p>
                </div>
              </div>
            )}

            {type === 'compliment' && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-start space-x-2">
                <Lightbulb className="text-green-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="block text-sm font-semibold text-green-800 mb-0.5">Suggested Action:</span>
                  <p className="text-xs text-green-700 leading-relaxed">{SUGGESTED_COMPLIMENT_ACTIONS[formData.department]}</p>
                </div>
              </div>
            )}

            {type === 'compliment' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member Mentioned (Optional)</label>
                <input 
                  type="text" 
                  name="staffMentioned"
                  value={formData.staffMentioned || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Who did the guest praise?"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
              <textarea required name="actionTaken" value={formData.actionTaken} onChange={handleChange} rows="2" className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Details..."></textarea>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attach Photo (Optional)</label>
              <label className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <Camera className="text-gray-400 mr-2" size={20} />
                <span className="text-sm text-gray-500">{fileName ? fileName : 'Tap to upload photo'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
        </div>

        {/* --- STAFF/HANDLER DETAILS --- */}
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm space-y-4">
            <h3 className="font-bold text-indigo-900 border-b border-indigo-200 pb-2">Logged By</h3>
            <div>
              <label className="block text-sm font-medium text-indigo-800 mb-1">Your Name</label>
              <input required type="text" name="handledBy" value={formData.handledBy} onChange={handleChange} className="w-full border border-indigo-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Jane Doe" />
            </div>
        </div>

        {type === 'complaint' && (
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-800 border-b pb-2">Ticket Resolution</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost ({currency})</label>
                  <input type="number" name="cost" min="0" step="0.01" value={formData.cost} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
                </div>
              </div>

            {formData.status === 'open' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Email for Follow-up</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="email" 
                    name="followUpEmail"
                    value={formData.followUpEmail}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg py-3 pl-10 pr-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-amber-50" 
                    placeholder="manager@hotel.com"
                  />
                </div>
                <p className="text-xs text-amber-600 mt-1">We will track this email for the follow-up task.</p>
              </div>
            )}
          </div>
        )}

        <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl mt-4 hover:bg-indigo-700 transition-colors shadow-lg active:scale-95">
          Submit & Analyze Sentiment
        </button>
      </form>
    </div>
  );
}

// --- HISTORY COMPONENT ---
function History({ entries, onResolve, onAddComment, currency, filter, setFilter }) {
  const [newComment, setNewComment] = useState({});

  const handleSendEmail = (entry) => {
    const subject = encodeURIComponent(`Action Required: Open Hotel Complaint - ${entry.department}`);
    const body = encodeURIComponent(`Hi,\n\nA new complaint has been logged and requires your follow-up.\n\nGuest: ${entry.guestName}\nDepartment: ${entry.department}\nIssue: ${entry.reason}\nAction Taken So Far: ${entry.actionTaken}\nLogged by: ${entry.handledBy}\n\nPlease review and resolve this ticket.\n\nThank you.`);
    
    const mailtoLink = document.createElement('a');
    mailtoLink.href = `mailto:${entry.followUpEmail}?subject=${subject}&body=${body}`;
    mailtoLink.target = '_blank';
    document.body.appendChild(mailtoLink);
    mailtoLink.click();
    document.body.removeChild(mailtoLink);
  };

  const handleSendGuestEmail = (entry) => {
    let subject = '';
    let body = '';

    if (entry.type === 'compliment') {
      subject = encodeURIComponent(`Thank you for your wonderful feedback!`);
      body = encodeURIComponent(`Dear ${entry.guestName},\n\nThank you for your wonderful feedback regarding ${entry.reason}. We are thrilled you enjoyed your experience with our ${entry.department} team.\n\nIf you have a moment, we would highly appreciate it if you could share your positive experience in an online review.\n\nWe look forward to welcoming you back soon!\n\nWarm regards,\nThe Hotel Team`);
    } else {
      subject = encodeURIComponent(`Following up on your recent experience`);
      body = encodeURIComponent(`Dear ${entry.guestName},\n\nThank you for bringing your concerns regarding ${entry.reason} to our attention. We sincerely apologize for the inconvenience you experienced with our ${entry.department} team.\n\nPlease know we take this seriously. We have noted the following action to resolve this: ${entry.actionTaken}.\n\nPlease let us know if we can assist in any way further to improve your stay with us.\n\nWarm regards,\nThe Hotel Team`);
    }

    const mailtoLink = document.createElement('a');
    mailtoLink.href = `mailto:${entry.guestEmail}?subject=${subject}&body=${body}`;
    mailtoLink.target = '_blank';
    document.body.appendChild(mailtoLink);
    mailtoLink.click();
    document.body.removeChild(mailtoLink);
  };

  const filteredEntries = entries.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'open') return e.status === 'open';
    if (filter === 'resolved') return e.status === 'resolved';
    return true;
  });

  const getSLAStatus = (entry) => {
    if (entry.type !== 'complaint' || entry.status !== 'open') return null;
    const hoursOpen = (Date.now() - new Date(entry.date).getTime()) / 3600000;
    
    if (hoursOpen >= 2) {
      return { text: `SLA Breached (${Math.floor(hoursOpen)}h open)`, color: 'bg-red-600 text-white animate-pulse' };
    }
    return { text: `Open (${Math.floor(hoursOpen * 60)}m elapsed)`, color: 'bg-amber-100 text-amber-800' };
  };

  const submitComment = (id) => {
    const commentData = newComment[id];
    if (!commentData || !commentData.text) return;
    onAddComment(id, commentData.text, commentData.author);
    setNewComment({ ...newComment, [id]: { text: '', author: '' } });
  };

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 flex flex-col items-center h-full justify-center">
        <List size={48} className="mb-4 text-gray-300" />
        <p>No feedback recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex bg-gray-200 rounded-lg p-1 mb-4 shadow-inner">
        <button onClick={() => setFilter('all')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'all' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>All</button>
        <button onClick={() => setFilter('open')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'open' ? 'bg-white shadow text-amber-600' : 'text-gray-500'}`}>Open Issues</button>
        <button onClick={() => setFilter('resolved')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${filter === 'resolved' ? 'bg-white shadow text-gray-700' : 'text-gray-500'}`}>Resolved</button>
      </div>

      {filteredEntries.map(entry => {
        const sla = getSLAStatus(entry);
        
        return (
          <div key={entry.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col relative overflow-hidden">
            {entry.type === 'complaint' && (
              <div className={`absolute top-0 left-0 w-full h-1 ${entry.status === 'open' ? 'bg-amber-400' : 'bg-gray-200'}`}></div>
            )}

            <div className="flex justify-between items-start mb-2 mt-1">
              <div className="flex items-center space-x-2">
                {entry.type === 'compliment' ? <ThumbsUp className="text-green-500" size={18} /> : <ThumbsDown className="text-red-500" size={18} />}
                <span className={`text-sm font-bold uppercase tracking-wider ${entry.type === 'compliment' ? 'text-green-700' : 'text-red-700'}`}>{entry.type}</span>
                
                {/* AI Sentiment Badge */}
                {entry.sentiment && (
                  <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${entry.sentiment.color} border-opacity-50`}>
                    {entry.sentiment.emoji} {entry.sentiment.label}
                  </span>
                )}
              </div>
              
              <div className="flex flex-col items-end space-y-1">
                <span className="text-xs text-gray-400 flex items-center">
                  <Calendar size={12} className="mr-1" />
                  {new Date(entry.date).toLocaleDateString()}
                </span>
                
                {/* SLA Timer / Status Badge */}
                {entry.type === 'complaint' && (
                  entry.status === 'open' && sla ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold shadow-sm ${sla.color}`}>
                      <TimerIcon size={10} className="mr-1" /> {sla.text}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      <CheckCircle size={10} className="mr-1" /> Resolved
                    </span>
                  )
                )}
              </div>
            </div>
            
            <h3 className="font-semibold text-gray-800 text-lg">{entry.guestName}</h3>
            
            <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm">
              {entry.guestEmail && (
                <div className="col-span-2">
                  <span className="text-gray-500 block text-xs">Guest Email</span>
                  <span className="font-medium text-blue-600 text-sm flex items-center">
                    <Mail size={12} className="mr-1" /> {entry.guestEmail}
                  </span>
                </div>
              )}
              {entry.guestPhone && (
                <div className="col-span-2">
                  <span className="text-gray-500 block text-xs">Guest Phone</span>
                  <span className="font-medium text-blue-600 text-sm flex items-center">
                    <Phone size={12} className="mr-1" /> {entry.guestPhone}
                  </span>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5 mt-1">Issue / Reason</span>
                <span className="font-medium text-gray-800 text-base leading-snug">{entry.reason || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs mt-2">Department</span>
                <span className="font-medium text-gray-800">{entry.department}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs mt-2">Handled By</span>
                <span className="font-medium text-gray-800">{entry.handledBy}</span>
              </div>
              {entry.type === 'compliment' && entry.staffMentioned && (
                <div className="col-span-2">
                  <span className="text-gray-500 block text-xs">Staff Praised</span>
                  <span className="font-medium text-indigo-600 flex items-center mt-1">
                    <Award size={14} className="mr-1" /> {entry.staffMentioned}
                  </span>
                </div>
              )}
              {entry.type === 'complaint' && (
                <div>
                  <span className="text-gray-500 block text-xs mt-2">Cost</span>
                  <span className="font-medium text-red-600">{currency}{Number(entry.cost).toFixed(2)}</span>
                </div>
              )}
              {entry.status === 'open' && entry.followUpEmail && (
                <div className="col-span-2 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-center">
                  <Mail size={14} className="text-amber-600 mr-2 shrink-0" />
                  <span className="text-xs text-amber-800"><span className="font-semibold">Follow-up assigned to:</span> {entry.followUpEmail}</span>
                </div>
              )}
            </div>

            {entry.attachedImage && (
              <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-100 flex items-center">
                <ImageIcon size={16} className="text-gray-400 mr-2" />
                <span className="text-xs text-gray-600 truncate flex-1">Image Attached: {entry.attachedImage}</span>
              </div>
            )}
            
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-gray-500 block text-xs mb-1">Action Taken</span>
              <p className="text-gray-700 text-sm leading-relaxed">{entry.actionTaken}</p>
            </div>

            {/* Internal Comments System */}
            {entry.status === 'open' && (
              <div className="mt-4 bg-gray-50 rounded-xl p-3 border border-gray-200">
                <h4 className="text-xs font-bold text-gray-600 mb-2 flex items-center">
                  <MessageSquare size={12} className="mr-1" /> Internal Notes
                </h4>
                
                <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                  {(!entry.comments || entry.comments.length === 0) ? (
                    <p className="text-[10px] text-gray-400 italic">No notes added yet.</p>
                  ) : (
                    entry.comments.map((comment, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-gray-100 text-xs">
                        <span className="font-bold text-indigo-700 mr-1">{comment.author}:</span>
                        <span className="text-gray-700">{comment.text}</span>
                        <div className="text-[9px] text-gray-400 mt-1 text-right">
                          {new Date(comment.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex flex-col space-y-2">
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      placeholder="Your Name..."
                      value={newComment[entry.id]?.author || ''}
                      onChange={(e) => setNewComment({...newComment, [entry.id]: { ...newComment[entry.id], author: e.target.value }})}
                      className="w-1/3 border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-500"
                    />
                    <input 
                      type="text" 
                      placeholder="Add an update..."
                      value={newComment[entry.id]?.text || ''}
                      onChange={(e) => setNewComment({...newComment, [entry.id]: { ...newComment[entry.id], text: e.target.value }})}
                      className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-500"
                    />
                    <button onClick={() => submitComment(entry.id)} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700">
                      Post
                    </button>
                  </div>
                </div>
              </div>
            )}

            {entry.guestEmail && (
              <button 
                onClick={() => handleSendGuestEmail(entry)}
                className={`mt-4 w-full font-semibold py-2 rounded-lg border transition-colors text-sm flex items-center justify-center shadow-sm ${
                  entry.type === 'compliment' 
                    ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' 
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                <Send size={16} className="mr-2" /> 
                {entry.type === 'compliment' ? 'Send Guest Review Request' : 'Send Guest Apology / Check-in'}
              </button>
            )}

            {entry.status === 'open' && entry.followUpEmail && (
              <button 
                onClick={() => handleSendEmail(entry)}
                className="mt-2 w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-3 rounded-lg border border-blue-200 transition-colors text-sm flex items-center justify-center shadow-sm"
              >
                <Mail size={16} className="mr-2" /> Send Manager Alert Now
              </button>
            )}

            {entry.status === 'open' && (
              <button 
                onClick={() => onResolve(entry.id)}
                className="mt-2 w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold py-3 rounded-lg border border-amber-200 transition-colors text-sm flex items-center justify-center shadow-sm"
              >
                <CheckCircle size={16} className="mr-2" /> Mark as Finalized & Resolved
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimerIcon(props) {
  return <Clock {...props} />;
}
