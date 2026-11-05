import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, limit, serverTimestamp, setDoc, doc,
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';

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

// Enable Offline Cache
enableIndexedDbPersistence(db).catch(() => {});

export default function App() {
  // Auth States
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  // App States
  const [activeTab, setActiveTab] = useState('swipe');
  const [allProfiles, setAllProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  
  // Chat States
  const [activeChannel, setActiveChannel] = useState('global');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // Profile Form States
  const [myProfile, setMyProfile] = useState({
    name: '',
    faculty: 'ศิลปศาสตร์',
    location: 'หอพักเชียงราก',
    bio: '',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    tags: 'เด็กหอ, สายคาเฟ่'
  });
  const [hasProfile, setHasProfile] = useState(false);

  // Practice & Voice Room State
  const [selectedScenario, setSelectedScenario] = useState('ev_bus');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callTimer, setCallTimer] = useState(0);

  // 1. Check Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Profiles when logged in
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProfiles(profiles);
      
      const myDoc = profiles.find(p => p.uid === user.uid);
      if (myDoc) {
        setMyProfile(myDoc);
        setHasProfile(true);
      } else {
        setHasProfile(false);
        setActiveTab('profile'); // บังคับผู้ใช้ใหม่เข้าหน้าสร้างโปรไฟล์
      }
    }, (err) => console.error("Fetch profiles error:", err));
    return () => unsubscribe();
  }, [user]);

  // 3. Fetch Real-time Chat
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `chat_${activeChannel}`), 
      orderBy('createdAt', 'desc'), 
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      setMessages(msgs);
    }, (err) => console.error("Fetch chat error:", err));
    return () => unsubscribe();
  }, [user, activeChannel]);

  // Voice Timer
  useEffect(() => {
    let interval;
    if (isCalling) {
      interval = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  // --- AUTHENTICATION HANDLERS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert('กรุณากรอกอีเมลและรหัสผ่าน');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('สมัครสมาชิกสำเร็จ!');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setHasProfile(false);
    } catch (err) {
      console.error(err);
    }
  };

  // --- PROFILE HANDLERS ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMyProfile({ ...myProfile, img: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // 💡 SAVE PROFILE & AUTO-NAVIGATE
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!myProfile.name.trim()) return alert('กรุณากรอกชื่อโปรไฟล์ของคุณ');

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        name: myProfile.name,
        faculty: myProfile.faculty,
        location: myProfile.location,
        bio: myProfile.bio || 'เด็ก มธ. ยินดีที่ได้รู้จักครับ',
        img: myProfile.img,
        tags: typeof myProfile.tags === 'string' ? myProfile.tags.split(',').map(t => t.trim()) : myProfile.tags,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setHasProfile(true);
      setProfileIndex(0); 
      alert('บันทึกแบ็คอัพลง Firebase สำเร็จ! ขอให้สนุกกับการหาเพื่อนครับ 🚀');
      
      // 🔥 หัวใจหลัก: ปิดหน้าสร้างตัวตน แล้วเด้งสลับไปแท็บปัดเพื่อนทันที
      setActiveTab('swipe'); 
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // --- CHAT HANDLER ---
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    const currentText = inputText;
    setInputText('');
    try {
      await addDoc(collection(db, `chat_${activeChannel}`), {
        text: currentText,
        senderName: myProfile.name || 'เพื่อน มธ.',
        senderId: user ? user.uid : 'anonymous',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const generateAiNextQuestion = () => {
    const questions = [
      "มิดเทอมนี้อ่านหนังสือแถวตึก SC หรืออ่านที่หอพักมากกว่ากันครับ?",
      "เมนูเด็ดที่สั่งกินเป็นประจำตรงเชียงรากคือเมนูไหนครับ?",
      "ปกติเดินทางใน มธ. ชอบนั่งรถ EV สายไหนมากที่สุด?"
    ];
    setAiSuggestion(questions[Math.floor(Math.random() * questions.length)]);
  };

  // ดึงโปรไฟล์คนอื่นมาให้ปัด (ไม่ปัดเจอตัวเอง)
  const othersProfiles = allProfiles.filter(p => p.uid !== user?.uid);

  // --- RENDER LOGIN SCREEN ---
  if (authLoading) return <div className="flex justify-center items-center h-screen bg-orange-50 font-bold text-orange-500">กำลังโหลดระบบ...</div>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 flex flex-col justify-center items-center p-6 text-white font-sans">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl w-full shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black mb-2">TinnTuu <span className="text-sm bg-yellow-400 text-red-900 px-2 py-0.5 rounded-full uppercase">มธ.</span></h1>
            <p className="text-xs text-orange-100 font-medium">เข้าสู่ระบบเพื่อหาเพื่อน และแชทกับเด็ก มธ.</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-orange-100 uppercase tracking-widest mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/20 border border-white/30 px-4 py-3 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-white" placeholder="อีเมลของคุณ" required />
            </div>
            <div>
              <label className="text-[11px] font-bold text-orange-100 uppercase tracking-widest mb-1 block">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/20 border border-white/30 px-4 py-3 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-white" placeholder="รหัสผ่าน" required />
            </div>
            <button type="submit" className="w-full bg-white text-red-600 font-black py-3.5 rounded-xl shadow-lg hover:bg-orange-50 transition active:scale-95 mt-4">
              {isLoginMode ? 'เข้าสู่ระบบ 🚀' : 'สมัครสมาชิกใหม่ ✨'}
            </button>
          </form>

          <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full text-center text-xs text-white/80 font-semibold mt-6 underline">
            {isLoginMode ? 'ยังไม่มีบัญชีใช่ไหม? สมัครสมาชิก' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN APP ---
  return (
    <div className="max-w-md mx-auto min-h-screen bg-gradient-to-b from-orange-100 via-pink-50 to-red-100 flex flex-col justify-between font-sans text-slate-800 pb-20 shadow-2xl border-x border-orange-200">
      
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white px-5 py-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div>
          <h1 className="text-2xl font-black tracking-wider flex items-center gap-1.5">
            TinnTuu <span className="text-[10px] bg-yellow-400 text-red-900 px-2 py-0.5 rounded-full font-extrabold uppercase shadow-sm">มธ.</span>
          </h1>
          <p className="text-[10px] text-orange-100 font-semibold">ผู้ใช้งาน: {email}</p>
        </div>
      </header>

      {/* Main Body */}
      <main className="p-4 flex-1 flex flex-col">
        
        {/* TAB 1: SWIPE & MATCH */}
        {activeTab === 'swipe' && (
          <div className="flex-1 flex flex-col justify-center items-center">
            {othersProfiles.length > 0 && profileIndex < othersProfiles.length ? (
              <div className="w-full bg-white rounded-3xl border-2 border-orange-200 shadow-2xl overflow-hidden flex flex-col relative">
                <div className="relative h-[410px] bg-slate-100">
                  <img src={othersProfiles[profileIndex].img} alt="profile" className="w-full h-full object-cover" />
                  
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-500 to-red-600 text-white text-[11px] px-3.5 py-1 rounded-full font-extrabold shadow-md border border-white/30">
                    📍 {othersProfiles[profileIndex].location || 'ธรรมศาสตร์ รังสิต'}
                  </div>

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-5 text-white pt-16">
                    <div className="flex justify-between items-end">
                      <div>
                        <h2 className="text-2xl font-black text-amber-300 drop-shadow">{othersProfiles[profileIndex].name}</h2>
                        <p className="text-xs text-slate-100 mt-1 font-medium">{othersProfiles[profileIndex].bio}</p>
                      </div>
                      <span className="bg-gradient-to-r from-pink-500 to-red-600 text-white font-black text-[10px] px-3 py-1.5 rounded-full shadow-lg">
                        {othersProfiles[profileIndex].faculty}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white flex gap-3">
                  <button onClick={() => setProfileIndex(p => p + 1)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-200 active:scale-95 shadow-sm">
                    ข้าม ✖️
                  </button>
                  <button onClick={() => { alert(`🎉 แจ้งเตือน! คุณส่งถูกใจไปหา ${othersProfiles[profileIndex].name} แล้ว`); setProfileIndex(p => p + 1); }} className="flex-1 py-3.5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white rounded-2xl font-black text-xs shadow-lg active:scale-95">
                    ถูกใจเพื่อน มธ. ❤️
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white w-full rounded-3xl border-2 border-orange-200 p-8 shadow-xl">
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center text-3xl mx-auto mb-3 font-bold shadow-lg">🐱</div>
                <h3 className="text-base font-black text-slate-800">ยังไม่มีเพื่อนคนอื่นในระบบ</h3>
                <p className="text-xs text-slate-400 mt-1">ชวนเพื่อนๆ มธ. มาเล่นกันเยอะๆ นะครับ</p>
                <button onClick={() => setProfileIndex(0)} className="mt-5 bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl text-xs font-bold active:scale-95">วนดูโปรไฟล์ใหม่ 🔄</button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREATE PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 border-2 border-orange-200 shadow-2xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">👤 {hasProfile ? 'โปรไฟล์ของคุณ' : 'สร้างตัวตนครั้งแรก'}</h2>
                  <p className="text-[11px] text-slate-400">เมื่อบันทึกเสร็จ จะปิดหน้านี้แล้วเด้งไปหน้าปัดเพื่อน</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
                <div className="flex flex-col items-center justify-center mb-2">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-orange-500 shadow-xl mb-2 bg-slate-50 relative">
                    <img src={myProfile.img} alt="preview" className="w-full h-full object-cover" />
                  </div>
                  <label className="text-white bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 hover:opacity-95 px-4 py-1.5 rounded-full font-bold text-[11px] cursor-pointer shadow-md">
                    📷 อัปโหลดรูปภาพตัวตน
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">ชื่อ / ชื่อเล่น *</label>
                  <input type="text" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} placeholder="เช่น ข้าวฟ่าง" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:border-orange-500 font-semibold" required />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">คณะ</label>
                    <input type="text" value={myProfile.faculty} onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} placeholder="ศิลปศาสตร์" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">หอพัก</label>
                    <input type="text" value={myProfile.location} onChange={e => setMyProfile({...myProfile, location: e.target.value})} placeholder="หอเชียงราก" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:border-orange-500" />
                  </div>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">คำอธิบายตัวเอง (Bio)</label>
                  <textarea value={myProfile.bio} onChange={e => setMyProfile({...myProfile, bio: e.target.value})} placeholder="ชวนไปกินข้าว ทักมาคุย..." rows={2} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:border-orange-500" />
                </div>

                <button type="submit" className="w-full mt-2 py-3.5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white font-black rounded-2xl shadow-lg active:scale-95 text-xs">
                  บันทึกตัวตน และไปปัดเพื่อนทันที 🚀
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: PRACTICE & VOICE ROOM */}
        {activeTab === 'practice' && (
          <div className="bg-white rounded-3xl p-6 border-2 border-orange-200 shadow-2xl flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 mb-1">🗣️ ฝึกพูดคุย & Voice Call</h2>
              <p className="text-xs text-slate-400 mb-4">ทดสอบการพูดคุยด้วยเสียงกับเพื่อนร่วมมหาลัย</p>

              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                <button onClick={() => setSelectedScenario('ev_bus')} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${selectedScenario === 'ev_bus' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>🚌 บนรถ EV</button>
                <button onClick={() => setSelectedScenario('chiangrak')} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${selectedScenario === 'chiangrak' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>🍲 ร้านชาบู</button>
              </div>

              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-3">
                <span className="text-[11px] font-black text-red-600 block mb-1">💡 หัวข้อแนะนำสำหรับชวนคุย</span>
                <p className="text-xs text-slate-700 font-semibold">{aiSuggestion || 'กดปุ่มด้านล่างเพื่อสุ่มคำถามชวนคุย'}</p>
              </div>

              <button onClick={generateAiNextQuestion} className="w-full py-3 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white font-extrabold rounded-2xl text-xs shadow-md mb-4 active:scale-95">สุ่มหัวข้อคำถามถัดไป</button>
            </div>

            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl text-center shadow-xl">
              <h4 className="text-xs font-extrabold mb-1 text-amber-300">🎙️ ระบบห้องคอลเสียง</h4>
              <p className="text-[10px] text-slate-400 mb-3">ทดสอบพูดคุยแบบเสียงสตรีมมิ่งสด</p>
              
              {isCalling ? (
                <div className="space-y-2">
                  <div className="text-red-400 font-mono text-xs font-black animate-pulse">🔴 กำลังคอลสาย... ({Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')})</div>
                  <button onClick={() => setIsCalling(false)} className="bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-bold">วางสาย 🛑</button>
                </div>
              ) : (
                <button onClick={() => setIsCalling(true)} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-lg">📞 เริ่มเปิดคอลเสียง</button>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CHAT ROOMS */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-white rounded-3xl border-2 border-orange-200 shadow-2xl h-[480px] overflow-hidden">
            <div className="p-2.5 bg-orange-100/60 border-b border-orange-200 flex justify-around text-xs font-extrabold">
              <button onClick={() => setActiveChannel('global')} className={`px-3.5 py-1.5 rounded-xl ${activeChannel === 'global' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md' : 'text-slate-600'}`}>💬 ห้องรวม</button>
              <button onClick={() => setActiveChannel('chiangrak')} className={`px-3.5 py-1.5 rounded-xl ${activeChannel === 'chiangrak' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md' : 'text-slate-600'}`}>🍲 เชียงราก</button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              {messages.map((m) => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] font-bold text-slate-400 mb-0.5 px-1">{m.senderName || 'เพื่อน มธ.'}</span>
                    <div className={`p-3 rounded-2xl text-xs max-w-[80%] shadow-sm font-medium ${isMe ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>{m.text}</div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-orange-200 flex gap-2">
              <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="พิมพ์ข้อความ..." className="flex-1 bg-slate-50 text-xs px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 font-medium" />
              <button type="submit" className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs px-5 py-3 rounded-xl font-black shadow-md">ส่ง</button>
            </form>
          </div>
        )}

        {/* TAB 5: MORE (LOGOUT INCLUDED) */}
        {activeTab === 'more' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 text-white p-6 rounded-3xl shadow-2xl relative overflow-hidden">
              <span className="text-[10px] font-black text-amber-200 uppercase tracking-widest block mb-1">TinnTuu VIP Membership</span>
              <h3 className="text-xl font-black">สมาชิกระดับ VIP</h3>
              <p className="text-xs text-orange-100 mt-1">ปลดล็อกฟีเจอร์กรองคณะ และห้องแชทเสียงพรีเมียม</p>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/20">
                <div><span className="text-2xl font-black text-white">49 บาท</span><span className="text-xs text-orange-100"> / เดือน</span></div>
                <button onClick={() => alert('จำลองการสมัครสมาชิกระดับ VIP 49 บาทสำเร็จ')} className="bg-white text-red-600 px-5 py-2.5 rounded-xl font-black text-xs shadow-lg">สมัคร VIP 49.-</button>
              </div>
            </div>

            {/* Logout Button */}
            <div className="bg-white p-5 rounded-3xl border-2 border-orange-200 shadow-xl">
              <h3 className="font-black text-xs text-slate-900 mb-3">⚙️ ตั้งค่าบัญชีผู้ใช้</h3>
              <button onClick={handleLogout} className="w-full bg-slate-100 text-red-600 font-black py-3.5 rounded-2xl text-xs active:scale-95 transition border border-red-200">
                ออกจากระบบ (Logout)
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Navigation */}
      {hasProfile && (
        <nav className="fixed bottom-0 max-w-md w-full bg-white/95 backdrop-blur-md border-t border-orange-200 flex justify-around py-3 px-1 z-50 shadow-xl">
          <button onClick={() => setActiveTab('swipe')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'swipe' ? 'text-red-600' : 'text-slate-400'}`}><span className="text-base mb-0.5">🔥</span><span>ปัดเพื่อน</span></button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'profile' ? 'text-red-600' : 'text-slate-400'}`}><span className="text-base mb-0.5">👤</span><span>แก้โปรไฟล์</span></button>
          <button onClick={() => setActiveTab('practice')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'practice' ? 'text-red-600' : 'text-slate-400'}`}><span className="text-base mb-0.5">🗣️</span><span>ฝึกคุย</span></button>
          <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'chat' ? 'text-red-600' : 'text-slate-400'}`}><span className="text-base mb-0.5">💬</span><span>ห้องแชท</span></button>
          <button onClick={() => setActiveTab('more')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'more' ? 'text-red-600' : 'text-slate-400'}`}><span className="text-base mb-0.5">⚙️</span><span>ตั้งค่าบัญชี</span></button>
        </nav>
      )}
    </div>
  );
}
