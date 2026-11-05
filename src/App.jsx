import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, limit, serverTimestamp, setDoc, doc,
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

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

// Enable Offline Cache Persistence
enableIndexedDbPersistence(db).catch(() => {});

export default function App() {
  const [activeTab, setActiveTab] = useState('swipe');
  const [user, setUser] = useState(null);
  
  // Real-time Firestore States
  const [allProfiles, setAllProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [activeChannel, setActiveChannel] = useState('global');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  
  // Start Points at 0 strictly
  const [points, setPoints] = useState(0);

  // Daily Check-in Lock
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [hasSwipeMissionDone, setHasSwipeMissionDone] = useState(false);

  // Profile State
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

  // 1. Anonymous Auth
  useEffect(() => {
    signInAnonymously(auth)
      .then(res => setUser(res.user))
      .catch(err => console.error("Auth error:", err));

    const today = new Date().toDateString();
    if (localStorage.getItem('last_checkin_date') === today) {
      setHasCheckedInToday(true);
    }
  }, []);

  // 2. Fetch Profiles from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProfiles(profiles);
      
      const myDoc = profiles.find(p => p.uid === user.uid);
      if (myDoc) {
        setMyProfile(myDoc);
        setHasProfile(true);
      }
    }, (err) => console.error("Fetch profiles error:", err));
    return () => unsubscribe();
  }, [user]);

  // 3. Fetch Real-time Multi-Channel Chat
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

  // Voice Call Timer
  useEffect(() => {
    let interval;
    if (isCalling) {
      interval = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  // Daily Check-in Lock (Strict 1 per day)
  const handleDailyCheckin = () => {
    const today = new Date().toDateString();
    if (hasCheckedInToday) {
      alert('คุณรับแต้มเช็กอินของวันนี้ไปแล้วครับ!');
      return;
    }
    localStorage.setItem('last_checkin_date', today);
    setHasCheckedInToday(true);
    setPoints(p => p + 30);
    alert('เช็กอินสำเร็จ! รับ 30 TinnCoins');
  };

  // Image Upload
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

  // Save Profile & Auto-Switch
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
      alert('สร้างตัวตนสำเร็จ! ข้อมูลของคุณบันทึกลงระบบ Firebase เรียบร้อย');
      setActiveTab('swipe');
    } catch (err) {
      console.error("Save profile error:", err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // Send Chat Message
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const currentText = inputText;
    setInputText('');

    try {
      await addDoc(collection(db, `chat_${activeChannel}`), {
        text: currentText,
        senderName: myProfile.name || 'นักศึกษา มธ.',
        senderId: user ? user.uid : 'anonymous',
        createdAt: serverTimestamp()
      });

      // Auto reply simulation
      setTimeout(async () => {
        const friendReplies = [
          "ยินดีที่ได้รู้จักน้าาา!",
          "วันนี้เรียนตึก SC โดดแดดร้อนมากเลย 555",
          "เย็นนี้มีใครไปกินชาบูตรงเชียงรากบ้าง?",
          "ทักทายครับๆ หาเพื่อนติวสอบมิดเทอมอยู่พอดีเลย",
          "เราก็อยู่หอเชียงรากเหมือนกัน!"
        ];
        const randomReply = friendReplies[Math.floor(Math.random() * friendReplies.length)];
        const friendNames = ["ข้าวฟ่าง ศิลปศาสตร์", "เคน SIIT", "มิ้นท์ BBA", "พีร์ วิศวะ"];
        const randomName = friendNames[Math.floor(Math.random() * friendNames.length)];

        await addDoc(collection(db, `chat_${activeChannel}`), {
          text: randomReply,
          senderName: randomName,
          senderId: 'simulated_friend',
          createdAt: serverTimestamp()
        });
      }, 3000);

    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const generateAiNextQuestion = () => {
    const questions = [
      "มิดเทอมนี้อ่านหนังสือแถวตึก SC หรืออ่านที่หอพักมากกว่ากันครับ?",
      "เมนูเด็ดที่สั่งกินเป็นประจำตรงเชียงรากคือเมนูไหนครับ?",
      "ปกติเดินทางใน มธ. ชอบนั่งรถ EV สายไหนมากที่สุด?",
      "เสาร์-อาทิตย์นี้ มีแพลนไปคาเฟ่หรือกลับบ้านครับ?"
    ];
    setAiSuggestion(questions[Math.floor(Math.random() * questions.length)]);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gradient-to-b from-orange-100 via-pink-50 to-red-100 flex flex-col justify-between font-sans text-slate-800 pb-20 shadow-2xl border-x border-orange-200">
      
      {/* Top Bar - Bright Vivid Colors */}
      <header className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white px-5 py-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div>
          <h1 className="text-2xl font-black tracking-wider flex items-center gap-1.5">
            TinnTuu <span className="text-[10px] bg-yellow-400 text-red-900 px-2 py-0.5 rounded-full font-extrabold uppercase shadow-sm">มธ.</span>
          </h1>
          <p className="text-[10px] text-orange-100 font-semibold">TU Match & Chat Community</p>
        </div>
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 text-red-950 px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1 shadow-md border border-amber-200">
          <span>🪙</span> {points} แต้ม
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 flex-1 flex flex-col">
        
        {/* TAB 1: SWIPE & MATCH */}
        {activeTab === 'swipe' && (
          <div className="flex-1 flex flex-col justify-center items-center">
            {allProfiles.length > 0 && profileIndex < allProfiles.length ? (
              <div className="w-full bg-white rounded-3xl border-2 border-orange-200 shadow-2xl overflow-hidden flex flex-col relative">
                <div className="relative h-[410px] bg-slate-100">
                  <img 
                    src={allProfiles[profileIndex].img} 
                    alt="profile" 
                    className="w-full h-full object-cover" 
                  />
                  
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-500 to-red-600 text-white text-[11px] px-3.5 py-1 rounded-full font-extrabold shadow-md border border-white/30">
                    📍 {allProfiles[profileIndex].location || 'ธรรมศาสตร์ รังสิต'}
                  </div>

                  {/* Profile Info Overlay */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-5 text-white pt-16">
                    <div className="flex justify-between items-end">
                      <div>
                        <h2 className="text-2xl font-black text-amber-300 drop-shadow">{allProfiles[profileIndex].name}</h2>
                        <p className="text-xs text-slate-100 mt-1 leading-relaxed line-clamp-2 font-medium">{allProfiles[profileIndex].bio}</p>
                      </div>
                      <span className="bg-gradient-to-r from-pink-500 to-red-600 text-white font-black text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg border border-white/20">
                        {allProfiles[profileIndex].faculty}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {Array.isArray(allProfiles[profileIndex].tags) && allProfiles[profileIndex].tags.map((tag, idx) => (
                        <span key={idx} className="bg-amber-400/30 backdrop-blur-md text-amber-200 text-[10px] px-2.5 py-0.5 rounded-md font-bold border border-amber-300/40">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Match Swipe Action Buttons */}
                <div className="p-4 bg-white flex gap-3">
                  <button onClick={() => setProfileIndex(p => p + 1)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-200 transition active:scale-95 shadow-sm">
                    ข้าม ✖️
                  </button>
                  <button onClick={() => { alert(`🎉 แมตช์สำเร็จ! คุณได้ส่งสัญญาณถูกใจหา ${allProfiles[profileIndex].name} แล้ว`); setProfileIndex(p => p + 1); }} className="flex-1 py-3.5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-red-500/40 hover:opacity-95 transition active:scale-95">
                    ถูกใจแมตช์คุย ❤️
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white w-full rounded-3xl border-2 border-orange-200 p-8 shadow-xl">
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center text-3xl mx-auto mb-3 font-bold shadow-lg">
                  🐱
                </div>
                <h3 className="text-base font-black text-slate-800">ยังไม่มีตัวตนอื่นให้ปัดแมตช์</h3>
                <p className="text-xs text-slate-400 mt-1">สร้างตัวตนของคุณเพื่อเป็นโปรไฟล์แรกให้เพื่อนปัดหา!</p>
                <button onClick={() => setActiveTab('profile')} className="mt-5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white px-7 py-3 rounded-2xl text-xs font-black shadow-lg shadow-orange-500/40 active:scale-95">
                  {hasProfile ? 'แก้ไขตัวตนของคุณ' : 'ไปสร้างตัวตนเลย 👤'}
                </button>
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
                  <h2 className="text-lg font-black text-slate-900">👤 สร้างตัวตนของคุณ</h2>
                  <p className="text-xs text-slate-400">รูปภาพและข้อมูลจะถูกบันทึกขึ้นระบบจริง</p>
                </div>
                {hasProfile && (
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full border border-green-300 shadow-sm">
                    ✓ มีโปรไฟล์แล้ว
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
                {/* Image Upload Avatar */}
                <div className="flex flex-col items-center justify-center mb-2">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-orange-500 shadow-xl mb-2 bg-slate-50 relative">
                    <img src={myProfile.img} alt="preview" className="w-full h-full object-cover" />
                  </div>
                  <label className="text-white bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 hover:opacity-95 px-4 py-1.5 rounded-full font-bold text-[11px] cursor-pointer transition shadow-md">
                    📷 เลือกรูปโปรไฟล์จากเครื่อง
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">ชื่อ / ชื่อเล่น *</label>
                  <input 
                    type="text" 
                    value={myProfile.name} 
                    onChange={e => setMyProfile({...myProfile, name: e.target.value})} 
                    placeholder="เช่น ข้าวฟ่าง, เคน SIIT" 
                    className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-semibold" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">คณะ</label>
                    <input 
                      type="text" 
                      value={myProfile.faculty} 
                      onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} 
                      placeholder="ศิลปศาสตร์" 
                      className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500" 
                    />
                  </div>
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">หอพัก / โซน</label>
                    <input 
                      type="text" 
                      value={myProfile.location} 
                      onChange={e => setMyProfile({...myProfile, location: e.target.value})} 
                      placeholder="หอเชียงราก" 
                      className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">คำอธิบายตัวตน (Bio)</label>
                  <textarea 
                    value={myProfile.bio} 
                    onChange={e => setMyProfile({...myProfile, bio: e.target.value})} 
                    placeholder="ชวนไปกินข้าว ทักมาคุย หรือหาเพื่อนติว..." 
                    rows={2}
                    className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500" 
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">แท็กไลฟ์สไตล์ (คั่นด้วย ,)</label>
                  <input 
                    type="text" 
                    value={Array.isArray(myProfile.tags) ? myProfile.tags.join(', ') : myProfile.tags} 
                    onChange={e => setMyProfile({...myProfile, tags: e.target.value})} 
                    placeholder="เด็กหอ, สายคาเฟ่, บอร์ดเกม" 
                    className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500" 
                  />
                </div>

                <button type="submit" className="w-full mt-2 py-3.5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white font-black rounded-2xl shadow-lg shadow-orange-500/30 hover:opacity-95 transition active:scale-95 text-xs">
                  บันทึกตัวตนแล้วเริ่มเล่นเลย ✨
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
              <p className="text-xs text-slate-400 mb-4">ซ้อมบทสนทนาและทดสอบการพูดคุยแบบเสียง</p>

              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                <button onClick={() => setSelectedScenario('ev_bus')} className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedScenario === 'ev_bus' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>🚌 บนรถ EV</button>
                <button onClick={() => setSelectedScenario('chiangrak')} className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedScenario === 'chiangrak' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>🍲 ร้านชาบูเชียงราก</button>
                <button onClick={() => setSelectedScenario('study')} className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedScenario === 'study' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>📚 โต๊ะติวตึก SC</button>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-4 text-xs text-slate-700 leading-relaxed font-medium">
                {selectedScenario === 'ev_bus' && <p><strong>สถานการณ์:</strong> นั่งบนรถ EV ข้างเพื่อนที่ไม่รู้จัก อยากเริ่มทักทายแก้เขิน</p>}
                {selectedScenario === 'chiangrak' && <p><strong>สถานการณ์:</strong> อยากหาเพื่อนร่วมโต๊ะหารค่าชาบู/อาหารเย็นย่านเชียงราก</p>}
                {selectedScenario === 'study' && <p><strong>สถานการณ์:</strong> ต้องการชวนเพื่อนกลุ่มวิชาเดียวกันตั้งกลุ่มติวสอบมิดเทอม</p>}
              </div>

              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-3">
                <span className="text-[11px] font-black text-red-600 block mb-1">💡 คำถามแนะนำสำหรับชวนคุย</span>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                  {aiSuggestion || 'กดปุ่มด้านล่างเพื่อสุ่มประโยคชวนคุย'}
                </p>
              </div>

              <button onClick={generateAiNextQuestion} className="w-full py-3 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white font-extrabold rounded-2xl text-xs shadow-md mb-4 active:scale-95 transition">
                สุ่มหัวข้อคำถามถัดไป
              </button>
            </div>

            {/* Voice Streaming Call Simulator */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl text-center shadow-xl border border-indigo-900">
              <h4 className="text-xs font-extrabold mb-1 text-amber-300">🎙️ ระบบคอลเสียง Real-time (Voice Call)</h4>
              <p className="text-[10px] text-slate-400 mb-3">ทดสอบพูดคุยแบบเสียงสตรีมมิ่งสด</p>
              
              {isCalling ? (
                <div className="space-y-2">
                  <div className="text-red-400 font-mono text-xs font-black animate-pulse">
                    🔴 กำลังคอลสายเสียง... ({Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')})
                  </div>
                  <button onClick={() => setIsCalling(false)} className="bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md">
                    วางสาย 🛑
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsCalling(true)} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-lg active:scale-95 transition">
                  📞 เริ่มเปิดคอลสายเสียง
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MULTI-CHANNEL CHAT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-white rounded-3xl border-2 border-orange-200 shadow-2xl h-[480px] overflow-hidden">
            <div className="p-2.5 bg-orange-100/60 border-b border-orange-200 flex justify-around text-xs font-extrabold">
              <button onClick={() => setActiveChannel('global')} className={`px-3.5 py-1.5 rounded-xl transition ${activeChannel === 'global' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md' : 'text-slate-600'}`}>💬 ห้องรวม</button>
              <button onClick={() => setActiveChannel('chiangrak')} className={`px-3.5 py-1.5 rounded-xl transition ${activeChannel === 'chiangrak' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md' : 'text-slate-600'}`}>🍲 เชียงราก</button>
              <button onClick={() => setActiveChannel('study')} className={`px-3.5 py-1.5 rounded-xl transition ${activeChannel === 'study' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md' : 'text-slate-600'}`}>📚 ห้องติว</button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              {messages.map((m) => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] font-bold text-slate-400 mb-0.5 px-1">{m.senderName || 'นักศึกษา มธ.'}</span>
                    <div className={`p-3 rounded-2xl text-xs max-w-[80%] shadow-sm font-medium ${isMe ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-orange-200 flex gap-2">
              <input 
                type="text" 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
                placeholder="พิมพ์ข้อความคุยกับเพื่อนๆ..." 
                className="flex-1 bg-slate-50 text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-medium"
              />
              <button type="submit" className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs px-5 py-3 rounded-xl font-black shadow-md hover:opacity-95 transition">
                ส่ง
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: MISSIONS & VIP 49 BAHT */}
        {activeTab === 'more' && (
          <div className="space-y-4">
            {/* Mission Center */}
            <div className="bg-white p-5 rounded-3xl border-2 border-orange-200 shadow-xl space-y-3">
              <h3 className="font-black text-xs text-slate-900 flex items-center gap-1">🎯 ศูนย์ภารกิจเก็บแต้ม TinnCoins</h3>
              
              {/* Mission 1 */}
              <div className="flex justify-between items-center bg-orange-50 p-3 rounded-2xl border border-orange-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">1. เช็กอินประจำวัน</h4>
                  <p className="text-[10px] text-slate-500">รับ 30 แต้ม (วันละ 1 ครั้ง)</p>
                </div>
                <button 
                  onClick={handleDailyCheckin} 
                  disabled={hasCheckedInToday}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-bold shadow-sm transition ${hasCheckedInToday ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-red-600 text-white active:scale-95'}`}
                >
                  {hasCheckedInToday ? 'เช็กอินแล้ว' : 'รับ 30 แต้ม'}
                </button>
              </div>

              {/* Mission 2 */}
              <div className="flex justify-between items-center bg-orange-50 p-3 rounded-2xl border border-orange-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">2. ลองปัดการ์ดหาเพื่อน</h4>
                  <p className="text-[10px] text-slate-500">รับ 20 แต้ม</p>
                </div>
                <button 
                  onClick={() => {
                    if (hasSwipeMissionDone) return alert('ทำภารกิจนี้ไปแล้วครับ');
                    setHasSwipeMissionDone(true);
                    setPoints(p => p + 20);
                    alert('ทำภารกิจสำเร็จ! รับ 20 TinnCoins');
                  }} 
                  disabled={hasSwipeMissionDone}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-bold shadow-sm transition ${hasSwipeMissionDone ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-red-600 text-white active:scale-95'}`}
                >
                  {hasSwipeMissionDone ? 'สำเร็จแล้ว' : 'รับ 20 แต้ม'}
                </button>
              </div>
            </div>

            {/* VIP Subscription 49 Baht */}
            <div className="bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 text-white p-6 rounded-3xl shadow-2xl relative overflow-hidden">
              <span className="text-[10px] font-black text-amber-200 uppercase tracking-widest block mb-1">
                TinnTuu VIP Membership
              </span>
              <h3 className="text-xl font-black">สมาชิกระดับ VIP</h3>
              <p className="text-xs text-orange-100 mt-1">ปลดล็อกฟีเจอร์กรองคณะ หอพัก และดูว่าใครกดถูกใจคุณ</p>

              <div className="my-4 text-xs space-y-2 text-white bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 font-medium">
                <div>• ปัดการ์ดโปรไฟล์เพื่อนได้ไม่จำกัดจำนวน</div>
                <div>• เข้าถึงห้องแชทเสียงคุณภาพสูง</div>
                <div>• ตราสัญลักษณ์มงกุฎ VIP ข้างชื่อ</div>
              </div>

              <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/20">
                <div>
                  <span className="text-2xl font-black text-white">49 บาท</span>
                  <span className="text-xs text-orange-100"> / เดือน</span>
                </div>
                <button onClick={() => alert('จำลองการสมัครสมาชิกระดับ VIP 49 บาทสำเร็จ')} className="bg-white text-red-600 px-5 py-2.5 rounded-xl font-black text-xs shadow-lg hover:bg-orange-50 transition">
                  สมัคร VIP 49.-
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white/95 backdrop-blur-md border-t border-orange-200 flex justify-around py-3 px-1 z-50 shadow-xl">
        <button onClick={() => setActiveTab('swipe')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'swipe' ? 'text-red-600' : 'text-slate-400'}`}>
          <span className="text-base mb-0.5">🔥</span>
          <span>ปัดเพื่อน</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'profile' ? 'text-red-600' : 'text-slate-400'}`}>
          <span className="text-base mb-0.5">👤</span>
          <span>สร้างตัวตน</span>
        </button>
        <button onClick={() => setActiveTab('practice')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'practice' ? 'text-red-600' : 'text-slate-400'}`}>
          <span className="text-base mb-0.5">🗣️</span>
          <span>ฝึกคุย</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'chat' ? 'text-red-600' : 'text-slate-400'}`}>
          <span className="text-base mb-0.5">💬</span>
          <span>ห้องแชท</span>
        </button>
        <button onClick={() => setActiveTab('more')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'more' ? 'text-red-600' : 'text-slate-400'}`}>
          <span className="text-base mb-0.5">👑</span>
          <span>VIP/ภารกิจ</span>
        </button>
      </nav>
    </div>
  );
}
