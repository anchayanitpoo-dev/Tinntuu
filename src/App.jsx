import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, limit, serverTimestamp, setDoc, doc,
  enableIndexedDbPersistence, where, updateDoc, arrayUnion,
  deleteField
} from 'firebase/firestore';
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  onAuthStateChanged, signOut 
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

  const [myProfile, setMyProfile] = useState({ 
    name: '', faculty: 'ธรรมศาสตร์', location: 'เชียงราก', bio: 'ทักมาคุยกันได้นะ เมี๊ยว~', 
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80', 
    tags: 'หาเพื่อน, ทาสแมว',
    swiped: [],
    schedule: []
  });
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

  // โหลดข้อมูล Public
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
        setHasProfile(false);
        setActiveTab('profile');
      }
    }, error => console.error('โหลดโปรไฟล์ไม่สำเร็จ:', error));

    const unsubMatches = onSnapshot(query(collection(db, 'matches'), where('participants', 'array-contains', user.uid)), (snapshot) => {
        setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubGroups = onSnapshot(query(collection(db, 'group_chats')), (snapshot) => {
        setGroupRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubProfiles(); unsubMatches(); unsubGroups(); };
  }, [user]);

  // โหลดข้อมูล Private
  useEffect(() => {
    if (!user) {
      setLocalSwiped([]);
      setMyProfile(prev => ({ ...prev, swiped: [], schedule: [] }));
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
        alert('สร้างบัญชีสำเร็จ! ยินดีต้อนรับ 🐾');
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

      // สร้างเอกสารส่วนตัวแยกต่างหาก ไม่เปิดเผยให้ผู้ใช้อื่นอ่าน
      await setDoc(doc(db, 'user_private', user.uid), {
        swiped: myProfile.swiped || [],
        schedule: myProfile.schedule || []
      }, { merge: true });

      setHasProfile(true);
      setActiveTab('swipe');
      alert('บันทึกโปรไฟล์สำเร็จ 🐾');
    } catch (err) {
      console.error(err);
      alert('บันทึกโปรไฟล์ไม่สำเร็จ');
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
  if (authLoading) return <div className="min-h-screen bg-gradient-to-br from-red-600 via-[#FF4500] to-orange-500 text-white flex items-center justify-center font-bold">Loading 🐾...</div>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gradient-to-br from-red-600 via-[#FF4500] to-orange-500 flex flex-col justify-center items-center p-6 font-sans">
        <div className="bg-white w-full rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-8">
            <div className="text-6xl mb-2">🐈</div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">TINNTUU</h1>
            <p className="text-[10px] text-[#FF4500] uppercase tracking-widest font-bold mt-1">Join the pack</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-100 border-none px-5 py-4 rounded-full focus:ring-2 focus:ring-[#FF4500] font-medium text-slate-800" placeholder="อีเมล (Email)" required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-100 border-none px-5 py-4 rounded-full focus:ring-2 focus:ring-[#FF4500] font-medium text-slate-800" placeholder="รหัสผ่าน (Password)" required />
            <button type="submit" className="w-full bg-gradient-to-r from-[#FF4500] to-[#FF7043] text-white font-black py-4 rounded-full shadow-lg hover:opacity-90 transition mt-4">
              {isLoginMode ? 'เข้าสู่ระบบ (Sign In)' : 'สร้างบัญชี (Create Account)'}
            </button>
          </form>
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full text-center text-xs text-slate-500 font-bold mt-6 underline hover:text-[#FF4500]">
            {isLoginMode ? 'ยังไม่มีบัญชี? สมัครเลย 🐾' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    );
  }

  const uniqueMatches = Array.from(new Set(matches.map(m => m.participants.find(uid => uid !== user.uid))));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gradient-to-br from-red-600 via-[#FF4500] to-orange-500 flex flex-col font-sans pb-[85px] relative">
      <header className="px-6 py-5 flex justify-between items-center sticky top-0 z-50 bg-transparent">
        <h1 className="text-2xl font-black text-white flex items-center gap-2 drop-shadow-md">
          TINNTUU <span className="text-white text-lg">🐾</span>
        </h1>
        <div className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-black shadow-sm border border-white/30">
          TU Network
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4">
        {/* แท็บหาเพื่อน */}
        {activeTab === 'swipe' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-[2rem] p-4 flex gap-3 overflow-x-auto whitespace-nowrap scrollbar-hide shadow-lg">
              <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className="w-14 h-14 bg-gradient-to-br from-[#FF4500] to-[#FF7043] rounded-full flex items-center justify-center text-white text-2xl shadow-sm">💬</div>
                <span className="text-[9px] font-bold text-slate-600">เพื่อนใหม่</span>
              </div>
              {uniqueMatches.map(otherUid => {
                  const otherProfile = allProfiles.find(p => p.uid === otherUid);
                  if(!otherProfile) return null;
                  const targetMatch = matches.find(m => m.participants.includes(otherUid));
                  return (
                    <div key={otherUid} onClick={() => { setCurrentChatId(targetMatch.id); setActiveChatType('private'); setActiveTab('chat'); }} className="flex flex-col items-center gap-1 min-w-[60px] cursor-pointer hover:scale-105 transition-transform">
                      <img src={otherProfile.img} className="w-14 h-14 rounded-full object-cover border-2 border-[#FF4500] p-0.5 shadow-sm" />
                      <span className="text-[9px] font-bold text-slate-800 truncate w-full text-center">{otherProfile.name.split(' ')[0]}</span>
                    </div>
                  )
              })}
            </div>

            {currentProfile ? (
              <div className="bg-white rounded-[2.5rem] p-4 pb-6 shadow-xl flex flex-col relative overflow-hidden">
                <div className="absolute top-6 right-6 bg-white/90 backdrop-blur text-[#FF4500] text-[10px] px-3 py-1.5 rounded-full font-black z-10 shadow-sm border border-slate-100">
                  📍 {currentProfile.location}
                </div>
                <img src={currentProfile.img} alt="profile" className="w-full h-[380px] object-cover rounded-[2rem] mb-4 shadow-inner" />
                <div className="px-2">
                  <h2 className="text-2xl font-black text-slate-900">{currentProfile.name}</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1 mb-4">{currentProfile.bio}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] px-3 py-1.5 rounded-full">🎓 {currentProfile.faculty}</span>
                    <span className="bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] font-bold text-[10px] px-3 py-1.5 rounded-full">🏷 {currentProfile.tags}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleSwipe(currentProfile.uid, false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-full font-black text-xs hover:bg-slate-200 transition-colors">
                      ข้ามไปก่อน (Skip)
                    </button>
                    <button onClick={() => handleSwipe(currentProfile.uid, true)} className="flex-1 py-4 bg-gradient-to-r from-[#FF4500] to-[#FF7043] text-white rounded-full font-black text-xs shadow-lg hover:opacity-90 transition-all active:scale-95">
                      ถูกใจ (Match) 🐾
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] p-10 text-center shadow-xl">
                <div className="text-6xl mb-4 text-slate-300">💤</div>
                <h3 className="text-lg font-black text-slate-900">พักผ่อนก่อนนะ</h3>
                <p className="text-xs text-slate-500 mt-2">คุณดูโปรไฟล์เพื่อนครบทุกคนแล้ว เหมียว~</p>
              </div>
            )}
          </div>
        )}

        {/* แท็บนัดหมาย */}
        {activeTab === 'schedule' && (
          <div className="flex flex-col gap-4 h-full">
            <div className="bg-white rounded-[2.5rem] p-6 shadow-xl text-slate-900">
              <h2 className="text-xl font-black mb-4 flex items-center justify-between">
                <span className="text-[#FF4500]">ตารางนัดหมาย 📅</span>
              </h2>
              
              <form onSubmit={handleAddEvent} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 flex flex-col gap-3">
                <h3 className="font-bold text-xs text-slate-700">+ เพิ่มกิจกรรมใหม่</h3>
                <div className="flex gap-2">
                    <input type="date" value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date: e.target.value})} className="flex-1 bg-white px-3 py-2 rounded-xl text-xs outline-none border border-slate-200" required/>
                    <input type="time" value={newEvent.time} onChange={e=>setNewEvent({...newEvent, time: e.target.value})} className="w-24 bg-white px-3 py-2 rounded-xl text-xs outline-none border border-slate-200" />
                </div>
                <input type="text" value={newEvent.title} onChange={e=>setNewEvent({...newEvent, title: e.target.value})} placeholder="ชื่อกิจกรรม" className="bg-white px-3 py-2 rounded-xl text-xs outline-none border border-slate-200" required/>
                <button type="submit" className="bg-[#FF4500] text-white py-2.5 rounded-xl text-xs font-black shadow-sm hover:opacity-90">บันทึกลงปฏิทิน</button>
              </form>

              <h3 className="font-bold text-sm mb-3 text-slate-800">กิจกรรมของคุณ</h3>
              <div className="flex flex-col gap-3">
                {(!myProfile.schedule || myProfile.schedule.length === 0) ? (
                    <div className="text-center text-slate-400 text-xs py-4">ยังไม่มีนัดหมาย</div>
                ) : (
                    myProfile.schedule.map((event, idx) => (
                        <div key={idx} className="bg-white border border-[#FF4500]/20 rounded-2xl p-4 flex items-center gap-4 shadow-sm relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#FF4500]"></div>
                            <div className="bg-orange-50 text-[#FF4500] w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-sm">
                                <span className="text-[9px] font-bold">{new Date(event.date).toLocaleDateString('th-TH', { month: 'short'})}</span>
                                <span className="text-sm font-black">{new Date(event.date).getDate()}</span>
                            </div>
                            <div>
                                <h4 className="font-black text-sm text-slate-800">{event.title}</h4>
                                <p className="text-[10px] text-slate-500 font-bold mt-1">เวลา: {event.time || 'ตลอดวัน'}</p>
                            </div>
                        </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* แท็บแชท */}
        {activeTab === 'chat' && (
            <div className="bg-white rounded-[2.5rem] overflow-hidden flex flex-col h-[calc(100vh-170px)] shadow-xl relative">
                <div className="flex p-2 bg-slate-50 gap-2 border-b border-slate-100">
                    <button onClick={() => setActiveChatType('list')} className={`flex-1 py-3 rounded-full text-xs font-black transition-colors ${activeChatType === 'list' || activeChatType === 'private' ? 'bg-[#FF4500] text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>คุยส่วนตัว</button>
                    <button onClick={() => setActiveChatType('group_list')} className={`flex-1 py-3 rounded-full text-xs font-black transition-colors ${activeChatType === 'group_list' || activeChatType === 'group_chat' ? 'bg-[#FF4500] text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>ห้องกลุ่ม</button>
                </div>

                {activeChatType === 'list' && (
                    <div className="p-2 flex-1 overflow-y-auto">
                        {uniqueMatches.length === 0 && <div className="text-center text-slate-400 mt-10 text-xs font-bold">ยังไม่มีเพื่อนที่แมทช์ ลองไปปัดเพื่อนดูนะ!</div>}
                        {uniqueMatches.map(otherUid => {
                            const otherProfile = allProfiles.find(p => p.uid === otherUid);
                            if(!otherProfile) return null;
                            const targetMatch = matches.find(m => m.participants.includes(otherUid));
                            return (
                                <div key={otherUid} onClick={() => { setCurrentChatId(targetMatch.id); setActiveChatType('private'); }} className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer hover:bg-orange-50 transition-colors border-b border-slate-50">
                                    <img src={otherProfile.img} className="w-14 h-14 rounded-full object-cover shadow-sm border border-slate-100" />
                                    <span className="font-black text-sm text-slate-800">{otherProfile.name}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
                
                {activeChatType === 'group_list' && (
                    <div className="p-4 flex-1 overflow-y-auto flex flex-col">
                        <div className="flex gap-2 mb-4">
                            <input value={newRoomName} onChange={e=>setNewRoomName(e.target.value)} placeholder="ชื่อห้องกลุ่ม" className="bg-slate-100 px-4 py-3 rounded-full text-xs flex-1 outline-none font-bold text-slate-800" />
                            <button type="button" onClick={createGroupRoom} className="bg-[#FF4500] text-white px-5 rounded-full text-xs font-black shadow-md">สร้าง</button>
                        </div>
                        <div className="flex-1 space-y-3">
                            {groupRooms.map(room => (
                                <div key={room.id} className="border border-slate-100 bg-white p-4 rounded-2xl shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-black text-slate-800 text-sm">{room.room_name}</h4>
                                        <button onClick={() => { setCurrentChatId(room.id); setActiveChatType('group_chat'); }} className="bg-[#FF4500]/10 text-[#FF4500] font-black text-[10px] px-3 py-1.5 rounded-full">เข้าห้อง</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(activeChatType === 'private' || activeChatType === 'group_chat') && (
                    <div className="flex flex-col h-full bg-slate-50 absolute inset-0 z-20 rounded-[2.5rem] overflow-hidden">
                        <div className="p-4 bg-white flex items-center justify-between shadow-sm z-30">
                            <button onClick={() => setActiveChatType(activeChatType === 'private' ? 'list' : 'group_list')} className="text-slate-400 font-black text-xl hover:text-[#FF4500]">&lt;</button>
                            <span className="font-black text-sm text-[#FF4500]">{activeChatType === 'private' ? 'คุยส่วนตัว' : 'แชทกลุ่ม'}</span>
                            <span className="text-xl">🐱</span>
                        </div>
                        
                        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 z-10 pb-4">
                            {messages.map(m => (
                                <div key={m.id} className={`max-w-[75%] p-3.5 text-xs font-medium rounded-2xl shadow-sm ${m.senderId === user.uid ? 'bg-gradient-to-r from-[#FF4500] to-[#FF7043] text-white self-end rounded-br-none' : 'bg-white border border-slate-100 text-slate-800 self-start rounded-bl-none'}`}>
                                    {activeChatType === 'group_chat' && m.senderId !== user.uid && <div className="text-[9px] font-black text-[#FF4500] mb-1">{m.senderName}</div>}
                                    {m.text}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={sendMessage} className="p-3 pb-24 bg-white flex gap-2 items-center border-t border-slate-100 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                            <input value={inputText} onChange={e=>setInputText(e.target.value)} className="flex-1 bg-slate-100 px-4 py-3.5 rounded-full text-xs outline-none font-medium text-slate-800 focus:ring-1 focus:ring-[#FF4500]" placeholder="พิมพ์ข้อความ..." />
                            <button type="submit" disabled={!inputText.trim()} className="bg-[#FF4500] disabled:opacity-50 text-white w-11 h-11 rounded-full flex items-center justify-center font-black shadow-md hover:bg-orange-600 transition">➤</button>
                        </form>
                    </div>
                )}
            </div>
        )}

        {/* แท็บฝึกคุย */}
        {activeTab === 'practice' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-[2.5rem] p-6 shadow-xl">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🤖🐱</div>
                <h2 className="text-xl font-black text-slate-900">ฝึกคุยกับบอทแมว</h2>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl mb-4 text-center">
                <p className="text-sm text-slate-700 font-bold mb-4">{aiSuggestion || 'กดปุ่มด้านล่างเพื่อขอประโยคชวนคุยเมี๊ยว'}</p>
                <button onClick={generateAiNextQuestion} className="bg-[#FF4500] text-white py-3 px-6 rounded-full text-xs font-black shadow-md">ขอไอเดียชวนคุย 💡</button>
              </div>
            </div>
          </div>
        )}

        {/* แท็บโปรไฟล์ */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl pb-8">
            <div className="text-center mb-6 border-b border-slate-100 pb-6">
              <div className="relative w-28 h-28 mx-auto mb-3">
                <div className="w-full h-full bg-[#FF4500]/10 rounded-[2rem] overflow-hidden shadow-inner border-2 border-[#FF4500]">
                  {myProfile.img ? <img src={myProfile.img} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-4xl">🐱</div>}
                </div>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current.click()} 
                  className="absolute bottom-0 right-0 bg-[#FF4500] text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md hover:scale-110 transition-transform"
                >
                  📷
                </button>
              </div>

              <input type="file" ref={fileInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />

              <h2 className="text-2xl font-black text-[#FF4500]">{myProfile.name || 'ชื่อของคุณ'}</h2>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 text-sm font-bold">
                <label className="text-[10px] text-slate-500 -mb-3 ml-2">ชื่อเล่น</label>
                <input type="text" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full bg-slate-50 px-5 py-4 rounded-2xl outline-none focus:bg-slate-100 focus:ring-1 focus:ring-[#FF4500] text-slate-800 border border-slate-100" placeholder="ชื่อเล่น" required />
                
                <div className="flex gap-3">
                    <input type="text" value={myProfile.faculty} onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} className="w-full bg-slate-50 px-5 py-4 rounded-2xl outline-none border border-slate-100" placeholder="คณะ" />
                    <input type="text" value={myProfile.location} onChange={e => setMyProfile({...myProfile, location: e.target.value})} className="w-full bg-slate-50 px-5 py-4 rounded-2xl outline-none border border-slate-100" placeholder="หอพัก" />
                </div>
                <textarea value={myProfile.bio} onChange={e => setMyProfile({...myProfile, bio: e.target.value})} rows={2} className="w-full bg-slate-50 px-5 py-4 rounded-2xl outline-none resize-none border border-slate-100" placeholder="Bio สั้นๆ" />
                
                <button type="submit" className="bg-gradient-to-r from-[#FF4500] to-[#FF7043] text-white py-4 rounded-full font-black text-xs shadow-md mt-4 hover:opacity-90 transition">บันทึกตัวตน 🐾</button>
                <button type="button" onClick={() => signOut(auth)} className="bg-slate-100 text-slate-500 py-4 rounded-full font-black text-xs mt-2 hover:bg-slate-200">ออกจากระบบ</button>
            </form>
          </div>
        )}
      </main>

      <div className="fixed bottom-4 inset-x-0 max-w-md mx-auto px-4 z-50">
        <nav className="bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex justify-between p-2 border border-slate-100">
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
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-[#FF4500] text-white scale-95 shadow-md' : 'text-slate-400 hover:bg-orange-50 hover:text-[#FF4500]'}`}
            >
              <span className="text-lg mb-0.5">{tab.icon}</span>
              <span className="text-[8px] font-black">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
