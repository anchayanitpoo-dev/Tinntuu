import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, limit, serverTimestamp, setDoc, doc,
  enableIndexedDbPersistence, where, updateDoc, arrayUnion,
  deleteField, deleteDoc
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

// รูปน้องแมวขาวสุดกวนสำหรับธีม
const CAT_MASCOT = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80";

// ค่าเริ่มต้นสำหรับโปรไฟล์ใหม่
const DEFAULT_PROFILE = {
  name: '', 
  faculty: 'ธรรมศาสตร์', 
  location: 'เชียงราก', 
  bio: 'ทักมาคุยกันได้นะ เมี๊ยว~ 🐾', 
  img: CAT_MASCOT, 
  tags: 'หาเพื่อน, ทาสแมว',
  swiped: [],
  schedule: []
};

export default function App() {
  // --- States ---
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
  
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Effects ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // โหลดข้อมูล Public และดักจับการแจ้งเตือน
  useEffect(() => {
    if (!user) return;
    const unsubProfiles = onSnapshot(query(collection(db, 'users'), limit(100)), snapshot => {
      const profiles = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllProfiles(profiles);
      const myDoc = profiles.find(p => p.uid === user.uid);

      if (myDoc) {
        setMyProfile(prev => ({ ...prev, ...myDoc }));
        setHasProfile(true);
      } else {
        setMyProfile(DEFAULT_PROFILE);
        setHasProfile(false);
        setActiveTab('profile');
      }
    }, error => console.error('โหลดโปรไฟล์ไม่สำเร็จ:', error));

    const unsubMatches = onSnapshot(query(collection(db, 'matches'), where('participants', 'array-contains', user.uid)), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            const data = change.doc.data();
            if (data.lastSender && data.lastSender !== user.uid) {
              setToastMsg('💬 มีข้อความใหม่จากเพื่อนเมี๊ยว!');
              setTimeout(() => setToastMsg(null), 3500);
            }
          }
        });
        setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubGroups = onSnapshot(query(collection(db, 'group_chats')), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            const data = change.doc.data();
            if (data.lastSender && data.lastSender !== user.uid) {
              setToastMsg('👥 มีข้อความใหม่ในกลุ่มแชท!');
              setTimeout(() => setToastMsg(null), 3500);
            }
          }
        });
        setGroupRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubProfiles(); unsubMatches(); unsubGroups(); };
  }, [user]);

  // โหลดข้อมูล Private
  useEffect(() => {
    if (!user) {
      setLocalSwiped([]);
      setMyProfile(DEFAULT_PROFILE);
      return;
    }

    const unsub = onSnapshot(doc(db, 'user_private', user.uid), snapshot => {
      const data = snapshot.exists() ? snapshot.data() : {};
      const swiped = data.swiped || [];
      setLocalSwiped(swiped);
      setMyProfile(prev => ({
        ...prev,
        swiped,
        schedule: data.schedule || []
      }));
    }, error => console.error('โหลดข้อมูลส่วนตัวไม่สำเร็จ:', error));

    return () => unsub();
  }, [user]);

  // โหลดข้อความแชท
  useEffect(() => {
    if (!user || !currentChatId || (activeChatType !== 'private' && activeChatType !== 'group_chat')) return;
    const collectionPath = activeChatType === 'private' ? `private_chats/${currentChatId}/messages` : `group_messages/${currentChatId}/messages`;
    const unsub = onSnapshot(query(collection(db, collectionPath), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse());
    });
    return () => unsub();
  }, [user, currentChatId, activeChatType]);

  // รีเซ็ตจำนวนข้อความอ่านแล้วเป็น 0
  useEffect(() => {
    if (user && currentChatId && activeChatType === 'private') {
      setDoc(doc(db, 'matches', currentChatId), {
        [`unread_${user.uid}`]: 0
      }, { merge: true }).catch(err => console.error("ล้างแจ้งเตือนไม่ได้:", err));
    }
  }, [currentChatId, activeChatType, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChatType]);

  // --- Handlers ---
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('สร้างบัญชีสำเร็จ! ยินดีต้อนรับเมี๊ยว 🐾');
      }
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
        uid: user.uid,
        name: myProfile.name.trim(),
        faculty: myProfile.faculty || '',
        location: myProfile.location || '',
        bio: myProfile.bio || '',
        img: myProfile.img || '',
        tags: myProfile.tags || '',
        updatedAt: serverTimestamp()
      }, { merge: true });

      await setDoc(doc(db, 'user_private', user.uid), {
        swiped: myProfile.swiped || [],
        schedule: myProfile.schedule || []
      }, { merge: true });

      setHasProfile(true);
      setActiveTab('swipe');
      alert('บันทึกโปรไฟล์เรียบร้อยแล้ว เมี๊ยว! 🐾');
    } catch (err) {
      console.error(err);
      alert('บันทึกโปรไฟล์ไม่สำเร็จ');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    const confirmDelete = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี? ข้อมูลทั้งหมดจะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้ 😿");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'user_private', user.uid));
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      alert('ลบบัญชีของคุณเรียบร้อยแล้ว ลาก่อนเมี๊ยว 🐾');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        alert('กรุณา "ออกจากระบบ" แล้ว "เข้าสู่ระบบใหม่" อีกครั้งก่อนกดลบบัญชีเพื่อยืนยันตัวตนครับ');
      } else {
        alert('เกิดข้อผิดพลาดในการลบบัญชี');
      }
    }
  };

  const handleSwipe = async (targetUid, isLike) => {
    if (!user || !targetUid || targetUid === user.uid) return;

    try {
      setLocalSwiped(prev => prev.includes(targetUid) ? prev : [...prev, targetUid]);

      await setDoc(doc(db, 'user_private', user.uid), {
        swiped: arrayUnion(targetUid)
      }, { merge: true });

      if (isLike) {
        const matchRef = await addDoc(collection(db, 'matches'), {
          participants: [user.uid, targetUid],
          matchedAt: serverTimestamp()
        });

        setCurrentChatId(matchRef.id);
        setActiveChatType('private');
        setActiveTab('chat');
      }
    } catch (err) {
      console.error(err);
      setLocalSwiped(prev => prev.filter(id => id !== targetUid));
      alert('ระบบปัดขัดข้อง กรุณาลองใหม่');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentChatId) return;
    const text = inputText; setInputText('');
    const collectionPath = activeChatType === 'private' ? `private_chats/${currentChatId}/messages` : `group_messages/${currentChatId}/messages`;
    
    await addDoc(collection(db, collectionPath), { text, senderId: user.uid, senderName: myProfile.name, createdAt: serverTimestamp() });

    if (activeChatType === 'private') {
      const currentMatch = matches.find(m => m.id === currentChatId);
      const targetUid = currentMatch ? currentMatch.participants.find(id => id !== user.uid) : null;

      if (targetUid) {
        const currentUnread = currentMatch[`unread_${targetUid}`] || 0;

        await setDoc(doc(db, 'matches', currentChatId), { 
          lastUpdated: serverTimestamp(), 
          lastSender: user.uid,
          [`unread_${targetUid}`]: currentUnread + 1
        }, { merge: true });
      }
    } else if (activeChatType === 'group_chat') {
      await setDoc(doc(db, 'group_chats', currentChatId), { 
        lastUpdated: serverTimestamp(), 
        lastSender: user.uid 
      }, { merge: true });
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;
    try {
        const updatedSchedule = [...(myProfile.schedule || []), newEvent];
        updatedSchedule.sort((a, b) => new Date(a.date) - new Date(b.date));

        await setDoc(doc(db, 'user_private', user.uid), {
          schedule: updatedSchedule
        }, { merge: true });

        setNewEvent({ title: '', date: '', time: '' });
        alert('เพิ่มนัดหมายแล้ว 📅');
    } catch (err) { alert('เพิ่มนัดหมายไม่สำเร็จ'); }
  };

  const createGroupRoom = async () => {
    const roomName = newRoomName.trim();
    if (!user || !roomName) {
      alert('กรุณากรอกชื่อห้อง');
      return;
    }

    try {
      const roomRef = await addDoc(collection(db, 'group_chats'), {
        room_name: roomName,
        createdBy: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp()
      });

      setNewRoomName('');
      setCurrentChatId(roomRef.id);
      setActiveChatType('group_chat');
    } catch (err) {
      console.error(err);
      alert('สร้างห้องไม่สำเร็จ');
    }
  };

  const generateAiNextQuestion = () => {
    const questions = ["ช่วงนี้เรียนหนักมั้ย?", "มีร้านชาบูแนะนำแถวหอมั้ย?", "ชอบแมวหรือหมามากกว่ากัน 🐱🐶?", "เสาร์อาทิตย์นี้ไปเที่ยวไหนมั้ย?"];
    setAiSuggestion(questions[Math.floor(Math.random() * questions.length)]);
  };

  const othersProfiles = allProfiles.filter(p => p.uid !== user?.uid && !localSwiped.includes(p.uid));
  const currentProfile = othersProfiles[0]; 

  // --- UI Components ---
  if (authLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#E63946] via-[#FF4500] to-[#FF7043] text-white flex flex-col items-center justify-center font-bold gap-3">
      <div className="text-6xl animate-bounce">🐱</div>
      <div className="text-xl font-black">กำลังโหลดความกวน... 🐾</div>
    </div>
  );

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gradient-to-br from-[#E63946] via-[#FF4500] to-[#FF7043] flex flex-col justify-center items-center p-6 font-sans relative overflow-hidden">
        {/* Blob Background Decorative Shapes */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>

        <div className="bg-white/95 backdrop-blur-md w-full rounded-[3rem] p-8 shadow-2xl border-4 border-black relative z-10">
          <div className="text-center mb-6">
            <div className="w-24 h-24 mx-auto mb-2 relative">
              <div className="w-full h-full rounded-full bg-amber-100 border-2 border-black flex items-center justify-center overflow-hidden">
                <span className="text-5xl">😼</span>
              </div>
            </div>
            <h1 className="text-4xl font-black text-black tracking-tight flex items-center justify-center gap-2">
              TINNTUU <span className="text-2xl">🐾</span>
            </h1>
            <p className="text-[11px] text-[#FF4500] font-extrabold uppercase tracking-widest mt-1">
              Cat Blob TU Social
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-900 px-5 py-3.5 rounded-3xl font-bold text-slate-800 focus:outline-none focus:bg-white" placeholder="อีเมล (TU Email)" required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-900 px-5 py-3.5 rounded-3xl font-bold text-slate-800 focus:outline-none focus:bg-white" placeholder="รหัสผ่าน" required />
            <button type="submit" className="w-full bg-[#FF4500] hover:bg-[#E63946] text-white font-black py-4 rounded-3xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all mt-4 text-base">
              {isLoginMode ? 'เข้าสู่ระบบ 🐾' : 'สร้างบัญชีทาสแมว 🐈'}
            </button>
          </form>

          <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full text-center text-xs text-slate-600 font-extrabold mt-5 underline hover:text-[#FF4500]">
            {isLoginMode ? 'ยังไม่มีบัญชี? สมัครที่นี่เมี๊ยว 🐾' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    );
  }

  const uniqueMatches = Array.from(new Set(matches.map(m => m.participants.find(uid => uid !== user.uid))));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gradient-to-br from-[#E63946] via-[#FF4500] to-[#FF7043] flex flex-col font-sans pb-[90px] relative text-slate-900">
      
      {/* Header Blob Style */}
      <header className="px-6 py-4 flex justify-between items-center sticky top-0 z-50 bg-gradient-to-r from-[#E63946] to-[#FF4500] border-b-2 border-black/20 shadow-md">
        <h1 className="text-2xl font-black text-white flex items-center gap-2 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
          TINNTUU <span className="text-xl">😼</span>
        </h1>
        <div className="bg-amber-300 text-black px-4 py-1.5 rounded-full text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          TU Network 🐾
        </div>
      </header>

      {/* แจ้งเตือนข้อความใหม่ */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-black text-amber-300 px-6 py-3 rounded-full text-xs font-black shadow-2xl z-[100] border-2 border-white animate-bounce flex items-center gap-2">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-white hover:text-amber-300">✕</button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 pt-4">
        {/* แท็บหาเพื่อน (Swipe) */}
        {activeTab === 'swipe' && (
          <div className="flex flex-col gap-4">
            {/* รายการแมตช์สไตล์ Blob Pills */}
            <div className="bg-white rounded-[2.5rem] p-4 flex gap-3 overflow-x-auto scrollbar-hide border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col items-center gap-1 min-w-[65px]">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-300 to-orange-400 rounded-2xl border-2 border-black flex items-center justify-center text-black text-2xl font-black shadow-sm">💬</div>
                <span className="text-[9px] font-black text-slate-700">แมตช์ใหม่</span>
              </div>
              {uniqueMatches.map(otherUid => {
                  const otherProfile = allProfiles.find(p => p.uid === otherUid);
                  if(!otherProfile) return null;
                  const targetMatch = matches.find(m => m.participants.includes(otherUid));
                  return (
                    <div key={otherUid} onClick={() => { setCurrentChatId(targetMatch.id); setActiveChatType('private'); setActiveTab('chat'); }} className="flex flex-col items-center gap-1 min-w-[65px] cursor-pointer hover:scale-105 transition-transform">
                      <img src={otherProfile.img} className="w-14 h-14 rounded-2xl object-cover border-2 border-black p-0.5 shadow-sm bg-amber-100" />
                      <span className="text-[9px] font-black text-slate-800 truncate w-full text-center">{otherProfile.name.split(' ')[0]}</span>
                    </div>
                  )
              })}
            </div>

            {/* การ์ดโปรไฟล์ Blob Style */}
            {currentProfile ? (
              <div className="bg-white rounded-[3rem] p-4 pb-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden">
                <div className="absolute top-6 right-6 bg-amber-300 border-2 border-black text-black text-[10px] px-3.5 py-1 rounded-full font-black z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  📍 {currentProfile.location}
                </div>
                <div className="w-full h-[360px] rounded-[2.5rem] border-2 border-black overflow-hidden mb-4 bg-slate-100">
                  <img src={currentProfile.img} alt="profile" className="w-full h-full object-cover" />
                </div>
                <div className="px-2">
                  <h2 className="text-2xl font-black text-black flex items-center gap-2">
                    {currentProfile.name} <span className="text-lg">🐾</span>
                  </h2>
                  <p className="text-xs text-slate-600 font-bold mt-1 mb-4">{currentProfile.bio}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-slate-100 border-2 border-black text-black font-black text-[10px] px-3 py-1 rounded-full">🎓 {currentProfile.faculty}</span>
                    <span className="bg-orange-100 border-2 border-black text-[#FF4500] font-black text-[10px] px-3 py-1 rounded-full">🏷 {currentProfile.tags}</span>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => handleSwipe(currentProfile.uid, false)} className="flex-1 py-3.5 bg-slate-200 text-slate-700 border-2 border-black rounded-3xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
                      ข้ามไปก่อน (Skip) 😼
                    </button>
                    <button onClick={() => handleSwipe(currentProfile.uid, true)} className="flex-1 py-3.5 bg-[#FF4500] hover:bg-[#E63946] text-white border-2 border-black rounded-3xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
                      ถูกใจ (Match) 🐾
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] p-10 text-center border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-7xl mb-4">😼💤</div>
                <h3 className="text-xl font-black text-black">หมดสต็อกแล้วเมี๊ยว!</h3>
                <p className="text-xs text-slate-600 font-bold mt-2">คุณดูโปรไฟล์เพื่อนครบทุกคนแล้ว ไปพักทานข้าวก่อนนะ</p>
              </div>
            )}
          </div>
        )}

        {/* แท็บนัดหมาย (Schedule Blob UI) */}
        {activeTab === 'schedule' && (
          <div className="flex flex-col gap-4 h-full">
            <div className="bg-white rounded-[3rem] p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-slate-900">
              <h2 className="text-xl font-black mb-4 flex items-center justify-between text-black">
                <span>ตารางนัดหมาย 📅</span>
              </h2>
              
              <form onSubmit={handleAddEvent} className="bg-orange-50 rounded-[2rem] p-4 border-2 border-black mb-6 flex flex-col gap-3">
                <h3 className="font-black text-xs text-black">+ เพิ่มนัดหมายทาสแมว</h3>
                <div className="flex gap-2">
                    <input type="date" value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date: e.target.value})} className="flex-1 bg-white border-2 border-black px-3 py-2 rounded-2xl text-xs font-bold outline-none" required/>
                    <input type="time" value={newEvent.time} onChange={e=>setNewEvent({...newEvent, time: e.target.value})} className="w-24 bg-white border-2 border-black px-3 py-2 rounded-2xl text-xs font-bold outline-none" />
                </div>
                <input type="text" value={newEvent.title} onChange={e=>setNewEvent({...newEvent, title: e.target.value})} placeholder="ชื่อกิจกรรม (เช่น นัดกินชาบู)" className="bg-white border-2 border-black px-3 py-2 rounded-2xl text-xs font-bold outline-none" required/>
                <button type="submit" className="bg-[#FF4500] text-white py-2.5 rounded-2xl border-2 border-black font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">บันทึกลงปฏิทิน 🐾</button>
              </form>

              <h3 className="font-black text-sm mb-3 text-black">กิจกรรมของคุณ</h3>
              <div className="flex flex-col gap-3">
                {(!myProfile.schedule || myProfile.schedule.length === 0) ? (
                    <div className="text-center text-slate-400 text-xs py-4 font-bold">ยังไม่มีนัดหมายใหม่</div>
                ) : (
                    myProfile.schedule.map((event, idx) => (
                        <div key={idx} className="bg-amber-50 border-2 border-black rounded-2xl p-3.5 flex items-center gap-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <div className="bg-[#FF4500] text-white w-12 h-12 rounded-xl border-2 border-black flex flex-col items-center justify-center shadow-sm">
                                <span className="text-[9px] font-black">{new Date(event.date).toLocaleDateString('th-TH', { month: 'short'})}</span>
                                <span className="text-sm font-black">{new Date(event.date).getDate()}</span>
                            </div>
                            <div>
                                <h4 className="font-black text-sm text-black">{event.title}</h4>
                                <p className="text-[10px] text-slate-600 font-bold mt-0.5">เวลา: {event.time || 'ตลอดวัน'}</p>
                            </div>
                        </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* แท็บแชท (Chat Blob UI) */}
        {activeTab === 'chat' && (
            <div className="bg-white rounded-[3rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col h-[calc(100vh-180px)] relative">
                <div className="flex p-2 bg-slate-100 border-b-2 border-black gap-2">
                    <button onClick={() => setActiveChatType('list')} className={`flex-1 py-2.5 rounded-full text-xs font-black border-2 border-black transition-all ${activeChatType === 'list' || activeChatType === 'private' ? 'bg-[#FF4500] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'}`}>คุยส่วนตัว</button>
                    <button onClick={() => setActiveChatType('group_list')} className={`flex-1 py-2.5 rounded-full text-xs font-black border-2 border-black transition-all ${activeChatType === 'group_list' || activeChatType === 'group_chat' ? 'bg-[#FF4500] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'}`}>ห้องกลุ่ม</button>
                </div>

                {activeChatType === 'list' && (
                    <div className="p-3 flex-1 overflow-y-auto">
                        {uniqueMatches.length === 0 && <div className="text-center text-slate-400 mt-10 text-xs font-black">ยังไม่มีเพื่อนที่แมทช์ ไปปัดเพื่อนกันเมี๊ยว!</div>}
                        {uniqueMatches.map(otherUid => {
                            const otherProfile = allProfiles.find(p => p.uid === otherUid);
                            if(!otherProfile) return null;
                            const targetMatch = matches.find(m => m.participants.includes(otherUid));
                            const unreadCount = targetMatch?.[`unread_${user.uid}`] || 0;

                            return (
                                <div key={otherUid} onClick={() => { setCurrentChatId(targetMatch.id); setActiveChatType('private'); }} className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer hover:bg-orange-100 transition-colors border-b-2 border-slate-100 relative">
                                    <img src={otherProfile.img} className="w-12 h-12 rounded-2xl object-cover border-2 border-black shadow-sm bg-amber-100" />
                                    <span className="font-black text-sm text-black flex-1">{otherProfile.name}</span>
                                    
                                    {unreadCount > 0 && (
                                        <div className="bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full border-2 border-black flex items-center justify-center shadow-sm animate-pulse">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
                
                {activeChatType === 'group_list' && (
                    <div className="p-4 flex-1 overflow-y-auto flex flex-col">
                        <div className="flex gap-2 mb-4">
                            <input value={newRoomName} onChange={e=>setNewRoomName(e.target.value)} placeholder="ชื่อห้องกลุ่ม" className="bg-slate-100 border-2 border-black px-4 py-2.5 rounded-full text-xs flex-1 outline-none font-bold text-black" />
                            <button type="button" onClick={createGroupRoom} className="bg-[#FF4500] text-white border-2 border-black px-5 rounded-full text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">สร้าง</button>
                        </div>
                        <div className="flex-1 space-y-3">
                            {groupRooms.map(room => (
                                <div key={room.id} className="border-2 border-black bg-amber-50 p-3.5 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-black text-black text-sm">{room.room_name}</h4>
                                        <button onClick={() => { setCurrentChatId(room.id); setActiveChatType('group_chat'); }} className="bg-[#FF4500] text-white font-black border border-black text-[10px] px-3 py-1.5 rounded-full">เข้าห้อง 🐾</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(activeChatType === 'private' || activeChatType === 'group_chat') && (
                    <div className="flex flex-col h-full bg-slate-50 absolute inset-0 z-20 rounded-[3rem] overflow-hidden">
                        <div className="p-4 bg-white flex items-center justify-between border-b-2 border-black z-30">
                            <button onClick={() => setActiveChatType(activeChatType === 'private' ? 'list' : 'group_list')} className="text-black font-black text-xl hover:text-[#FF4500]">&lt;</button>
                            <span className="font-black text-sm text-[#FF4500]">{activeChatType === 'private' ? 'คุยส่วนตัว 🐾' : 'แชทกลุ่ม 👥'}</span>
                            <span className="text-xl">😼</span>
                        </div>
                        
                        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 z-10 pb-4">
                            {messages.map(m => (
                                <div key={m.id} className={`max-w-[78%] p-3 text-xs font-bold rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${m.senderId === user.uid ? 'bg-[#FF4500] text-white self-end rounded-br-none' : 'bg-white text-black self-start rounded-bl-none'}`}>
                                    {activeChatType === 'group_chat' && m.senderId !== user.uid && <div className="text-[9px] font-black text-amber-500 mb-0.5">{m.senderName}</div>}
                                    {m.text}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={sendMessage} className="p-3 pb-24 bg-white flex gap-2 items-center border-t-2 border-black z-30">
                            <input value={inputText} onChange={e=>setInputText(e.target.value)} className="flex-1 bg-slate-100 border-2 border-black px-4 py-3 rounded-full text-xs font-bold text-black focus:outline-none" placeholder="พิมพ์ข้อความ..." />
                            <button type="submit" disabled={!inputText.trim()} className="bg-[#FF4500] border-2 border-black disabled:opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">➤</button>
                        </form>
                    </div>
                )}
            </div>
        )}

        {/* แท็บฝึกคุยกับบอทแมว */}
        {activeTab === 'practice' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-[3rem] p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-center mb-6">
                <div className="text-6xl mb-2">😼🤖</div>
                <h2 className="text-xl font-black text-black">ฝึกคุยกับบอทแมวหน้ากวน</h2>
              </div>
              <div className="bg-amber-50 border-2 border-black p-5 rounded-3xl mb-4 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-sm text-black font-black mb-4">{aiSuggestion || 'กดปุ่มด้านล่างเพื่อขอประโยคชวนคุยเมี๊ยว'}</p>
                <button onClick={generateAiNextQuestion} className="bg-[#FF4500] text-white border-2 border-black py-3 px-6 rounded-full text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">ขอไอเดียชวนคุย 💡</button>
              </div>
            </div>
          </div>
        )}

        {/* แท็บโปรไฟล์ (Profile Blob UI) */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-[3rem] p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] pb-8">
            <div className="text-center mb-6 border-b-2 border-black pb-6">
              <div className="relative w-28 h-28 mx-auto mb-3">
                <div className="w-full h-full bg-amber-100 rounded-3xl overflow-hidden border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <img src={myProfile.img || CAT_MASCOT} className="w-full h-full object-cover" />
                </div>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current.click()} 
                  className="absolute bottom-0 right-0 bg-[#FF4500] text-white w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-xs font-black shadow-md"
                >
                  📷
                </button>
              </div>

              <input type="file" ref={fileInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />

              <h2 className="text-2xl font-black text-black">{myProfile.name || 'ชื่อของคุณ'}</h2>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3.5 text-xs font-black">
                <label className="text-[10px] text-slate-500 -mb-2 ml-2 font-bold">ชื่อเล่น</label>
                <input type="text" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full bg-slate-50 border-2 border-black px-4 py-3 rounded-2xl outline-none text-black" placeholder="ชื่อเล่น" required />
                
                <div className="flex gap-2">
                    <input type="text" value={myProfile.faculty} onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} className="w-full bg-slate-50 border-2 border-black px-4 py-3 rounded-2xl outline-none text-black" placeholder="คณะ" />
                    <input type="text" value={myProfile.location} onChange={e => setMyProfile({...myProfile, location: e.target.value})} className="w-full bg-slate-50 border-2 border-black px-4 py-3 rounded-2xl outline-none text-black" placeholder="หอพัก" />
                </div>
                <textarea value={myProfile.bio} onChange={e => setMyProfile({...myProfile, bio: e.target.value})} rows={2} className="w-full bg-slate-50 border-2 border-black px-4 py-3 rounded-2xl outline-none resize-none text-black" placeholder="Bio สั้นๆ" />
                
                <button type="submit" className="bg-[#FF4500] text-white border-2 border-black py-3.5 rounded-full font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-3">บันทึกตัวตน 🐾</button>
                <button type="button" onClick={() => signOut(auth)} className="bg-slate-200 text-black border-2 border-black py-3.5 rounded-full font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">ออกจากระบบ</button>
                
                <button type="button" onClick={handleDeleteAccount} className="bg-red-100 text-red-600 border-2 border-black py-3.5 rounded-full font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-1">ลบบัญชีผู้ใช้ (Delete Account)</button>
            </form>
          </div>
        )}
      </main>

      {/* Bottom Nav Blob Style */}
      <div className="fixed bottom-3 inset-x-0 max-w-md mx-auto px-4 z-50">
        <nav className="bg-white rounded-full border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between p-1.5">
          {[
            { id: 'swipe', icon: '🐾', label: 'หาเพื่อน' },
            { id: 'schedule', icon: '📅', label: 'นัดหมาย' },
            { id: 'chat', icon: '💬', label: 'แชท' },
            { id: 'practice', icon: '🎙️', label: 'ฝึกคุย' },
            { id: 'profile', icon: '👤', label: 'โปรไฟล์' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-full border-2 transition-all ${activeTab === tab.id ? 'bg-[#FF4500] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-105' : 'border-transparent text-slate-500'}`}
            >
              <span className="text-base leading-none mb-0.5">{tab.icon}</span>
              <span className="text-[8px] font-black">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
