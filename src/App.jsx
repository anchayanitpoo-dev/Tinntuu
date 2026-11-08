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
const Icon = ({ name, className = "w-5 h-5", strokeWidth = "2.5" }) => {
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
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill={isFilled ? "currentColor" : "none"} 
      stroke={isFilled ? "none" : "currentColor"} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {icons[name]}
    </svg>
  );
};

// --- App Logo Component (Red & Yellow Theme) ---
const AppLogo = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tinntuuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#DC2626" /> {/* red-600 */}
        <stop offset="60%" stopColor="#EF4444" /> {/* red-500 */}
        <stop offset="100%" stopColor="#FBBF24" /> {/* amber-400 (เหลือง) */}
      </linearGradient>
    </defs>
    
    <rect x="0" y="0" width="120" height="120" rx="28" fill="url(#tinntuuGrad)" />
    
    <path d="M 32 35 L 45 55 L 28 60 Z" fill="#FFF" />
    <path d="M 88 35 L 75 55 L 92 60 Z" fill="#FFF" />
    
    <path d="M 25 65 L 12 62 M 25 70 L 12 72" stroke="#FFF" strokeWidth="3" strokeLinecap="round" /> 
    <path d="M 95 65 L 108 62 M 95 70 L 108 72" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
    
    <rect x="25" y="45" width="70" height="50" rx="25" fill="#FFF" />
    
    <circle cx="45" cy="63" r="5" fill="#333" />
    <circle cx="75" cy="63" r="5" fill="#333" />
    <path d="M 55 70 Q 60 76 65 70" stroke="#333" strokeWidth="3" strokeLinecap="round" fill="none" />
    
    <path d="M 15 82 Q 15 72 30 72 L 90 72 Q 105 72 105 82 L 105 100 Q 105 110 90 110 L 45 110 L 25 118 L 25 105 Q 15 102 15 82 Z" fill="#FFF" />
    
    <circle cx="45" cy="91" r="6" fill="#DC2626" /> {/* แดง */}
    <circle cx="60" cy="91" r="6" fill="#EF4444" /> {/* แดงสว่าง */}
    <circle cx="75" cy="91" r="6" fill="#FBBF24" /> {/* เหลือง */}
    
    <circle cx="35" cy="72" r="8" fill="#FFF" stroke="#DC2626" strokeWidth="1" opacity="0.95" />
    <circle cx="85" cy="72" r="8" fill="#FFF" stroke="#DC2626" strokeWidth="1" opacity="0.95" />
  </svg>
);

const CAT_MASCOT = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80";

const DEFAULT_PROFILE = {
  name: '', 
  faculty: 'ธรรมศาสตร์', 
  location: 'เชียงราก', 
  bio: 'ทักมาคุยกันได้นะ เมี๊ยว~', 
  img: CAT_MASCOT, 
  tags: 'หาเพื่อน, ทาสแมว',
  swiped: [],
  schedule: []
};

const ICEBREAKERS_BY_CATEGORY = {
  food: ["ช่วงนี้มีร้านชาบูเด็ดๆ แถวเชียงรากแนะนำมั้ย?", "ยามเย็นปกติชอบกินข้าวที่ใต้หอหรือไปยูเซนเตอร์?", "เคยกินป้าต๋อยยัง เมนูไหนอร่อยสุดเหรอ?"],
  study: ["ลงวิชา TU100/TU106 เซกไหนไปเหรอ?", "สัปดาห์นี้มีสอบมิดเทอมมั้ย อ่านหนังสือถึงไหนแล้ว?", "มีที่อ่านหนังสือเงียบๆ แนะนำในมหาลัยมั้ย?"],
  cat: ["เป็นทาสแมวสายไหนเหรอ แมวส้ม แมวสามสี หรือแมวลายสลิด?", "เคยเจอน้องแมวประจำคณะเรายัง น้องกวนมากเลยนะ!", "ถ้าเลี้ยงแมวได้ 1 ตัว อยากตั้งชื่อว่าอะไร?"]
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

  const [showManual, setShowManual] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');

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
              setToastMsg('มีข้อความใหม่จากเพื่อนเมี๊ยว!');
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
              setToastMsg('มีข้อความใหม่ในกลุ่มแชท!');
              setTimeout(() => setToastMsg(null), 3500);
            }
          }
        });
        setGroupRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubProfiles(); unsubMatches(); unsubGroups(); };
  }, [user]);

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
      setDoc(doc(db, 'matches', currentChatId), { [`unread_${user.uid}`]: 0 }, { merge: true }).catch(err => console.error("ล้างแจ้งเตือนไม่ได้:", err));
    }
  }, [currentChatId, activeChatType, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChatType]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('สร้างบัญชีสำเร็จ! ยินดีต้อนรับเมี๊ยว');
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
      alert('บันทึกโปรไฟล์เรียบร้อยแล้ว เมี๊ยว!');
    } catch (err) {
      console.error(err);
      alert('บันทึกโปรไฟล์ไม่สำเร็จ');
    }
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
      await setDoc(doc(db, 'user_private', user.uid), { swiped: arrayUnion(targetUid) }, { merge: true });

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
    setQuestDone(prev => ({ ...prev, chat: true }));

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
        await setDoc(doc(db, 'user_private', user.uid), { schedule: updatedSchedule }, { merge: true });
        setNewEvent({ title: '', date: '', time: '' });
        alert('เพิ่มนัดหมายแล้ว');
    } catch (err) { alert('เพิ่มนัดหมายไม่สำเร็จ'); }
  };

  const createGroupRoom = async () => {
    const roomName = newRoomName.trim();
    if (!user || !roomName) { alert('กรุณากรอกชื่อห้อง'); return; }
    try {
      const roomRef = await addDoc(collection(db, 'group_chats'), {
        room_name: roomName, createdBy: user.uid, members: [user.uid], createdAt: serverTimestamp()
      });
      setNewRoomName(''); setCurrentChatId(roomRef.id); setActiveChatType('group_chat');
    } catch (err) { console.error(err); alert('สร้างห้องไม่สำเร็จ'); }
  };

  const generateCategoryQuestion = (category) => {
    const pool = ICEBREAKERS_BY_CATEGORY[category] || ICEBREAKERS_BY_CATEGORY.food;
    let text = pool[Math.floor(Math.random() * pool.length)];
    if (catVibe === 'polite') text = text + " ครับ/ค่ะ";
    else if (catVibe === 'cat') text = text.replace("เหรอ", "ป่ะเมี๊ยว").replace("มั้ย", "รึเปล่าเมี๊ยว");
    setAiSuggestion(text);
    setQuestDone(prev => ({ ...prev, practice: true }));
  };

  const handleSmartReply = () => {
    const replies = [
      "ยินดีที่ได้รู้จักน้าา เรียนคณะอะไรเหรอ?",
      "ช่วงนี้เรียนเป็นไงบ้าง ยุ่งมากมั้ย?",
      "ว่างๆ ไปหาของกินแถวเชียงรากกันได้นะ",
      "แมวตัวในรูปน่ารักจัง เลี้ยงเองรึเปล่าเมี๊ยว?"
    ];
    setInputText(replies[Math.floor(Math.random() * replies.length)]);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    try {
      await addDoc(collection(db, 'reports'), {
        uid: user.uid, name: myProfile.name || 'Anonymous', text: reportText, createdAt: serverTimestamp()
      });
      setReportText(''); setShowReport(false);
      alert('ส่งข้อเสนอแนะให้ผู้พัฒนาเรียบร้อยแล้ว ขอบคุณมากครับ');
    } catch (error) { console.error(error); alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่'); }
  };

  const othersProfiles = allProfiles.filter(p => p.uid !== user?.uid && !localSwiped.includes(p.uid));
  const currentProfile = othersProfiles[0]; 

  const handleDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setDragStart(clientX);
    setIsDragging(true);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setDragDelta(clientX - dragStart);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const SWIPE_THRESHOLD = 120;
    if (dragDelta > SWIPE_THRESHOLD) {
      handleSwipe(currentProfile?.uid, true);
    } else if (dragDelta < -SWIPE_THRESHOLD) {
      handleSwipe(currentProfile?.uid, false);
    }
    setDragDelta(0);
  };

  if (authLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-yellow-400 text-white flex flex-col items-center justify-center font-bold gap-4">
      <div className="animate-bounce">
        <AppLogo className="w-24 h-24 border-2 border-white rounded-[30px] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]" />
      </div>
      <div className="text-xl font-black flex items-center gap-2">
        กำลังโหลดความกวน... <Icon name="paw" className="w-6 h-6" />
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-yellow-400 flex flex-col justify-center items-center p-6 font-sans relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
        <div className="bg-white/95 backdrop-blur-md w-full rounded-[3rem] p-8 shadow-2xl border-4 border-black relative z-10">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex justify-center hover:scale-105 transition-transform">
              <AppLogo className="w-32 h-32 border-4 border-black rounded-[34px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white" />
            </div>
            <h1 className="text-4xl font-black text-black tracking-tight flex items-center justify-center gap-2">
              TINNTUU <Icon name="paw" className="w-7 h-7 text-red-600 mt-1" />
            </h1>
            <p className="text-[11px] text-red-600 font-extrabold uppercase tracking-widest mt-1">Cat Speech Assistant TU Social</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-900 px-5 py-3.5 rounded-3xl font-bold text-slate-800 focus:outline-none focus:bg-white" placeholder="อีเมล (TU Email)" required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-100 border-2 border-slate-900 px-5 py-3.5 rounded-3xl font-bold text-slate-800 focus:outline-none focus:bg-white" placeholder="รหัสผ่าน" required />
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-3xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all mt-4 text-base flex items-center justify-center gap-2">
              {isLoginMode ? <>เข้าสู่ระบบ <Icon name="paw" className="w-5 h-5" /></> : <>สร้างบัญชีทาสแมว <Icon name="cat" className="w-5 h-5" /></>}
            </button>
          </form>
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full text-center text-xs text-slate-600 font-extrabold mt-5 underline hover:text-red-600 flex items-center justify-center gap-1">
            {isLoginMode ? <>ยังไม่มีบัญชี? สมัครที่นี่เมี๊ยว <Icon name="paw" className="w-4 h-4" /></> : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    );
  }

  const uniqueMatches = Array.from(new Set(matches.map(m => m.participants.find(uid => uid !== user.uid))));
  const filteredMatches = uniqueMatches.filter(otherUid => {
    const otherProfile = allProfiles.find(p => p.uid === otherUid);
    if (!otherProfile) return false;
    const queryStr = chatSearchQuery.toLowerCase().trim();
    return (
      otherProfile.name.toLowerCase().includes(queryStr) ||
      (otherProfile.faculty && otherProfile.faculty.toLowerCase().includes(queryStr)) ||
      (otherProfile.location && otherProfile.location.toLowerCase().includes(queryStr))
    );
  });
  const filteredGroupRooms = groupRooms.filter(room => 
    room.room_name && room.room_name.toLowerCase().includes(chatSearchQuery.toLowerCase().trim())
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-yellow-400 flex flex-col font-sans pb-[90px] relative text-slate-900 overflow-x-hidden">
      
      <header className="px-5 py-4 flex justify-between items-center sticky top-0 z-40 bg-gradient-to-r from-red-700 to-red-500 border-b-2 border-black/20 shadow-md">
        <h1 className="text-2xl font-black text-white flex items-center gap-2 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
          TINNTUU <Icon name="cat" className="w-6 h-6" strokeWidth="2.5" />
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="bg-yellow-300 text-black px-2.5 py-1.5 rounded-full text-[10px] font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform flex items-center gap-1">
            <Icon name="book" className="w-3 h-3" /> คู่มือ
          </button>
          <button onClick={() => setShowReport(true)} className="bg-white text-black px-2.5 py-1.5 rounded-full text-[10px] font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform flex items-center gap-1">
            <Icon name="bug" className="w-3 h-3" /> แจ้งปัญหา
          </button>
        </div>
      </header>

      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-black text-yellow-300 px-6 py-3 rounded-full text-xs font-black shadow-2xl z-[100] border-2 border-white animate-bounce flex items-center gap-2">
          <Icon name={toastMsg.includes('กลุ่ม') ? 'users' : 'chat'} className="w-4 h-4" />
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-white hover:text-yellow-300">
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 pt-4">
        {activeTab === 'swipe' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-[2.5rem] p-4 flex gap-3 overflow-x-auto scrollbar-hide border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col items-center gap-1 min-w-[65px]">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-2xl border-2 border-black flex items-center justify-center text-black shadow-sm">
                  <Icon name="chat" className="w-6 h-6" />
                </div>
                <span className="text-[9px] font-black text-slate-700">แมตช์ใหม่</span>
              </div>
              {uniqueMatches.map(otherUid => {
                  const otherProfile = allProfiles.find(p => p.uid === otherUid);
                  if(!otherProfile) return null;
                  const targetMatch = matches.find(m => m.participants.includes(otherUid));
                  return (
                    <div key={otherUid} onClick={() => { setCurrentChatId(targetMatch.id); setActiveChatType('private'); setActiveTab('chat'); }} className="flex flex-col items-center gap-1 min-w-[65px] cursor-pointer hover:scale-105 transition-transform">
                      <img src={otherProfile.img} className="w-14 h-14 rounded-2xl object-cover border-2 border-black p-0.5 shadow-sm bg-yellow-100" />
                      <span className="text-[9px] font-black text-slate-800 truncate w-full text-center">{otherProfile.name.split(' ')[0]}</span>
                    </div>
                  )
              })}
            </div>

            {currentProfile ? (
              <div 
                className="bg-white rounded-[3rem] p-4 pb-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
                style={{
                  transform: `translateX(${dragDelta}px) rotate(${dragDelta * 0.05}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                  opacity: isDragging ? 1 - Math.abs(dragDelta) / 800 : 1,
                }}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                {dragDelta > 50 && (
                  <div className="absolute top-10 left-6 z-20 border-4 border-green-500 text-green-500 font-black text-4xl px-4 py-1 rounded-xl rotate-[-15deg] opacity-80 pointer-events-none flex items-center gap-2">
                    LIKE <Icon name="paw" className="w-8 h-8" />
                  </div>
                )}
                {dragDelta < -50 && (
                  <div className="absolute top-10 right-6 z-20 border-4 border-red-500 text-red-500 font-black text-4xl px-4 py-1 rounded-xl rotate-[15deg] opacity-80 pointer-events-none flex items-center gap-2">
                    NOPE <Icon name="x" className="w-8 h-8" />
                  </div>
                )}

                <div className="absolute top-6 right-6 bg-yellow-300 border-2 border-black text-black text-[10px] px-3.5 py-1.5 rounded-full font-black z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] pointer-events-none flex items-center gap-1">
                  <Icon name="location" className="w-3 h-3" /> {currentProfile.location}
                </div>
                <div className="w-full h-[360px] rounded-[2.5rem] border-2 border-black overflow-hidden mb-4 bg-slate-100 pointer-events-none">
                  <img src={currentProfile.img} alt="profile" className="w-full h-full object-cover" draggable="false" />
                </div>
                <div className="px-2 pointer-events-none">
                  <h2 className="text-2xl font-black text-black flex items-center gap-2">
                    {currentProfile.name} <Icon name="paw" className="w-5 h-5 text-red-600" />
                  </h2>
                  <p className="text-xs text-slate-600 font-bold mt-1 mb-4">{currentProfile.bio}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-slate-100 border-2 border-black text-black font-black text-[10px] px-3 py-1 rounded-full flex items-center gap-1">
                      <Icon name="hat" className="w-3 h-3" /> {currentProfile.faculty}
                    </span>
                    <span className="bg-red-100 border-2 border-black text-red-600 font-black text-[10px] px-3 py-1 rounded-full flex items-center gap-1">
                      <Icon name="tag" className="w-3 h-3" /> {currentProfile.tags}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 px-2 z-20">
                  <button onClick={(e) => { e.stopPropagation(); handleSwipe(currentProfile.uid, false); }} className="flex-1 py-3.5 bg-slate-200 text-slate-700 border-2 border-black rounded-3xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex justify-center items-center gap-1">
                    ข้ามไปก่อน (Skip) <Icon name="cat" className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleSwipe(currentProfile.uid, true); }} className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white border-2 border-black rounded-3xl font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex justify-center items-center gap-1">
                    ถูกใจ (Match) <Icon name="heart" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] p-10 text-center border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-center mb-4 text-slate-300">
                  <Icon name="cat" className="w-16 h-16" />
                </div>
                <h3 className="text-xl font-black text-black">หมดสต็อกแล้วเมี๊ยว!</h3>
                <p className="text-xs text-slate-600 font-bold mt-2">คุณดูโปรไฟล์เพื่อนครบทุกคนแล้ว ไปพักทานข้าวก่อนนะ</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="flex flex-col gap-4 h-full">
            <div className="bg-white rounded-[3rem] p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-slate-900">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2 text-black">
                ตารางนัดหมาย <Icon name="calendar" className="w-6 h-6 text-red-600" />
              </h2>
              
              <form onSubmit={handleAddEvent} className="bg-yellow-50 rounded-[2rem] p-4 border-2 border-black mb-6 flex flex-col gap-3">
                <h3 className="font-black text-xs text-black flex items-center gap-1">
                  <Icon name="plus" className="w-3 h-3" /> เพิ่มนัดหมายทาสแมว
                </h3>
                <div className="flex gap-2">
                    <input type="date" value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date: e.target.value})} className="flex-1 bg-white border-2 border-black px-3 py-2 rounded-2xl text-xs font-bold outline-none" required/>
                    <input type="time" value={newEvent.time} onChange={e=>setNewEvent({...newEvent, time: e.target.value})} className="w-24 bg-white border-2 border-black px-3 py-2 rounded-2xl text-xs font-bold outline-none" />
                </div>
                <input type="text" value={newEvent.title} onChange={e=>setNewEvent({...newEvent, title: e.target.value})} placeholder="ชื่อกิจกรรม (เช่น นัดกินชาบู)" className="bg-white border-2 border-black px-3 py-2 rounded-2xl text-xs font-bold outline-none" required/>
                <button type="submit" className="bg-red-600 text-white py-2.5 rounded-2xl border-2 border-black font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex justify-center items-center gap-2">
                  บันทึกลงปฏิทิน <Icon name="paw" className="w-4 h-4" />
                </button>
              </form>

              <h3 className="font-black text-sm mb-3 text-black">กิจกรรมของคุณ</h3>
              <div className="flex flex-col gap-3">
                {(!myProfile.schedule || myProfile.schedule.length === 0) ? (
                    <div className="text-center text-slate-400 text-xs py-4 font-bold">ยังไม่มีนัดหมายใหม่</div>
                ) : (
                    myProfile.schedule.map((event, idx) => (
                        <div key={idx} className="bg-amber-50 border-2 border-black rounded-2xl p-3.5 flex items-center gap-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <div className="bg-red-600 text-white w-12 h-12 rounded-xl border-2 border-black flex flex-col items-center justify-center shadow-sm">
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

        {activeTab === 'chat' && (
            <div className="bg-white rounded-[3rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col h-[calc(100vh-180px)] relative">
                <div className="flex p-2 bg-slate-100 border-b-2 border-black gap-2">
                    <button onClick={() => setActiveChatType('list')} className={`flex-1 py-2.5 rounded-full text-xs font-black border-2 border-black transition-all ${activeChatType === 'list' || activeChatType === 'private' ? 'bg-red-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'}`}>คุยส่วนตัว</button>
                    <button onClick={() => setActiveChatType('group_list')} className={`flex-1 py-2.5 rounded-full text-xs font-black border-2 border-black transition-all ${activeChatType === 'group_list' || activeChatType === 'group_chat' ? 'bg-red-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'}`}>ห้องกลุ่ม</button>
                </div>

                {(activeChatType === 'list' || activeChatType === 'group_list') && (
                  <div className="p-3 bg-yellow-50 border-b-2 border-black flex gap-2 items-center">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon name="search" className="w-4 h-4" />
                      </div>
                      <input 
                        type="text" 
                        value={chatSearchQuery} 
                        onChange={e => setChatSearchQuery(e.target.value)} 
                        placeholder={activeChatType === 'list' ? "ค้นหาชื่อเพื่อน / คณะ..." : "ค้นหาชื่อห้องกลุ่ม..."} 
                        className="w-full bg-white border-2 border-black pl-9 pr-4 py-2 rounded-full text-xs font-bold text-black focus:outline-none placeholder:text-slate-400"
                      />
                      {chatSearchQuery && (
                        <button onClick={() => setChatSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black font-black">
                          <Icon name="x" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeChatType === 'list' && (
                    <div className="p-3 flex-1 overflow-y-auto">
                        {uniqueMatches.length === 0 && <div className="text-center text-slate-400 mt-10 text-xs font-black">ยังไม่มีเพื่อนที่แมทช์ ไปปัดเพื่อนกันเมี๊ยว!</div>}
                        {uniqueMatches.length > 0 && filteredMatches.length === 0 && <div className="text-center text-slate-400 mt-10 text-xs font-black flex justify-center items-center gap-1">ไม่พบเพื่อนชื่อ "{chatSearchQuery}" <Icon name="cat" className="w-4 h-4" /></div>}
                        {filteredMatches.map(otherUid => {
                            const otherProfile = allProfiles.find(p => p.uid === otherUid);
                            if(!otherProfile) return null;
                            const targetMatch = matches.find(m => m.participants.includes(otherUid));
                            const unreadCount = targetMatch?.[`unread_${user.uid}`] || 0;
                            return (
                                <div key={otherUid} onClick={() => { setCurrentChatId(targetMatch.id); setActiveChatType('private'); }} className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer hover:bg-yellow-100 transition-colors border-b-2 border-slate-100 relative">
                                    <img src={otherProfile.img} className="w-12 h-12 rounded-2xl object-cover border-2 border-black shadow-sm bg-yellow-100" />
                                    <div className="flex flex-col flex-1 truncate">
                                      <span className="font-black text-sm text-black truncate">{otherProfile.name}</span>
                                      <span className="text-[10px] font-bold text-slate-500 truncate flex items-center gap-1">
                                        <Icon name="hat" className="w-3 h-3" /> {otherProfile.faculty || 'ธรรมศาสตร์'} • <Icon name="location" className="w-3 h-3" /> {otherProfile.location || 'เชียงราก'}
                                      </span>
                                    </div>
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
                            <button type="button" onClick={createGroupRoom} className="bg-red-600 text-white border-2 border-black px-5 rounded-full text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">สร้าง</button>
                        </div>
                        <div className="flex-1 space-y-3">
                            {filteredGroupRooms.length === 0 && chatSearchQuery && <div className="text-center text-slate-400 mt-6 text-xs font-black">ไม่พบห้องกลุ่มชื่อ "{chatSearchQuery}"</div>}
                            {filteredGroupRooms.map(room => (
                                <div key={room.id} className="border-2 border-black bg-amber-50 p-3.5 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-black text-black text-sm">{room.room_name}</h4>
                                        <button onClick={() => { setCurrentChatId(room.id); setActiveChatType('group_chat'); }} className="bg-red-600 flex items-center gap-1 text-white font-black border border-black text-[10px] px-3 py-1.5 rounded-full">
                                          เข้าห้อง <Icon name="paw" className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(activeChatType === 'private' || activeChatType === 'group_chat') && (
                    <div className="flex flex-col h-full bg-slate-50 absolute inset-0 z-20 rounded-[3rem] overflow-hidden">
                        <div className="p-4 bg-white flex items-center justify-between border-b-2 border-black z-30">
                            <button onClick={() => setActiveChatType(activeChatType === 'private' ? 'list' : 'group_list')} className="text-black font-black hover:text-red-600">
                              <Icon name="chevron_left" className="w-6 h-6" />
                            </button>
                            <span className="font-black text-sm text-red-600 flex items-center gap-1">
                              {activeChatType === 'private' ? <>คุยส่วนตัว <Icon name="paw" className="w-4 h-4" /></> : <>แชทกลุ่ม <Icon name="users" className="w-4 h-4" /></>}
                            </span>
                            <Icon name="cat" className="w-6 h-6 text-black" strokeWidth="2.5" />
                        </div>
                        
                        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 z-10 pb-4">
                            {messages.map(m => (
                                <div key={m.id} className={`max-w-[78%] p-3 text-xs font-bold rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${m.senderId === user.uid ? 'bg-red-600 text-white self-end rounded-br-none' : 'bg-white text-black self-start rounded-bl-none'}`}>
                                    {activeChatType === 'group_chat' && m.senderId !== user.uid && <div className="text-[9px] font-black text-amber-500 mb-0.5">{m.senderName}</div>}
                                    {m.text}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="px-3 py-1.5 bg-yellow-100 border-t-2 border-black flex justify-between items-center z-30">
                            <span className="text-[10px] font-black text-black flex items-center gap-1">
                              <Icon name="bulb" className="w-3 h-3" /> นึกคำตอบไม่ออก?
                            </span>
                            <button onClick={handleSmartReply} type="button" className="bg-white text-red-600 flex items-center gap-1 border border-black px-3 py-0.5 rounded-full text-[10px] font-black shadow-sm">
                              สุ่มคำตอบเมี๊ยว <Icon name="paw" className="w-3 h-3" />
                            </button>
                        </div>

                        <form onSubmit={sendMessage} className="p-3 pb-24 bg-white flex gap-2 items-center border-t-2 border-black z-30">
                            <input value={inputText} onChange={e=>setInputText(e.target.value)} className="flex-1 bg-slate-100 border-2 border-black px-4 py-3 rounded-full text-xs font-bold text-black focus:outline-none" placeholder="พิมพ์ข้อความ..." />
                            <button type="submit" disabled={!inputText.trim()} className="bg-red-600 border-2 border-black disabled:opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              <Icon name="send" className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'practice' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-[3rem] p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-center mb-4">
                <div className="flex justify-center gap-2 mb-3 text-red-600">
                  <Icon name="cat" className="w-12 h-12" />
                  <Icon name="mic" className="w-12 h-12" />
                </div>
                <h2 className="text-xl font-black text-black">ศูนย์ฝึกคุยกับบอทแมว</h2>
                <p className="text-[10px] font-bold text-slate-500 mt-1">ตัวช่วยสลายความเกร็งสำหรับคนนึกคำชวนคุยไม่ออก</p>
              </div>

              <div className="bg-yellow-100 border-2 border-black p-3.5 rounded-2xl mb-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-xs font-black text-black mb-2 flex items-center gap-1">
                  <Icon name="target" className="w-4 h-4 text-black" strokeWidth="3" /> ภารกิจฝึกคุยประจำวัน
                </h3>
                <div className="flex flex-col gap-1.5 text-[11px] font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <Icon name={questDone.practice ? "check_circle" : "circle"} className={`w-4 h-4 ${questDone.practice ? "text-green-600" : "text-slate-400"}`} />
                    <span>ขอประโยคชวนคุยอย่างน้อย 1 ครั้ง</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name={questDone.chat ? "check_circle" : "circle"} className={`w-4 h-4 ${questDone.chat ? "text-green-600" : "text-slate-400"}`} />
                    <span>ส่งแชททักทายเพื่อนใหม่ 1 ข้อความ</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-[10px] font-black text-black block mb-1">เลือกสไตล์การพูด (Cat Vibe):</label>
                <div className="flex gap-2">
                  {[
                    { id: 'polite', label: 'สุภาพทางการ' },
                    { id: 'friendly', label: 'เป็นกันเอง' },
                    { id: 'cat', label: 'กวนๆ ทาสแมว' }
                  ].map(vibe => (
                    <button 
                      key={vibe.id} 
                      onClick={() => setCatVibe(vibe.id)}
                      className={`flex-1 py-2 rounded-full text-[10px] font-black border-2 border-black transition-all ${catVibe === vibe.id ? 'bg-red-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-100 text-black'}`}
                    >
                      {vibe.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-[10px] font-black text-black block mb-1">เลือกหมวดหมู่ที่อยากชวนคุย:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => generateCategoryQuestion('food')} className="bg-yellow-100 hover:bg-yellow-200 flex flex-col items-center justify-center gap-1 border-2 border-black p-2 rounded-2xl text-[10px] font-black text-black">
                    <Icon name="food" className="w-5 h-5 text-yellow-600" /> ของกินเชียงราก
                  </button>
                  <button onClick={() => generateCategoryQuestion('study')} className="bg-amber-100 hover:bg-amber-200 flex flex-col items-center justify-center gap-1 border-2 border-black p-2 rounded-2xl text-[10px] font-black text-black">
                    <Icon name="book_open" className="w-5 h-5 text-amber-600" /> เรื่องเรียน/สอบ
                  </button>
                  <button onClick={() => generateCategoryQuestion('cat')} className="bg-red-100 hover:bg-red-200 flex flex-col items-center justify-center gap-1 border-2 border-black p-2 rounded-2xl text-[10px] font-black text-black">
                    <Icon name="cat" className="w-5 h-5 text-red-600" /> แมวประจำตึก
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 border-2 border-black p-4 rounded-3xl text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs text-black font-black min-h-[40px] flex items-center justify-center">
                  {aiSuggestion || 'กดเลือกหมวดหมู่ปุ่มด้านบนเพื่อขอไอเดียประโยคชวนคุยเมี๊ยว'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-[3rem] p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] pb-8">
            <div className="text-center mb-6 border-b-2 border-black pb-6">
              <div className="relative w-28 h-28 mx-auto mb-3">
                <div className="w-full h-full bg-yellow-100 rounded-3xl overflow-hidden border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <img src={myProfile.img || CAT_MASCOT} className="w-full h-full object-cover" />
                </div>
                <button type="button" onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 bg-red-600 text-white w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-xs font-black shadow-md">
                  <Icon name="camera" className="w-4 h-4" />
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
                
                <button type="submit" className="bg-red-600 text-white border-2 border-black py-3.5 rounded-full font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-3 flex justify-center items-center gap-2">
                  บันทึกตัวตน <Icon name="paw" className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => signOut(auth)} className="bg-slate-200 text-black border-2 border-black py-3.5 rounded-full font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">ออกจากระบบ</button>
                
                <button type="button" onClick={handleDeleteAccount} className="bg-red-100 text-red-600 border-2 border-black py-3.5 rounded-full font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-1">ลบบัญชีผู้ใช้ (Delete Account)</button>
            </form>
          </div>
        )}
      </main>

      {/* --- Modal คู่มือ (Manual) --- */}
      {showManual && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full relative">
            <button onClick={() => setShowManual(false)} className="absolute top-4 right-4 text-black hover:text-red-600 font-black text-xl">
              <Icon name="x" className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
              <Icon name="book" className="w-6 h-6" /> คู่มือ TINNTUU
            </h2>
            
            <div className="space-y-4 text-xs font-bold text-slate-800">
              <div className="bg-slate-50 border-2 border-black p-3 rounded-xl flex items-start gap-3">
                <Icon name="paw" className="w-5 h-5 mt-0.5 text-red-600" />
                <div>
                  <p className="font-black text-black mb-1">หาเพื่อน (Swipe)</p>
                  <p className="text-[10px]">เลื่อนกาดไปทางซ้ายเพื่อข้าม เลื่อนไปทางขวาเพื่อส่งใจ หากใจตรงกันจะได้เริ่มแชทเลย!</p>
                </div>
              </div>
              <div className="bg-slate-50 border-2 border-black p-3 rounded-xl flex items-start gap-3">
                <Icon name="calendar" className="w-5 h-5 mt-0.5 text-red-600" />
                <div>
                  <p className="font-black text-black mb-1">นัดหมาย (Schedule)</p>
                  <p className="text-[10px]">จดบันทึกตารางนัดเจอเพื่อน กินข้าว อ่านหนังสือ มีแจ้งเตือนกิจกรรม</p>
                </div>
              </div>
              <div className="bg-slate-50 border-2 border-black p-3 rounded-xl flex items-start gap-3">
                <Icon name="chat" className="w-5 h-5 mt-0.5 text-red-600" />
                <div>
                  <p className="font-black text-black mb-1">แชท (Chat)</p>
                  <p className="text-[10px]">คุยกับเพื่อนที่แมตช์ได้ หรือจะสร้างห้องคุยเป็นกลุ่มก็สบาย</p>
                </div>
              </div>
              <div className="bg-slate-50 border-2 border-black p-3 rounded-xl flex items-start gap-3">
                <Icon name="mic" className="w-5 h-5 mt-0.5 text-red-600" />
                <div>
                  <p className="font-black text-black mb-1">ฝึกคุย (Practice)</p>
                  <p className="text-[10px]">ให้ AI บอทแมวช่วยเสนอไอเดียประโยคทักทาย ลดความเกร็ง</p>
                </div>
              </div>
            </div>
            
            <button onClick={() => setShowManual(false)} className="w-full mt-6 bg-red-600 text-white border-2 border-black py-3 rounded-full font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2">
              เข้าใจแล้วเมี๊ยว! <Icon name="paw" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- Modal แจ้งปัญหา (Report Issue) --- */}
      {showReport && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full relative">
            <button onClick={() => setShowReport(false)} className="absolute top-4 right-4 text-black hover:text-red-600 font-black text-xl">
              <Icon name="x" className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-black mb-2 flex items-center gap-2">
              <Icon name="bug" className="w-6 h-6 text-black" /> แจ้งปัญหา / เสนอแนะ
            </h2>
            <p className="text-[10px] text-slate-600 font-bold mb-5 leading-relaxed">
              พบบัคตรงไหน ใช้งานยาก หรืออยากให้ผู้พัฒนาเพิ่มฟีเจอร์อะไรใหม่ๆ พิมพ์บอกเราได้เลยเมี๊ยว!
            </p>
            
            <form onSubmit={handleReportSubmit} className="flex flex-col gap-3">
              <textarea 
                value={reportText} 
                onChange={(e) => setReportText(e.target.value)} 
                rows={5} 
                className="w-full bg-slate-50 border-2 border-black px-4 py-3 rounded-2xl outline-none resize-none text-black text-xs font-bold focus:bg-white" 
                placeholder="อธิบายรายละเอียดปัญหา หรือสิ่งที่อยากให้ปรับปรุง..." 
                required 
              />
              <button type="submit" className="w-full bg-slate-900 text-white border-2 border-black py-3.5 rounded-full font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-2 active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2">
                ส่งข้อความถึงผู้พัฒนา <Icon name="send" className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-3 inset-x-0 max-w-md mx-auto px-4 z-40">
        <nav className="bg-white rounded-full border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between p-1.5">
          {[
            { id: 'swipe', icon: 'paw', label: 'หาเพื่อน' },
            { id: 'schedule', icon: 'calendar', label: 'นัดหมาย' },
            { id: 'chat', icon: 'chat', label: 'แชท' },
            { id: 'practice', icon: 'mic', label: 'ฝึกคุย' },
            { id: 'profile', icon: 'user', label: 'โปรไฟล์' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-full border-2 transition-all ${activeTab === tab.id ? 'bg-red-600 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-105' : 'border-transparent text-slate-500'}`}
            >
              <span className="mb-0.5">
                <Icon name={tab.icon} className="w-5 h-5" strokeWidth={activeTab === tab.id ? "3" : "2"} />
              </span>
              <span className="text-[8px] font-black">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
