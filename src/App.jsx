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

// --- 2. Icon System ---
const Icon = ({ name, className = "w-5 h-5", strokeWidth = "2" }) => {
  const icons = {
    paw: <path d="M12 11.5c-1.5 0-3 1.5-3 3 0 2.5 2 4.5 3 4.5s3-2 3-4.5c0-1.5-1.5-3-3-3zm-5-3c-1.5 0-2.5-1-2.5-2.5S5.5 3.5 7 3.5 9.5 4.5 9.5 6 8.5 8.5 7 8.5zm10 0c-1.5 0-2.5-1-2.5-2.5S15.5 3.5 17 3.5s2.5 1 2.5 2.5-1 2.5-2.5 2.5zM12 7.5c-1.2 0-2-1-2-2.5S10.8 2.5 12 2.5s2 1 2 2.5-.8 2.5-2 2.5z"/>,
    cat: <><path d="M21 16.52A5 5 0 0 1 18.5 20h-13a5 5 0 0 1-2.5-3.48L2 12V4l4.5 4.5h11L22 4v8l-1 4.52z"/><path d="M9 14h.01M15 14h.01M12 17h.01"/></>,
    chat: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    location: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    hat: <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    send: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    bulb: <><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
    trash: <><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></>,
    help: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    chevronLeft: <polyline points="15 18 9 12 15 6"></polyline>,
    mic: <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2"/>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>
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
  img: CAT_MASCOT, tags: 'หาเพื่อน, ทาสแมว', 
  dob: '', contact: '', swiped: [], schedule: []
};

const calculateAge = (dobString) => {
  if (!dobString) return '';
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
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
  const [toastMsg, setToastMsg] = useState(null);

  const [matches, setMatches] = useState([]);
  const [activeChatType, setActiveChatType] = useState('list'); 
  const [chatViewTab, setChatViewTab] = useState('private'); 
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [groupRooms, setGroupRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  
  // Media Messaging Refs & States
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatImageInputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '' });
  const [catVibe, setCatVibe] = useState('friendly');
  const [practiceInput, setPracticeInput] = useState('');
  const [practiceMessages, setPracticeMessages] = useState([{ id: 1, sender: 'ai', text: 'สวัสดีมนุษย์ มีอะไรให้เราช่วยคุยมั้ย?' }]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const practiceEndRef = useRef(null);

  const [dragStart, setDragStart] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Modals
  const [showManual, setShowManual] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');

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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeChatType]);
  useEffect(() => { practiceEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [practiceMessages, isAiTyping]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLoginMode) await signInWithEmailAndPassword(auth, email, password);
      else { await createUserWithEmailAndPassword(auth, email, password); alert('สร้างบัญชีสำเร็จ!'); }
    } catch (err) { alert(err.message); }
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
        dob: myProfile.dob || '', 
        contact: myProfile.contact || '', 
        updatedAt: serverTimestamp()
      }, { merge: true });
      await setDoc(doc(db, 'user_private', user.uid), { swiped: myProfile.swiped || [], schedule: myProfile.schedule || [] }, { merge: true });
      setHasProfile(true); setActiveTab('swipe');
      alert("บันทึกข้อมูลเรียบร้อยแล้ว!");
    } catch (err) { alert('บันทึกโปรไฟล์ไม่สำเร็จ'); }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmDelete = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี? ข้อมูลทั้งหมดจะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้");
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'user_private', user.uid));
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      alert('ลบบัญชีของคุณเรียบร้อยแล้ว ลาก่อนเมี๊ยว');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') alert('กรุณา "ออกจากระบบ" แล้ว "เข้าสู่ระบบใหม่" อีกครั้งเพื่อยืนยันตัวตนก่อนลบ');
      else alert('เกิดข้อผิดพลาดในการลบบัญชี');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportText.trim() || !user) return;
    try {
      await addDoc(collection(db, 'reports'), {
        uid: user.uid, name: myProfile.name, issue: reportText, createdAt: serverTimestamp()
      });
      alert('ส่งข้อมูลแจ้งปัญหาเรียบร้อยแล้ว ทีมงานจะรีบตรวจสอบให้ครับ!');
      setShowReport(false);
      setReportText('');
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่');
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMyProfile(prev => ({ ...prev, img: reader.result }));
      reader.readAsDataURL(file);
    }
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
    } catch (err) {}
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

  // --- Send Message Helpers (Text, Image, Audio) ---
  const sendMediaMessage = async ({ text = '', imageUrl = null, audioUrl = null }) => {
    if (!currentChatId) return;
    const collectionPath = activeChatType === 'private' ? `private_chats/${currentChatId}/messages` : `group_messages/${currentChatId}/messages`;
    await addDoc(collection(db, collectionPath), {
      text,
      imageUrl,
      audioUrl,
      senderId: user.uid,
      senderName: myProfile.name,
      createdAt: serverTimestamp()
    });
    if (activeChatType === 'private') {
      await setDoc(doc(db, 'matches', currentChatId), { lastSender: user.uid }, { merge: true });
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentChatId) return;
    const text = inputText; 
    setInputText('');
    await sendMediaMessage({ text });
  };

  const handleChatImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        await sendMediaMessage({ imageUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          await sendMediaMessage({ audioUrl: reader.result });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert('ไม่สามารถเข้าถึงไมโครโฟนได้');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    await addDoc(collection(db, 'group_chats'), { name: newRoomName.trim(), createdBy: user.uid, createdAt: serverTimestamp() });
    setNewRoomName('');
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date || !newEvent.time) return;
    const updatedSchedule = [...(myProfile.schedule || []), { ...newEvent, id: Date.now() }];
    setMyProfile(prev => ({ ...prev, schedule: updatedSchedule }));
    await setDoc(doc(db, 'user_private', user.uid), { schedule: updatedSchedule }, { merge: true });
    setNewEvent({ title: '', date: '', time: '' });
  };

  const handleDeleteEvent = async (id) => {
    const updatedSchedule = myProfile.schedule.filter(ev => ev.id !== id);
    setMyProfile(prev => ({ ...prev, schedule: updatedSchedule }));
    await setDoc(doc(db, 'user_private', user.uid), { schedule: updatedSchedule }, { merge: true });
  };

  const handlePracticeSubmit = (e) => {
    e.preventDefault();
    const text = practiceInput.trim();
    if (!text) return;
    
    setPracticeMessages(prev => [...prev, { id: Date.now(), sender: 'user', text }]);
    setPracticeInput('');
    setIsAiTyping(true);

    setTimeout(() => {
      let aiReply = "อืม แล้วไงต่อ? ไม่เห็นน่าตื่นเต้นเลย";
      if (catVibe === 'friendly') aiReply = "ใจเย็นๆ น้า เราเป็นกำลังใจให้เมี๊ยว 💖";
      else if (catVibe === 'flirty') aiReply = "น่ารักจัง ขอจีบได้ป่าวเมี๊ยว";
      setPracticeMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: aiReply }]);
      setIsAiTyping(false);
    }, 1000); 
  };

  const openPrivateChat = (matchInfo, otherProfile) => {
    setCurrentChatId(matchInfo.id);
    setActiveChatType('private');
    setActiveTab('chat');
  };

  const openGroupChat = (room) => {
    setCurrentChatId(room.id);
    setActiveChatType('group_chat');
    setActiveTab('chat');
  };

  const othersProfiles = allProfiles.filter(p => p.uid !== user?.uid && !localSwiped.includes(p.uid));
  const currentProfile = othersProfiles[0]; 
  
  const uniqueMatches = Array.from(new Set(matches.map(m => m.participants.find(uid => uid !== user.uid))));
  const filteredMatches = uniqueMatches.filter(otherUid => {
    const p = allProfiles.find(p => p.uid === otherUid);
    return p && p.name.toLowerCase().includes(chatSearchQuery.toLowerCase().trim());
  });

  if (authLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-pulse text-red-500"><Icon name="cat" className="w-12 h-12" /></div></div>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 relative overflow-hidden">
        <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl z-10 border border-white">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">TINNTUU</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border px-5 py-4 rounded-2xl text-sm" placeholder="อีเมลมหาวิทยาลัย" required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border px-5 py-4 rounded-2xl text-sm" placeholder="รหัสผ่าน" required />
            <button type="submit" className="w-full bg-red-600 text-white font-semibold py-4 rounded-2xl">{isLoginMode ? 'เข้าสู่ระบบ' : 'สร้างบัญชีผู้ใช้'}</button>
          </form>
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full text-center text-sm text-slate-500 mt-6 hover:text-red-600 font-medium">
            {isLoginMode ? 'ยังไม่มีบัญชี? สมัครใช้งาน' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col font-sans pb-28 relative text-slate-800 overflow-x-hidden">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg text-sm flex items-center gap-2 animate-bounce">
          <Icon name="chat" className="w-4 h-4 text-red-400" /> {toastMsg}
        </div>
      )}

      <header className="px-6 py-4 sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400 flex items-center gap-2">
          TINNTUU <Icon name="cat" className="w-6 h-6 text-red-500" />
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pt-4">
        {/* --- SWIPE TAB --- */}
        {activeTab === 'swipe' && (
          <div className="flex flex-col h-full gap-4">
            
            {/* สตอรี่แมตช์ใหม่ (Matches Story Bar) */}
            <div className="bg-white rounded-3xl p-3 flex gap-4 overflow-x-auto shadow-sm border border-slate-100 scrollbar-none">
              <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className="w-14 h-14 bg-red-50 rounded-full border-2 border-dashed border-red-300 flex items-center justify-center text-red-500 shadow-sm">
                  <Icon name="heart" className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold text-slate-500">แมตช์ใหม่</span>
              </div>
              
              {uniqueMatches.map(otherUid => {
                const profile = allProfiles.find(p => p.uid === otherUid);
                const matchDoc = matches.find(m => m.participants.includes(otherUid));
                if (!profile || !matchDoc) return null;
                return (
                  <div 
                    key={otherUid} 
                    onClick={() => openPrivateChat(matchDoc, profile)} 
                    className="flex flex-col items-center gap-1 min-w-[60px] cursor-pointer hover:scale-105 transition-transform"
                  >
                    <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-red-500 to-red-600 shadow-sm">
                      <img src={profile.img || CAT_MASCOT} className="w-full h-full rounded-full object-cover border-2 border-white" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 truncate w-full text-center max-w-[60px]">{profile.name.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>

            {/* การ์ดปัดเพื่อน */}
            {currentProfile ? (
              <div className="relative w-full h-[54vh] rounded-[2rem] overflow-hidden shadow-2xl bg-white">
                <div 
                  className="absolute inset-0 w-full h-full cursor-grab touch-none z-20"
                  style={{ transform: `translateX(${dragDelta}px) rotate(${dragDelta * 0.05}deg)`, transition: isDragging ? 'none' : 'transform 0.4s' }}
                  onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
                  onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
                >
                  <img src={currentProfile.img || CAT_MASCOT} className="w-full h-full object-cover pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
                  
                  {currentProfile.location && (
                    <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1">
                      <Icon name="location" className="w-3.5 h-3.5" /> {currentProfile.location}
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 w-full p-6 text-white pointer-events-none">
                    <h2 className="text-3xl font-bold mb-1">
                      {currentProfile.name} 
                      {currentProfile.dob && <span className="font-medium text-xl ml-2 text-white/90">{calculateAge(currentProfile.dob)}</span>}
                    </h2>
                    {currentProfile.faculty && (
                      <div className="flex items-center gap-1.5 text-xs text-white/80 mb-2 font-medium">
                        <Icon name="hat" className="w-4 h-4" /> คณะ{currentProfile.faculty}
                      </div>
                    )}
                    <p className="text-sm text-white/90 mb-2 line-clamp-2">{currentProfile.bio}</p>
                    {currentProfile.contact && (
                      <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-medium">
                        <Icon name="link" className="w-3 h-3" /> {currentProfile.contact}
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-6 left-0 w-full flex justify-center gap-6 z-30 pointer-events-none">
                  <button onClick={(e) => { e.stopPropagation(); handleSwipe(currentProfile.uid, false); }} className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform pointer-events-auto"><Icon name="x" className="w-5 h-5 text-slate-400" strokeWidth="2.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleSwipe(currentProfile.uid, true); }} className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-red-500/30 hover:scale-110 transition-transform pointer-events-auto"><Icon name="heart" className="w-5 h-5" strokeWidth="2.5" /></button>
                </div>
              </div>
            ) : (
              <div className="h-[54vh] flex flex-col items-center justify-center text-slate-500 bg-white rounded-[2rem] shadow-sm">
                <Icon name="search" className="w-12 h-12 mb-4 text-slate-300" />
                <p className="font-bold text-slate-700">ค้นหาเพื่อนใหม่หมดแล้ว</p>
                <p className="text-sm text-slate-400 mt-1">ลองเข้ามาดูใหม่ภายหลังนะเมี๊ยว~</p>
              </div>
            )}
          </div>
        )}

        {/* --- SCHEDULE TAB (ใส่วันที่และเวลาได้) --- */}
        {activeTab === 'schedule' && (
          <div className="p-5 bg-white rounded-3xl min-h-[60vh] shadow-sm border border-slate-100">
             <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
               <Icon name="calendar" className="text-red-500" /> ตารางกิจกรรม
             </h2>

             {/* ฟอร์มใส่วันที่ เวลา และ ชื่อกิจกรรม */}
             <form onSubmit={handleAddEvent} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 mb-6">
                <input 
                  type="text" 
                  placeholder="ชื่อกิจกรรม / ตารางเรียน..." 
                  value={newEvent.title} 
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})} 
                  className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" 
                  required
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-slate-400 ml-1">วันที่</label>
                    <input 
                      type="date" 
                      value={newEvent.date} 
                      onChange={e => setNewEvent({...newEvent, date: e.target.value})} 
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" 
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-slate-400 ml-1">เวลา</label>
                    <input 
                      type="time" 
                      value={newEvent.time} 
                      onChange={e => setNewEvent({...newEvent, time: e.target.value})} 
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" 
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl shadow-md shadow-red-500/20 hover:bg-red-700 transition-colors">
                  เพิ่มกิจกรรม
                </button>
             </form>

             {/* รายการตารางกิจกรรม */}
             <div className="space-y-3">
               {myProfile.schedule?.map(ev => (
                 <div key={ev.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
                   <div>
                     <h4 className="font-semibold text-slate-800 text-sm">{ev.title}</h4>
                     <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                       {ev.date && <span className="flex items-center gap-1"><Icon name="calendar" className="w-3.5 h-3.5 text-red-500" /> {ev.date}</span>}
                       {ev.time && <span className="flex items-center gap-1"><Icon name="clock" className="w-3.5 h-3.5 text-red-500" /> {ev.time}</span>}
                     </div>
                   </div>
                   <button onClick={() => handleDeleteEvent(ev.id)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-red-500 border border-slate-100 shadow-sm transition-colors">
                     <Icon name="trash" className="w-4 h-4"/>
                   </button>
                 </div>
               ))}
               {(!myProfile.schedule || myProfile.schedule.length === 0) && (
                 <div className="text-center text-slate-400 text-sm py-8">ยังไม่มีตารางกิจกรรม</div>
               )}
             </div>
          </div>
        )}

        {/* --- PRACTICE TAB --- */}
        {activeTab === 'practice' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[70vh] overflow-hidden">
             <div className="p-4 border-b flex gap-2 overflow-x-auto bg-slate-50">
               {['friendly', 'flirty', 'sassy'].map(v => (
                 <button key={v} onClick={() => setCatVibe(v)} className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${catVibe === v ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border'}`}>
                   {v === 'friendly' ? 'เป็นมิตร' : v === 'flirty' ? 'หยอดเก่ง' : 'กวนโอ๊ย'}
                 </button>
               ))}
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {practiceMessages.map(m => (
                  <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 max-w-[80%] rounded-2xl text-sm ${m.sender === 'user' ? 'bg-red-600 text-white rounded-br-sm' : 'bg-white border shadow-sm rounded-bl-sm text-slate-700'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="p-3 bg-white border shadow-sm rounded-2xl rounded-bl-sm flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                )}
                <div ref={practiceEndRef} />
             </div>
             <form onSubmit={handlePracticeSubmit} className="p-3 bg-white border-t flex gap-2">
                <input type="text" value={practiceInput} onChange={e => setPracticeInput(e.target.value)} className="flex-1 bg-slate-100 px-4 py-2 rounded-full text-sm outline-none focus:ring-1 focus:ring-red-500" placeholder="พิมพ์ข้อความ..." />
                <button type="submit" className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center"><Icon name="send" className="w-4 h-4" /></button>
             </form>
           </div>
        )}

        {/* --- CHAT TAB --- */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[75vh] overflow-hidden">
            {!currentChatId ? (
              <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">ข้อความ</h2>
                </div>

                {/* ช่องค้นหาเพื่อน */}
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon name="search" className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    placeholder="ค้นหาชื่อเพื่อน..."
                  />
                </div>

                {/* แถบสลับระหว่าง แชทส่วนตัว / แชทกลุ่ม */}
                <div className="flex gap-2 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0">
                  <button 
                    onClick={() => setChatViewTab('private')} 
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${chatViewTab === 'private' ? 'bg-white shadow-sm text-red-600 border border-slate-200' : 'text-slate-500'}`}
                  >
                    ส่วนตัว
                  </button>
                  <button 
                    onClick={() => setChatViewTab('group')} 
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${chatViewTab === 'group' ? 'bg-white shadow-sm text-red-600 border border-slate-200' : 'text-slate-500'}`}
                  >
                    กลุ่ม
                  </button>
                </div>

                {/* แสดงรายการแชท */}
                <div className="space-y-2 overflow-y-auto flex-1 pb-10">
                  {chatViewTab === 'private' ? (
                    filteredMatches.length > 0 ? (
                      filteredMatches.map(otherUid => {
                        const p = allProfiles.find(profile => profile.uid === otherUid);
                        const matchDoc = matches.find(m => m.participants.includes(otherUid));
                        if (!p || !matchDoc) return null;
                        return (
                          <div key={otherUid} onClick={() => openPrivateChat(matchDoc, p)} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                            <img src={p.img || CAT_MASCOT} className="w-14 h-14 rounded-full object-cover shadow-sm border border-slate-200" />
                            <div className="flex-1">
                              <h3 className="font-bold text-slate-800">{p.name}</h3>
                              <p className="text-sm text-slate-500 line-clamp-1">แตะเพื่อเข้าสู่ห้องแชท</p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-10 flex flex-col items-center">
                        <Icon name="chat" className="w-10 h-10 text-slate-300 mb-3" />
                        <p className="text-slate-400 text-sm">ยังไม่มีเพื่อนที่ Match กัน</p>
                      </div>
                    )
                  ) : (
                    <div className="space-y-3">
                      <form onSubmit={handleCreateGroup} className="flex gap-2 mb-4">
                        <input 
                          type="text" 
                          value={newRoomName} 
                          onChange={(e) => setNewRoomName(e.target.value)} 
                          placeholder="ตั้งชื่อกลุ่มใหม่..." 
                          className="flex-1 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-red-500"
                        />
                        <button type="submit" className="bg-red-100 text-red-600 px-4 rounded-xl hover:bg-red-200 transition-colors">
                          <Icon name="plus" />
                        </button>
                      </form>

                      {groupRooms.map(room => (
                        <div key={room.id} onClick={() => openGroupChat(room)} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-500 border border-red-100 shadow-sm shrink-0">
                            <Icon name="users" className="w-6 h-6" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <h3 className="font-bold text-slate-800 truncate">{room.name}</h3>
                            <p className="text-sm text-slate-500 line-clamp-1">แตะเพื่อเข้าร่วมการสนทนา</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* --- หน้าต่างห้องแชท (ส่งรูปภาพ + เสียงได้) --- */
              <div className="flex flex-col h-full bg-slate-50">
                <div className="p-4 bg-white border-b flex items-center gap-3 shrink-0">
                  <button onClick={() => setCurrentChatId(null)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
                    <Icon name="chevronLeft" className="w-6 h-6" />
                  </button>
                  <div className="font-bold text-slate-800">
                    {activeChatType === 'private' ? 'แชทส่วนตัว' : 'แชทกลุ่ม'}
                  </div>
                </div>

                {/* พื้นที่แสดงข้อความ รูปภาพ และเสียง */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(msg => {
                    const isMe = msg.senderId === user.uid;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && activeChatType !== 'private' && <span className="text-xs text-slate-500 mb-1 ml-1">{msg.senderName}</span>}
                        <div className={`p-3 max-w-[80%] rounded-2xl text-sm ${isMe ? 'bg-red-600 text-white rounded-br-sm' : 'bg-white border shadow-sm rounded-bl-sm text-slate-700'}`}>
                          {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                          {msg.imageUrl && (
                            <img src={msg.imageUrl} alt="รูปภาพแชท" className="rounded-xl max-h-60 object-cover my-1 shadow-sm cursor-pointer" onClick={() => window.open(msg.imageUrl, '_blank')} />
                          )}
                          {msg.audioUrl && (
                            <div className="py-1">
                              <audio controls src={msg.audioUrl} className="max-w-[220px] h-9 rounded-lg" />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* ฟอร์มส่งข้อความ พร้อมปุ่มส่งรูปภาพ และปุ่มบันทึกเสียง */}
                <form onSubmit={sendMessage} className="p-3 bg-white border-t flex items-center gap-2 shrink-0">
                  {/* ปุ่มเลือกรูปภาพ */}
                  <button 
                    type="button" 
                    onClick={() => chatImageInputRef.current?.click()} 
                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors"
                    title="ส่งรูปภาพ"
                  >
                    <Icon name="image" className="w-5 h-5" />
                  </button>
                  <input 
                    type="file" 
                    ref={chatImageInputRef} 
                    onChange={handleChatImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />

                  {/* ปุ่มบันทึกเสียง */}
                  {isRecording ? (
                    <button 
                      type="button" 
                      onClick={stopRecording} 
                      className="p-2 bg-red-600 text-white animate-pulse rounded-full shadow-md flex items-center justify-center"
                      title="หยุดอัดและส่งเสียง"
                    >
                      <Icon name="stop" className="w-5 h-5" />
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={startRecording} 
                      className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors"
                      title="อัดเสียง"
                    >
                      <Icon name="mic" className="w-5 h-5" />
                    </button>
                  )}

                  <input 
                    type="text" 
                    value={inputText} 
                    onChange={e => setInputText(e.target.value)} 
                    className="flex-1 bg-slate-100 px-4 py-2.5 rounded-full text-sm outline-none focus:ring-1 focus:ring-red-500" 
                    placeholder={isRecording ? "กำลังอัดเสียง... (กดปุ่มสี่เหลี่ยมเพื่อส่ง)" : "พิมพ์ข้อความ..."}
                    disabled={isRecording}
                  />
                  
                  <button 
                    type="submit" 
                    disabled={!inputText.trim() || isRecording} 
                    className="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
                  >
                    <Icon name="send" className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
             <div className="text-center mb-6">
              <div className="relative w-28 h-28 mx-auto mb-4">
                <img src={myProfile.img || CAT_MASCOT} className="w-full h-full rounded-full object-cover shadow-lg" />
                <button type="button" onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 bg-red-600 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg"><Icon name="camera" className="w-4 h-4" /></button>
                <input type="file" ref={fileInputRef} onChange={handleImageFileChange} className="hidden" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">{myProfile.name || 'โปรไฟล์ของคุณ'}</h2>
            </div>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 ml-1">ชื่อแสดงผล</label>
                <input type="text" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20" required />
              </div>

              {/* วันเกิด & อายุ */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 ml-1">วัน/เดือน/ปีเกิด</label>
                  <input type="date" value={myProfile.dob} onChange={e => setMyProfile({...myProfile, dob: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                </div>
                <div className="w-24">
                  <label className="text-xs font-semibold text-slate-500 ml-1 text-center block">อายุ</label>
                  <input type="text" value={calculateAge(myProfile.dob) ? `${calculateAge(myProfile.dob)} ปี` : ''} disabled className="w-full bg-slate-100 border border-slate-200 px-2 py-3 rounded-xl text-sm mt-1 text-center text-slate-600 font-semibold" placeholder="-" />
                </div>
              </div>

              {/* คณะ & หอพัก */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 ml-1">คณะ</label>
                  <input type="text" value={myProfile.faculty} onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20" placeholder="คณะ..." />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 ml-1">หอพัก/สถานที่</label>
                  <input type="text" value={myProfile.location} onChange={e => setMyProfile({...myProfile, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20" placeholder="สถานที่..." />
                </div>
              </div>

              {/* ช่องทางติดต่อเพิ่มเติม */}
              <div>
                <label className="text-xs font-semibold text-slate-500 ml-1 flex items-center gap-1">
                  <Icon name="link" className="w-3.5 h-3.5" /> ช่องทางติดต่อเพิ่มเติม (IG, Line, ฯลฯ)
                </label>
                <input type="text" value={myProfile.contact} onChange={e => setMyProfile({...myProfile, contact: e.target.value})} placeholder="เช่น IG: @your_name, Line ID: xx" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              </div>

              {/* Bio แนะนำตัว */}
              <div>
                <label className="text-xs font-semibold text-slate-500 ml-1">Bio (แนะนำตัว)</label>
                <textarea value={myProfile.bio} onChange={e => setMyProfile({...myProfile, bio: e.target.value})} rows={2} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm mt-1 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20" placeholder="เขียนแนะนำตัวสั้นๆ..." />
              </div>
              
              <div className="pt-2 space-y-3">
                <button type="submit" className="w-full bg-red-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-700 transition-colors">บันทึกข้อมูล</button>
                <button type="button" onClick={() => signOut(auth)} className="w-full bg-slate-100 text-slate-700 font-semibold py-3.5 rounded-xl hover:bg-slate-200 transition-colors">ออกจากระบบ</button>
              </div>
            </form>

            <div className="pt-6 mt-6 border-t border-slate-100 space-y-3">
              <button type="button" onClick={() => setShowManual(true)} className="w-full bg-blue-50 text-blue-600 font-semibold py-3.5 rounded-xl border border-blue-100 flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                <Icon name="help" className="w-5 h-5" /> คู่มือการใช้งาน
              </button>
              
              <button type="button" onClick={() => setShowReport(true)} className="w-full bg-amber-50 text-amber-600 font-semibold py-3.5 rounded-xl border border-amber-100 flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors">
                <Icon name="alert" className="w-5 h-5" /> แจ้งปัญหาการใช้งาน
              </button>
              
              <button type="button" onClick={handleDeleteAccount} className="w-full text-red-500 font-semibold py-3.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
                ลบบัญชีผู้ใช้
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[400px] px-4 z-40">
        <nav className="bg-white/90 backdrop-blur-xl rounded-full shadow-2xl flex justify-between p-2 px-4">
          {[ 
            { id: 'swipe', icon: 'paw' }, 
            { id: 'schedule', icon: 'calendar' }, 
            { id: 'practice', icon: 'bulb' }, 
            { id: 'chat', icon: 'chat' }, 
            { id: 'profile', icon: 'user' } 
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'chat') setCurrentChatId(null); 
              }} 
              className={`p-3 rounded-full transition-all duration-300 ${activeTab === tab.id ? 'bg-red-50 text-red-600 scale-110 shadow-sm' : 'text-slate-400'}`}
            >
              <Icon name={tab.icon} className="w-6 h-6" />
            </button>
          ))}
        </nav>
      </div>

      {/* --- MODALS --- */}
      {showManual && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Icon name="help" className="text-blue-500" /> คู่มือการใช้งาน
            </h2>
            <div className="space-y-4 text-sm text-slate-600 max-h-[60vh] overflow-y-auto">
              <p>🐾 <b>แท็บหาเพื่อน (Swipe):</b> ปัดขวาหรือกดหัวใจเพื่อ Match หากใจตรงกันจะได้แชทส่วนตัว ปัดซ้ายเพื่อข้าม</p>
              <p>📅 <b>แท็บตาราง:</b> เพิ่มกิจกรรม/ตารางเรียน ระบุวันและเวลาเพื่อช่วยจัดสรรเวลา</p>
              <p>💡 <b>แท็บซ้อมแชท:</b> แชทพูดคุยกับ AI มาสคอตแมวเหมียว สามารถเลือกอารมณ์ได้ (เป็นมิตร, หยอดเก่ง, กวนโอ๊ย)</p>
              <p>💬 <b>แท็บแชท:</b> ส่งรูปภาพและอัดเสียงคุยกันได้ แบ่งเป็นแชทส่วนตัว (คนที่ Match) และห้องกลุ่ม มีช่องค้นหารายชื่อเพื่อน</p>
              <p>👤 <b>แท็บโปรไฟล์:</b> แก้ไขข้อมูลส่วนตัว ใส่คณะ วันเกิด/อายุ ช่องทางติดต่อ ลบบัญชี และแจ้งปัญหาแอป</p>
            </div>
            <button onClick={() => setShowManual(false)} className="mt-6 w-full bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200">
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Icon name="alert" className="text-amber-500" /> แจ้งปัญหา / ข้อเสนอแนะ
            </h2>
            <form onSubmit={handleReportSubmit}>
              <textarea 
                value={reportText} 
                onChange={e => setReportText(e.target.value)} 
                placeholder="พบข้อผิดพลาด หรืออยากเสนอแนะอะไร พิมพ์บอกเราได้เลย..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                required
              />
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setShowReport(false)} className="flex-1 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200">
                  ยกเลิก
                </button>
                <button type="submit" className="flex-1 bg-amber-500 text-white font-semibold py-3 rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-500/30">
                  ส่งรายงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
