import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, limit, serverTimestamp, setDoc, doc,
  enableIndexedDbPersistence, where, arrayUnion, deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  onAuthStateChanged, signOut, deleteUser
} from 'firebase/auth';

// --- 1. Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyCzRZijYlfdmB4ZCqP04H-c67L0pDOoEP4",
  authDomain: "tinntuu-tu.firebaseapp.com",
  projectId: "tinntuu-tu",
  storageBucket: "tinntuu-tu.firebasestorage.app",
  messagingSenderId: "652536103906",
  appId: "1:652536103906:web:e91e18bfcf65b928926fbb",
  measurementId: "G-676PH5Q3Y3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
enableIndexedDbPersistence(db).catch(() => {});

// --- 2. Icon System (Clean Style) ---
const Icon = ({ name, className = "w-5 h-5", strokeWidth = "2" }) => {
  const icons = {
    paw: <path d="M12 11.5c-1.5 0-3 1.5-3 3 0 2.5 2 4.5 3 4.5s3-2 3-4.5c0-1.5-1.5-3-3-3zm-5-3c-1.5 0-2.5-1-2.5-2.5S5.5 3.5 7 3.5 9.5 4.5 9.5 6 8.5 8.5 7 8.5zm10 0c-1.5 0-2.5-1-2.5-2.5S15.5 3.5 17 3.5s2.5 1 2.5 2.5-1 2.5-2.5 2.5zM12 7.5c-1.2 0-2-1-2-2.5S10.8 2.5 12 2.5s2 1 2 2.5-.8 2.5-2 2.5z"/>,
    cat: <><path d="M21 16.52A5 5 0 0 1 18.5 20h-13a5 5 0 0 1-2.5-3.48L2 12V4l4.5 4.5h11L22 4v8l-1 4.52z"/><path d="M9 14h.01M15 14h.01M12 17h.01"/></>,
    chat: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    mic: <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    bug: <><path d="M12 20v-5"/><path d="M11 15h2"/><path d="M7 11l-2-2"/><path d="M17 11l2-2"/><path d="M9 15l-2 2"/><path d="M15 15l2 2"/><path d="M9 7h6a2 2 0 0 1 2 2v2a6 6 0 0 1-12 0V9a2 2 0 0 1 2-2z"/><path d="M15 7L12 3 9 7"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    location: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    hat: <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    send: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    bulb: <><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></>,
    circle: <circle cx="12" cy="12" r="10"/>,
    check_circle: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    food: <><path d="M12 2C7 2 3 6 3 11v1h18v-1c0-5-4-9-9-9zM3 12a9 9 0 0 0 18 0H3z"/><path d="M7 2v9M17 2v9M12 2v9"/></>,
    book_open: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  };
  
  const isFilled = name === 'paw' || name === 'heart';
  return (
    <svg className={className} viewBox="0 0 24 24" fill={isFilled ? "currentColor" : "none"} stroke={isFilled ? "none" : "currentColor"} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

const CAT_MASCOT = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80";

const DEFAULT_PROFILE = {
  name: '', faculty: 'ธรรมศาสตร์', location: 'เชียงราก', bio: 'ทักมาคุยกันได้นะ เมี๊ยว~', 
  img: CAT_MASCOT, tags: 'หาเพื่อน, ทาสแมว', swiped: [], schedule: []
};

const ICEBREAKERS_BY_CATEGORY = {
  food: ["ช่วงนี้มีร้านชาบูเด็ดๆ แถวเชียงรากแนะนำมั้ย?", "ยามเย็นปกติชอบกินข้าวที่ใต้หอหรือไปยูเซนเตอร์?"],
  study: ["ลงวิชา TU100 เซกไหนไปเหรอ?", "มีที่อ่านหนังสือเงียบๆ แนะนำในมหาลัยมั้ย?"],
  cat: ["เป็นทาสแมวสายไหนเหรอ แมวส้ม หรือแมวสามสี?", "ถ้าเลี้ยงแมวได้ 1 ตัว อยากตั้งชื่อว่าอะไร?"]
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [activeTab, setActiveTab] = useState('swipe'); 
  const [allProfiles, setAllProfiles] = useState([]);
  const [localSwiped, setLocalSwiped] = useState([]);
  const [myProfile, setMyProfile] = useState(DEFAULT_PROFILE);
  const [hasProfile, setHasProfile] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '' });
  const [matches, setMatches] = useState([]);
  const [activeChatType, setActiveChatType] = useState('list'); 
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [groupRooms, setGroupRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const [aiSuggestion, setAiSuggestion] = useState('');
  const [catVibe, setCatVibe] = useState('friendly');
  const [toastMsg, setToastMsg] = useState(null);
  const [questDone, setQuestDone] = useState({ practice: false, chat: false });

  const [dragStart, setDragStart] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubProfiles = onSnapshot(query(collection(db, 'users'), limit(100)), snapshot => {
      const profiles = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllProfiles(profiles);
      const myDoc = profiles.find(p => p.uid === user.uid);
      if (myDoc) { setMyProfile(prev => ({ ...prev, ...myDoc })); setHasProfile(true); } 
      else { setMyProfile(DEFAULT_PROFILE); setHasProfile(false); setActiveTab('profile'); }
    });
    const unsubMatches = onSnapshot(query(collection(db, 'matches'), where('participants', 'array-contains', user.uid)), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified" && change.doc.data().lastSender !== user.uid) {
            setToastMsg('มีข้อความใหม่จากเพื่อน!'); setTimeout(() => setToastMsg(null), 3500);
          }
        });
        setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubGroups = onSnapshot(query(collection(db, 'group_chats')), (snapshot) => {
        setGroupRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubProfiles(); unsubMatches(); unsubGroups(); };
  }, [user]);

  useEffect(() => {
    if (!user) { setLocalSwiped([]); setMyProfile(DEFAULT_PROFILE); return; }
    const unsub = onSnapshot(doc(db, 'user_private', user.uid), snapshot => {
      const data = snapshot.exists() ? snapshot.data() : {};
      setLocalSwiped(data.swiped || []);
      setMyProfile(prev => ({ ...prev, swiped: data.swiped || [], schedule: data.schedule || [] }));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !currentChatId || (activeChatType !== 'private' && activeChatType !== 'group_chat')) return;
    const collectionPath = activeChatType === 'private' ? `private_chats/${currentChatId}/messages` : `group_messages/${currentChatId}/messages`;
    const unsub = onSnapshot(query(collection(db, collectionPath), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse());
    });
    return () => unsub();
  }, [user, currentChatId, activeChatType]);

  useEffect(() => {
    if (user && currentChatId && activeChatType === 'private') {
      setDoc(doc(db, 'matches', currentChatId), { [`unread_${user.uid}`]: 0 }, { merge: true }).catch(()=>{});
    }
  }, [currentChatId, activeChatType, user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeChatType]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLoginMode) await signInWithEmailAndPassword(auth, email, password);
      else { await createUserWithEmailAndPassword(auth, email, password); alert('สร้างบัญชีสำเร็จ!'); }
    } catch (err) { alert(err.message); }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMyProfile(prev => ({ ...prev, img: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user || !myProfile.name.trim()) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid, name: myProfile.name.trim(), faculty: myProfile.faculty || '', location: myProfile.location || '',
        bio: myProfile.bio || '', img: myProfile.img || '', tags: myProfile.tags || '', updatedAt: serverTimestamp()
      }, { merge: true });
      await setDoc(doc(db, 'user_private', user.uid), { swiped: myProfile.swiped || [], schedule: myProfile.schedule || [] }, { merge: true });
      setHasProfile(true); setActiveTab('swipe');
    } catch (err) { alert('บันทึกโปรไฟล์ไม่สำเร็จ'); }
  };

  const handleSwipe = async (targetUid, isLike) => {
    if (!user || !targetUid || targetUid === user.uid) return;
    try {
      setLocalSwiped(prev => prev.includes(targetUid) ? prev : [...prev, targetUid]);
      await setDoc(doc(db, 'user_private', user.uid), { swiped: arrayUnion(targetUid) }, { merge: true });
      if (isLike) {
        const matchRef = await addDoc(collection(db, 'matches'), { participants: [user.uid, targetUid], matchedAt: serverTimestamp() });
        setCurrentChatId(matchRef.id); setActiveChatType('private'); setActiveTab('chat');
      }
    } catch (err) { setLocalSwiped(prev => prev.filter(id => id !== targetUid)); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentChatId) return;
    const text = inputText; setInputText('');
    const collectionPath = activeChatType === 'private' ? `private_chats/${currentChatId}/messages` : `group_messages/${currentChatId}/messages`;
    await addDoc(collection(db, collectionPath), { text, senderId: user.uid, senderName: myProfile.name, createdAt: serverTimestamp() });
    setQuestDone(prev => ({ ...prev, chat: true }));
    if (activeChatType === 'private') {
      const currentMatch = matches.find(m => m.id === currentChatId);
      const targetUid = currentMatch ? currentMatch.participants.find(id => id !== user.uid) : null;
      if (targetUid) {
        const currentUnread = currentMatch[`unread_${targetUid}`] || 0;
        await setDoc(doc(db, 'matches', currentChatId), { lastUpdated: serverTimestamp(), lastSender: user.uid, [`unread_${targetUid}`]: currentUnread + 1 }, { merge: true });
      }
    }
  };

  const handleDragStart = (e) => { setDragStart(e.touches ? e.touches[0].clientX : e.clientX); setIsDragging(true); };
  const handleDragMove = (e) => { if (isDragging) setDragDelta((e.touches ? e.touches[0].clientX : e.clientX) - dragStart); };
  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragDelta > 120) handleSwipe(currentProfile?.uid, true);
    else if (dragDelta < -120) handleSwipe(currentProfile?.uid, false);
    setDragDelta(0);
  };

  const othersProfiles = allProfiles.filter(p => p.uid !== user?.uid && !localSwiped.includes(p.uid));
  const currentProfile = othersProfiles[0]; 

  const uniqueMatches = Array.from(new Set(matches.map(m => m.participants.find(uid => uid !== user.uid))));
  const filteredMatches = uniqueMatches.filter(otherUid => {
    const p = allProfiles.find(p => p.uid === otherUid);
    return p && p.name.toLowerCase().includes(chatSearchQuery.toLowerCase().trim());
  });

  if (authLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-pulse text-red-500"><Icon name="cat" className="w-12 h-12" /></div>
    </div>
  );

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl"></div>
        
        <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 relative z-10 border border-white">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-red-500/30 mb-6">
              <Icon name="cat" className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">TINNTUU</h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">เชื่อมต่อกับเพื่อนใหม่ในรั้วมหาวิทยาลัย</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" placeholder="อีเมลมหาวิทยาลัย" required />
            </div>
            <div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" placeholder="รหัสผ่าน" required />
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-red-600/30 transition-all mt-2">
              {isLoginMode ? 'เข้าสู่ระบบ' : 'สร้างบัญชีผู้ใช้'}
            </button>
          </form>
          
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full text-center text-sm text-slate-500 mt-6 hover:text-red-600 font-medium transition-colors">
            {isLoginMode ? 'ยังไม่มีบัญชี? สมัครใช้งาน' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col font-sans pb-24 relative text-slate-800 overflow-x-hidden">
      
      {/* Header (Glassmorphism) */}
      <header className="px-6 py-4 sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400 flex items-center gap-2">
          TINNTUU <Icon name="cat" className="w-6 h-6 text-red-500" />
        </h1>
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <Icon name="search" className="w-4 h-4" />
          </div>
        </div>
      </header>

      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-5 py-3 rounded-full text-sm font-medium shadow-xl z-50 flex items-center gap-2 animate-bounce">
          <Icon name="chat" className="w-4 h-4 text-amber-400" /> {toastMsg}
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-5 pt-6">
        
        {/* --- SWIPE TAB --- */}
        {activeTab === 'swipe' && (
          <div className="flex flex-col h-full">
            {currentProfile ? (
              <div className="relative w-full h-[65vh] rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-300/50 bg-white">
                <div 
                  className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none z-20"
                  style={{
                    transform: `translateX(${dragDelta}px) rotate(${dragDelta * 0.05}deg)`,
                    transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  }}
                  onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
                  onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
                >
                  {/* Photo & Gradient */}
                  <img src={currentProfile.img} className="w-full h-full object-cover pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>

                  {/* Badges */}
                  <div className="absolute top-6 left-6 bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1">
                    <Icon name="location" className="w-3 h-3" /> {currentProfile.location}
                  </div>

                  {/* Profile Info */}
                  <div className="absolute bottom-0 left-0 w-full p-6 text-white pointer-events-none">
                    <h2 className="text-3xl font-bold mb-1">{currentProfile.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-white/80 mb-3">
                      <Icon name="hat" className="w-4 h-4" /> {currentProfile.faculty}
                    </div>
                    <p className="text-sm text-white/90 font-medium mb-4 line-clamp-2">{currentProfile.bio}</p>
                    <div className="flex gap-2">
                      <span className="bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full">{currentProfile.tags}</span>
                    </div>
                  </div>
                </div>

                {/* Floating Action Buttons */}
                <div className="absolute bottom-6 left-0 w-full flex justify-center gap-6 z-30 pointer-events-none">
                  <button onClick={(e) => { e.stopPropagation(); handleSwipe(currentProfile.uid, false); }} className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-xl hover:scale-110 transition-transform pointer-events-auto">
                    <Icon name="x" className="w-6 h-6" strokeWidth="2.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleSwipe(currentProfile.uid, true); }} className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-red-500/30 hover:scale-110 transition-transform pointer-events-auto">
                    <Icon name="heart" className="w-6 h-6" strokeWidth="2.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[65vh] flex flex-col items-center justify-center text-center text-slate-500 bg-white rounded-[2rem] shadow-sm border border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Icon name="search" className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">ค้นหาเพื่อนใหม่หมดแล้ว</h3>
                <p className="text-sm mt-1">กลับมาดูใหม่ภายหลังนะ</p>
              </div>
            )}
          </div>
        )}

        {/* --- CHAT TAB --- */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden h-[calc(100vh-180px)] flex flex-col">
            {activeChatType === 'list' ? (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-lg font-bold text-slate-800 mb-3">ข้อความ</h2>
                  <div className="relative">
                    <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="ค้นหาเพื่อน..." value={chatSearchQuery} onChange={e=>setChatSearchQuery(e.target.value)} className="w-full bg-slate-100 text-sm py-2.5 pl-9 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {filteredMatches.map(otherUid => {
                    const profile = allProfiles.find(p => p.uid === otherUid);
                    if(!profile) return null;
                    const match = matches.find(m => m.participants.includes(otherUid));
                    return (
                      <div key={otherUid} onClick={() => { setCurrentChatId(match.id); setActiveChatType('private'); }} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors">
                        <img src={profile.img} className="w-14 h-14 rounded-full object-cover shadow-sm" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800">{profile.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{profile.faculty}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full relative">
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white z-10">
                  <button onClick={() => setActiveChatType('list')} className="text-slate-400 hover:text-slate-800 transition-colors">
                    <Icon name="x" className="w-5 h-5" />
                  </button>
                  <span className="font-semibold text-slate-800">แชทส่วนตัว</span>
                </div>
                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-slate-50/50">
                  {messages.map(m => (
                    <div key={m.id} className={`max-w-[75%] p-3.5 text-sm rounded-2xl ${m.senderId === user.uid ? 'bg-red-600 text-white self-end rounded-br-sm shadow-md shadow-red-500/20' : 'bg-white text-slate-800 self-start rounded-bl-sm shadow-sm border border-slate-100'}`}>
                      {m.text}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                {/* Input */}
                <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                  <input value={inputText} onChange={e=>setInputText(e.target.value)} placeholder="พิมพ์ข้อความ..." className="flex-1 bg-slate-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                  <button type="submit" disabled={!inputText.trim()} className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 shadow-md shadow-red-500/20 transition-all">
                    <Icon name="send" className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="text-center mb-8">
              <div className="relative w-28 h-28 mx-auto mb-4">
                <img src={myProfile.img || CAT_MASCOT} className="w-full h-full rounded-full object-cover shadow-lg shadow-slate-200" />
                <button type="button" onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 bg-red-600 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 hover:scale-105 transition-transform">
                  <Icon name="camera" className="w-4 h-4" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageFileChange} className="hidden" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">{myProfile.name || 'ชื่อของคุณ'}</h2>
              <p className="text-sm text-slate-500 mt-1">{user.email}</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 ml-1">ชื่อแสดงผล</label>
                <input type="text" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20" required />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 ml-1">คณะ</label>
                  <input type="text" value={myProfile.faculty} onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 ml-1">หอพัก/สถานที่</label>
                  <input type="text" value={myProfile.location} onChange={e => setMyProfile({...myProfile, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 ml-1">Bio (แนะนำตัว)</label>
                <textarea value={myProfile.bio} onChange={e => setMyProfile({...myProfile, bio: e.target.value})} rows={3} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm mt-1 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              </div>
              
              <div className="pt-4 space-y-3">
                <button type="submit" className="w-full bg-red-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-red-500/20 transition-all hover:bg-red-700">บันทึกข้อมูล</button>
                <button type="button" onClick={() => signOut(auth)} className="w-full bg-slate-100 text-slate-700 font-semibold py-3.5 rounded-xl transition-all hover:bg-slate-200">ออกจากระบบ</button>
              </div>
            </form>
          </div>
        )}

      </main>

      {/* Floating Bottom Nav (Glassmorphism) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[360px] px-4 z-40">
        <nav className="bg-white/90 backdrop-blur-xl rounded-full shadow-2xl shadow-slate-300/50 border border-slate-100/50 flex justify-around p-2">
          {[
            { id: 'swipe', icon: 'paw' },
            { id: 'chat', icon: 'chat' },
            { id: 'profile', icon: 'user' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`p-3 rounded-full transition-all duration-300 ${activeTab === tab.id ? 'bg-red-50 text-red-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Icon name={tab.icon} className="w-6 h-6" strokeWidth={activeTab === tab.id ? "2.5" : "2"} />
            </button>
          ))}
        </nav>
      </div>

    </div>
  );
}
