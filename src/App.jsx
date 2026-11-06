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
  onAuthStateChanged, signOut, deleteUser, sendEmailVerification
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

const CAT_MASCOT = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80";

const DEFAULT_PROFILE = {
  name: 'เด็ก มธ.', 
  faculty: '', 
  location: '', 
  bio: 'ทักมาคุยกันได้นะ เมี๊ยว~ 🐾', 
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
  // --- States ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regFaculty, setRegFaculty] = useState('');
  const [regAddress, setRegAddress] = useState('');

  const [activeTab, setActiveTab] = useState('swipe'); 
  const [allProfiles, setAllProfiles] = useState([]);
  const [localSwiped, setLocalSwiped] = useState([]);

  const [myProfile, setMyProfile] = useState(DEFAULT_PROFILE);
  const [hasProfile, setHasProfile] = useState(false);
  const [showGuide, setShowGuide] = useState(false); // Modal คู่มือการใช้งาน

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

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Effects ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // บังคับยืนยันอีเมล
      if (currentUser && !currentUser.emailVerified) {
        setUser(null);
      } else {
        setUser(currentUser);
      }
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
    }, error => console.error(error));

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
        setGroupRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubProfiles(); unsubMatches(); unsubGroups(); };
  }, [user]);

  useEffect(() => {
    if (!user) { setLocalSwiped([]); return; }
    const unsub = onSnapshot(doc(db, 'user_private', user.uid), snapshot => {
      const data = snapshot.exists() ? snapshot.data() : {};
      const swiped = data.swiped || [];
      setLocalSwiped(swiped);
      setMyProfile(prev => ({ ...prev, swiped, schedule: data.schedule || [] }));
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
      setDoc(doc(db, 'matches', currentChatId), { [`unread_${user.uid}`]: 0 }, { merge: true }).catch(() => {});
    }
  }, [currentChatId, activeChatType, user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeChatType]);

  // --- Auth Handlers (รวมระบบใหม่) ---
  const handleAuth = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.endsWith('@tu.ac.th') && !cleanEmail.endsWith('@mail.tu.ac.th')) {
      alert('กรุณาใช้อีเมลมหาวิทยาลัยธรรมศาสตร์เท่านั้นเมี๊ยว! 🐾');
      return;
    }

    try {
      if (isLoginMode) {
        const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        if (!userCred.user.emailVerified) {
          alert('กรุณาตรวจสอบตู้จดหมายอีเมลของคุณ และกดลิงก์ยืนยันตัวตนก่อนเข้าใช้งานเมี๊ยว! 📩');
          await signOut(auth);
          return;
        }
      } else {
        if (!regFaculty.trim() || !regAddress.trim()) {
          alert('กรุณากรอกชื่อคณะและแถวที่อยู่ให้ชัดเจนด้วยเมี๊ยว! 📝');
          return;
        }

        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const newUser = userCred.user;

        // บันทึกข้อมูลตั้งต้นตอนสมัครลง Firestore
        await setDoc(doc(db, 'users', newUser.uid), {
          uid: newUser.uid,
          email: cleanEmail,
          name: 'เพื่อนใหม่ มธ.',
          faculty: regFaculty.trim(),
          location: regAddress.trim(),
          bio: 'ทักมาคุยกันได้นะ เมี๊ยว~ 🐾',
          img: CAT_MASCOT,
          tags: 'หาเพื่อน',
          createdAt: serverTimestamp()
        });

        await setDoc(doc(db, 'user_private', newUser.uid), { swiped: [], schedule: [] });

        await sendEmailVerification(newUser);
        alert('สร้างบัญชีสำเร็จ! ระบบได้ส่งลิงก์ยืนยันไปที่อีเมล มธ. ของคุณแล้ว กรุณาเข้าไปกดยืนยันตัวตนก่อนเข้าใช้งานเมี๊ยว 📩🐾');
        
        await signOut(auth);
        setIsLoginMode(true);
        setEmail(''); setPassword(''); setRegFaculty(''); setRegAddress('');
      }
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
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
    } catch (err) { alert('บันทึกโปรไฟล์ไม่สำเร็จ'); }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmDelete = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี? ข้อมูลทั้งหมดจะถูกลบอย่างถาวร 😿");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'user_private', user.uid));
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      alert('ลบบัญชีของคุณเรียบร้อยแล้ว ลาก่อนเมี๊ยว 🐾');
    } catch (err) {
      alert('กรุณา "ออกจากระบบ" แล้ว "เข้าสู่ระบบใหม่" อีกครั้งก่อนกดลบบัญชีเพื่อยืนยันตัวตนครับ');
    }
  };

  const handleSwipe = async (targetUid, isLike) => {
    if (!user || !targetUid || targetUid === user.uid) return;
    try {
      setLocalSwiped(prev => prev.includes(targetUid) ? prev : [...prev, targetUid]);
      await setDoc(doc(db, 'user_private', user.uid), { swiped: arrayUnion(targetUid) }, { merge: true });

      if (isLike) {
        const matchRef = await addDoc(collection(db, 'matches'), { participants: [user.uid, targetUid], matchedAt: serverTimestamp() });
        setCurrentChatId(matchRef.id);
        setActiveChatType('private');
        setActiveTab('chat');
      }
    } catch (err) {
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
        await setDoc(doc(db, 'matches', currentChatId), { 
          lastUpdated: serverTimestamp(), lastSender: user.uid, [`unread_${targetUid}`]: (currentMatch[`unread_${targetUid}`] || 0) + 1
        }, { merge: true });
      }
    } else {
      await setDoc(doc(db, 'group_chats', currentChatId), { lastUpdated: serverTimestamp(), lastSender: user.uid }, { merge: true });
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
        alert('เพิ่มนัดหมายแล้ว 📅');
    } catch (err) { alert('เพิ่มนัดหมายไม่สำเร็จ'); }
  };

  const createGroupRoom = async () => {
    const roomName = newRoomName.trim();
    if (!user || !roomName) return alert('กรุณากรอกชื่อห้อง');
    try {
      const roomRef = await addDoc(collection(db, 'group_chats'), { room_name: roomName, createdBy: user.uid, members: [user.uid], createdAt: serverTimestamp() });
      setNewRoomName(''); setCurrentChatId(roomRef.id); setActiveChatType('group_chat');
    } catch (err) { alert('สร้างห้องไม่สำเร็จ'); }
  };

  const generateCategoryQuestion = (category) => {
    const pool = ICEBREAKERS_BY_CATEGORY[category] || ICEBREAKERS_BY_CATEGORY.food;
    let text = pool[Math.floor(Math.random() * pool.length)];
    if (catVibe === 'polite') text += " ครับ/ค่ะ 😊";
    else if (catVibe === 'cat') text = text.replace("เหรอ", "ป่ะเมี๊ยว").replace("มั้ย", "รึเปล่าเมี๊ยว") + " 😼🐾";
    setAiSuggestion(text);
    setQuestDone(prev => ({ ...prev, practice: true }));
  };

  // UI หน้าแจ้งเตือนและคู่มือ (Guide Modal)
  const GuideModal = () => (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] p-6 border-4 border-black max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[85vh] overflow-y-auto">
        <h2 className="text-2xl font-black mb-4 flex items-center gap-2">📖 คู่มือ TINNTUU</h2>
        <ul className="text-xs space-y-3 font-bold text-slate-700">
           <li className="bg-slate-50 p-2 rounded-xl border-2 border-black"><b>1. การเข้าระบบ:</b> ใช้อีเมล @tu.ac.th เท่านั้น และต้องกดยืนยันในกล่องจดหมายอีเมลก่อนเข้าใช้งาน</li>
           <li className="bg-slate-50 p-2 rounded-xl border-2 border-black"><b>2. หาเพื่อน:</b> ปัดถูกใจ (Match) หรือข้ามเพื่อนที่ระบบแนะนำได้</li>
           <li className="bg-slate-50 p-2 rounded-xl border-2 border-black"><b>3. ระบบแชท:</b> เมื่อใจตรงกันสามารถแชทส่วนตัว หรือจะไปจอยห้องคุยกลุ่มก็ได้</li>
           <li className="bg-slate-50 p-2 rounded-xl border-2 border-black"><b>4. บอทฝึกคุย:</b> บอทแมวพร้อมชงประโยคชวนคุยแก้เขินในแท็บไมค์</li>
        </ul>
        
        <div className="mt-5 pt-4 border-t-2 border-black bg-amber-50 p-3 rounded-2xl">
          <p className="font-black text-sm mb-2 text-[#FF4500]">🛠 พบปัญหาการใช้งาน ติดต่อแอดมิน:</p>
          <p className="text-xs font-bold">📧 อีเมล: Anchayanit.poo@dome.ac.th</p>
          <p className="text-xs font-bold">📞 โทร: 0979981570</p>
          <p className="text-xs font-bold text-green-600">💬 LINE: @tinntuu_support</p>
        </div>
        <button onClick={() => setShowGuide(false)} className="mt-5 w-full bg-[#FF4500] text-white py-3 rounded-full font-black text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
          เข้าใจแล้วเมี๊ยว 🐾
        </button>
      </div>
    </div>
  );

  if (authLoading) return <div className="min-h-screen flex items-center justify-center font-bold">กำลังโหลด...</div>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gradient-to-br from-[#E63946] via-[#FF4500] to-[#FF7043] flex flex-col justify-center items-center p-6 relative overflow-hidden">
        {showGuide && <GuideModal />}
        <div className="bg-white/95 backdrop-blur-md w-full rounded-[3rem] p-8 shadow-2xl border-4 border-black relative z-10">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-black text-black tracking-tight">TINNTUU 🐾</h1>
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-100 border-2 border-black px-5 py-3 rounded-2xl font-bold" placeholder="อีเมล (@tu.ac.th / @mail.tu.ac.th)" required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-100 border-2 border-black px-5 py-3 rounded-2xl font-bold" placeholder="รหัสผ่าน" required />
            
            {/* ช่องกรอกเพิ่มเติมสำหรับการสมัครสมาชิก */}
            {!isLoginMode && (
              <div className="space-y-3 pt-2 border-t-2 border-slate-200">
                <div>
                  <input type="text" value={regFaculty} onChange={e => setRegFaculty(e.target.value)} className="w-full bg-orange-50 border-2 border-black px-5 py-3 rounded-2xl font-bold" placeholder="ชื่อคณะ (เช่น นิติศาสตร์, SIIT)" required />
                  <p className="text-[10px] text-slate-500 font-bold ml-2 mt-1">* กรอกให้ชัดเจน เพื่อให้เพื่อนร่วมคณะหาง่ายขึ้น</p>
                </div>
                <div>
                  <input type="text" value={regAddress} onChange={e => setRegAddress(e.target.value)} className="w-full bg-orange-50 border-2 border-black px-5 py-3 rounded-2xl font-bold" placeholder="ที่พักปัจจุบัน (เช่น หอ JPark, เชียงราก)" required />
                  <p className="text-[10px] text-slate-500 font-bold ml-2 mt-1">* กรอกพิกัดคร่าวๆ เพื่อหาเพื่อนอยู่โซนเดียวกัน</p>
                </div>
              </div>
            )}

            <button type="submit" className="w-full bg-[#FF4500] text-white font-black py-4 rounded-3xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mt-4">
              {isLoginMode ? 'เข้าสู่ระบบ 🐾' : 'สร้างบัญชีทาสแมว 🐈'}
            </button>
          </form>

          <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full text-center text-xs font-extrabold mt-5 underline text-slate-700">
            {isLoginMode ? 'ยังไม่มีบัญชี? สมัครที่นี่เมี๊ยว 🐾' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </button>

          {/* ปุ่มคู่มือและแจ้งปัญหาด้านล่าง */}
          <div className="mt-8 pt-4 border-t-2 border-slate-200 text-center">
             <button onClick={() => setShowGuide(true)} className="bg-slate-100 px-4 py-2 rounded-full font-black text-xs border-2 border-black shadow-sm flex items-center justify-center mx-auto gap-2">
                📖 คู่มือการใช้งาน & ติดต่อแจ้งปัญหา
             </button>
          </div>
        </div>
      </div>
    );
  }

  // ตัวแปรค้นหาเพื่อน
  const uniqueMatches = Array.from(new Set(matches.map(m => m.participants.find(uid => uid !== user.uid))));
  const filteredMatches = uniqueMatches.filter(otherUid => {
    const otherProfile = allProfiles.find(p => p.uid === otherUid);
    if (!otherProfile) return false;
    const q = chatSearchQuery.toLowerCase();
    return otherProfile.name.toLowerCase().includes(q) || (otherProfile.faculty && otherProfile.faculty.toLowerCase().includes(q));
  });

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gradient-to-br from-[#E63946] via-[#FF4500] to-[#FF7043] flex flex-col font-sans pb-[90px] relative text-slate-900">
      {showGuide && <GuideModal />}
      
      <header className="px-6 py-4 flex justify-between items-center sticky top-0 z-50 bg-gradient-to-r from-[#E63946] to-[#FF4500] border-b-2 border-black/20 shadow-md">
        <h1 className="text-2xl font-black text-white">TINNTUU <span className="text-xl">😼</span></h1>
        <button onClick={() => setShowGuide(true)} className="bg-amber-300 text-black px-3 py-1.5 rounded-full text-[10px] font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          📖 คู่มือ / แจ้งปัญหา
        </button>
      </header>

      {/* Tabs เนื้อหาหลัก... (โค้ดส่วน Swipe, Schedule, Chat, Practice คงเดิมทั้งหมด) */}
      <main className="flex-1 overflow-y-auto px-4 pt-4">
        {/* แท็บโปรไฟล์ */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-[3rem] p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] pb-8">
            <div className="text-center mb-6 border-b-2 border-black pb-6">
              <div className="relative w-28 h-28 mx-auto mb-3">
                <div className="w-full h-full bg-amber-100 rounded-3xl overflow-hidden border-2 border-black">
                  <img src={myProfile.img || CAT_MASCOT} className="w-full h-full object-cover" alt="Profile" />
                </div>
                <button type="button" onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 bg-[#FF4500] text-white w-8 h-8 rounded-full border-2 border-black font-black text-xs">📷</button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageFileChange} accept="image/*" className="hidden" />
              <h2 className="text-2xl font-black text-black">{myProfile.name || 'ชื่อของคุณ'}</h2>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3.5 text-xs font-black">
                <label className="text-[10px] text-slate-500 -mb-2 ml-2 font-bold">ชื่อเล่น</label>
                <input type="text" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full bg-slate-50 border-2 border-black px-4 py-3 rounded-2xl outline-none" required />
                
                <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 font-bold ml-1 mb-1 block">คณะ</label>
                      <input type="text" value={myProfile.faculty} onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} className="w-full bg-slate-50 border-2 border-black px-4 py-3 rounded-2xl outline-none" placeholder="เช่น วิทยาศาสตร์" required />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 font-bold ml-1 mb-1 block">ที่พัก/โซน</label>
                      <input type="text" value={myProfile.location} onChange={e => setMyProfile({...myProfile, location: e.target.value})} className="w-full bg-slate-50 border-2 border-black px-4 py-3 rounded-2xl outline-none" placeholder="เช่น เชียงราก" required />
                    </div>
                </div>
                <textarea value={myProfile.bio} onChange={e => setMyProfile({...myProfile, bio: e.target.value})} rows={2} className="w-full bg-slate-50 border-2 border-black px-4 py-3 rounded-2xl outline-none resize-none" placeholder="Bio สั้นๆ" />
                
                <button type="submit" className="bg-[#FF4500] text-white border-2 border-black py-3.5 rounded-full font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-3">บันทึกตัวตน 🐾</button>
                <button type="button" onClick={() => setShowGuide(true)} className="bg-amber-100 text-black border-2 border-black py-3.5 rounded-full font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">📖 ดูคู่มือ / ติดต่อแอดมินแจ้งปัญหา</button>
                <button type="button" onClick={() => signOut(auth)} className="bg-slate-200 text-black border-2 border-black py-3.5 rounded-full font-black text-xs mt-4">ออกจากระบบ</button>
                <button type="button" onClick={handleDeleteAccount} className="bg-red-50 text-red-600 border-2 border-red-300 py-3 rounded-full font-bold text-xs mt-1">ลบบัญชีผู้ใช้</button>
            </form>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-3 inset-x-0 max-w-md mx-auto px-4 z-50">
        <nav className="bg-white rounded-full border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between p-1.5">
          {[
            { id: 'swipe', icon: '🐾', label: 'หาเพื่อน' },
            { id: 'schedule', icon: '📅', label: 'นัดหมาย' },
            { id: 'chat', icon: '💬', label: 'แชท' },
            { id: 'practice', icon: '🎙️', label: 'ฝึกคุย' },
            { id: 'profile', icon: '👤', label: 'โปรไฟล์' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center justify-center py-2 rounded-full border-2 transition-all ${activeTab === tab.id ? 'bg-[#FF4500] text-white border-black' : 'border-transparent text-slate-500'}`}>
              <span className="text-base leading-none mb-0.5">{tab.icon}</span>
              <span className="text-[8px] font-black">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
