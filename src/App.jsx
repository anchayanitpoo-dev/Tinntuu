import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, limit, serverTimestamp, setDoc, doc 
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

export default function App() {
  const [activeTab, setActiveTab] = useState('swipe');
  const [user, setUser] = useState(null);
  
  // Real-time Database States
  const [allProfiles, setAllProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [activeChannel, setActiveChannel] = useState('global');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [points, setPoints] = useState(300);

  // My Profile Form State
  const [myProfile, setMyProfile] = useState({
    name: '',
    faculty: 'พาณิชยศาสตร์และการบัญชี',
    location: 'หอพักเชียงราก',
    bio: '',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    tags: 'เด็กหอ, สายคาเฟ่'
  });
  const [hasProfile, setHasProfile] = useState(false);

  // Practice & Voice Simulator
  const [selectedScenario, setSelectedScenario] = useState('ev_bus');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callTimer, setCallTimer] = useState(0);

  // 1. Anonymous Authentication
  useEffect(() => {
    signInAnonymously(auth)
      .then(res => setUser(res.user))
      .catch(err => console.error("Auth error:", err));
  }, []);

  // 2. Fetch Real Profiles from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProfiles(profiles);
      
      // Check if current user already has a saved profile
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

  // Handle Profile Image Upload
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

  // Save Profile & Auto Hide/Switch Page
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
      alert('สร้างตัวตนเรียบร้อย! ข้อมูลของคุณถูกบันทึกลงระบบแล้ว');
      setActiveTab('swipe'); // บันทึกเสร็จจะเด้งไปหน้าปัดเพื่อนทันที!
    } catch (err) {
      console.error("Save profile error:", err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // Send Chat Message
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await addDoc(collection(db, `chat_${activeChannel}`), {
        text: inputText,
        senderName: myProfile.name || 'นักศึกษา มธ.',
        senderId: user ? user.uid : 'anonymous',
        createdAt: serverTimestamp()
      });
      setInputText('');
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const generateAiNextQuestion = () => {
    const questions = [
      "มิดเทอมนี้อ่านหนังสือแถวตึก SC หรือหอพักมากกว่ากันครับ?",
      "เมนูเด็ดที่สั่งกินเป็นประจำตรงเชียงรากคือเมนูไหนครับ?",
      "ปกติเดินทางใน มธ. ชอบนั่งรถ EV สายไหนมากที่สุด?",
      "เสาร์-อาทิตย์นี้ มีแพลนไปคาเฟ่หรือกลับบ้านครับ?"
    ];
    setAiSuggestion(questions[Math.floor(Math.random() * questions.length)]);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800 pb-20 shadow-2xl border-x border-slate-200">
      
      {/* Top Navigation Bar - Clean Minimal Red */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 px-5 py-3.5 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-black tracking-tight text-red-600">TinnTuu</h1>
          <p className="text-[10px] text-slate-400 font-semibold -mt-0.5">TU Student Network</p>
        </div>
        <div className="bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
          <span>🪙</span> {points} แต้ม
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 flex-1 flex flex-col">
        
        {/* TAB 1: SWIPE MATCHING */}
        {activeTab === 'swipe' && (
          <div className="flex-1 flex flex-col justify-center items-center">
            {allProfiles.length > 0 && profileIndex < allProfiles.length ? (
              <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col relative">
                <div className="relative h-96 bg-slate-100">
                  <img 
                    src={allProfiles[profileIndex].img} 
                    alt="profile" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md text-white text-[11px] px-3.5 py-1 rounded-full font-medium border border-white/20">
                    📍 {allProfiles[profileIndex].location || 'ธรรมศาสตร์ รังสิต'}
                  </div>

                  {/* Floating Bio Card */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white pt-12">
                    <div className="flex justify-between items-end">
                      <div>
                        <h2 className="text-2xl font-black">{allProfiles[profileIndex].name}</h2>
                        <p className="text-xs text-slate-200 mt-1 leading-relaxed line-clamp-2">{allProfiles[profileIndex].bio}</p>
                      </div>
                      <span className="bg-red-600 text-white font-bold text-[10px] px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                        {allProfiles[profileIndex].faculty}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {Array.isArray(allProfiles[profileIndex].tags) && allProfiles[profileIndex].tags.map((tag, idx) => (
                        <span key={idx} className="bg-white/20 backdrop-blur-md text-white text-[10px] px-2.5 py-0.5 rounded-md font-medium border border-white/10">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Swipe Action Buttons */}
                <div className="p-4 bg-white flex gap-3">
                  <button onClick={() => setProfileIndex(p => p + 1)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-200 transition active:scale-95">
                    ข้าม
                  </button>
                  <button onClick={() => { alert(`แมตช์สำเร็จ! ทักทาย ${allProfiles[profileIndex].name} แล้ว`); setProfileIndex(p => p + 1); }} className="flex-1 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-red-500/30 hover:opacity-95 transition active:scale-95">
                    ถูกใจโปรไฟล์ ❤️
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white w-full rounded-3xl border border-slate-100 p-8 shadow-sm">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 font-bold">
                  ✨
                </div>
                <h3 className="text-base font-bold text-slate-800">ยังไม่มีโปรไฟล์อื่นในขณะนี้</h3>
                <p className="text-xs text-slate-400 mt-1">กดสร้างตัวตนของคุณ เพื่อเป็นโปรไฟล์แรกให้เพื่อนปัดหา!</p>
                <button onClick={() => setActiveTab('profile')} className="mt-5 bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-md active:scale-95">
                  {hasProfile ? 'แก้ไขตัวตนของคุณ' : 'ไปสร้างตัวตนเลย'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREATE / EDIT PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">สร้างตัวตนของคุณ</h2>
                  <p className="text-xs text-slate-400">รูปภาพและข้อมูลจะถูกบันทึกขึ้นระบบจริง</p>
                </div>
                {hasProfile && (
                  <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-green-200">
                    ✓ บันทึกสำเร็จแล้ว
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                {/* Upload Image Avatar Area */}
                <div className="flex flex-col items-center justify-center mb-2">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-red-500/20 p-1 shadow-md mb-2 bg-slate-50 relative group">
                    <img src={myProfile.img} alt="preview" className="w-full h-full object-cover rounded-full" />
                  </div>
                  <label className="text-red-600 bg-red-50 hover:bg-red-100 px-4 py-1.5 rounded-full font-bold text-[11px] cursor-pointer transition border border-red-200 shadow-sm">
                    📷 เลือกรูปภาพจาก iPad / โทรศัพท์
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ชื่อ / ชื่อเล่น *</label>
                  <input 
                    type="text" 
                    value={myProfile.name} 
                    onChange={e => setMyProfile({...myProfile, name: e.target.value})} 
                    placeholder="เช่น ข้าวฟ่าง, เคน SIIT" 
                    className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-red-500 font-medium" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">คณะ</label>
                    <input 
                      type="text" 
                      value={myProfile.faculty} 
                      onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} 
                      placeholder="พาณิชยศาสตร์ฯ" 
                      className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-red-500" 
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">หอพัก / โซน</label>
                    <input 
                      type="text" 
                      value={myProfile.location} 
                      onChange={e => setMyProfile({...myProfile, location: e.target.value})} 
                      placeholder="หอเชียงราก" 
                      className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-red-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">คำอธิบายตัวตน (Bio)</label>
                  <textarea 
                    value={myProfile.bio} 
                    onChange={e => setMyProfile({...myProfile, bio: e.target.value})} 
                    placeholder="ชวนไปกินข้าว ทักมาคุย หรือหาเพื่อนติววิชาต่างๆ..." 
                    rows={2}
                    className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-red-500" 
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">แท็กไลฟ์สไตล์ (คั่นด้วย ,)</label>
                  <input 
                    type="text" 
                    value={Array.isArray(myProfile.tags) ? myProfile.tags.join(', ') : myProfile.tags} 
                    onChange={e => setMyProfile({...myProfile, tags: e.target.value})} 
                    placeholder="เด็กหอ, สายคาเฟ่, บอร์ดเกม" 
                    className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-red-500" 
                  />
                </div>

                <button type="submit" className="w-full mt-2 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:opacity-95 transition active:scale-95 text-xs">
                  บันทึกและเริ่มเล่นได้เลย ✨
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: PRACTICE & VOICE SIMULATOR */}
        {activeTab === 'practice' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">ฝึกบทสนทนา มธ.</h2>
              <p className="text-xs text-slate-400 mb-4">ซ้อมบทสนทนาสำหรับทักเพื่อนในมหาลัย</p>

              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                <button onClick={() => setSelectedScenario('ev_bus')} className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${selectedScenario === 'ev_bus' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>บนรถ EV</button>
                <button onClick={() => setSelectedScenario('chiangrak')} className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${selectedScenario === 'chiangrak' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>ร้านอาหารเชียงราก</button>
                <button onClick={() => setSelectedScenario('study')} className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${selectedScenario === 'study' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>โต๊ะติวตึก SC</button>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl mb-4 text-xs text-slate-700 leading-relaxed">
                {selectedScenario === 'ev_bus' && <p><strong>บริบท:</strong> นั่งบนรถ EV ข้างเพื่อนที่ไม่รู้จัก อยากเริ่มทักทายแก้เขิน</p>}
                {selectedScenario === 'chiangrak' && <p><strong>บริบท:</strong> อยากหาเพื่อนร่วมโต๊ะหารค่าชาบู/อาหารเย็นย่านเชียงราก</p>}
                {selectedScenario === 'study' && <p><strong>บริบท:</strong> ต้องการชวนเพื่อนกลุ่มวิชาเดียวกันตั้งกลุ่มติวสอบมิดเทอม</p>}
              </div>

              <div className="bg-orange-50/50 border border-orange-200/60 p-4 rounded-2xl mb-3">
                <span className="text-[11px] font-bold text-orange-600 block mb-1">💡 คำถามแนะนำสำหรับทักทาย</span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {aiSuggestion || 'กดปุ่มช่วยคิดคำถามด้านล่างเพื่อรับคำถามแนะนำ'}
                </p>
              </div>

              <button onClick={generateAiNextQuestion} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl text-xs shadow-md mb-4 active:scale-95 transition">
                สุ่มหัวข้อคำถามถัดไป
              </button>
            </div>

            {/* Voice Room Call Box */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl text-center shadow-lg">
              <h4 className="text-xs font-bold mb-1">🎙️ ทดลองฝึกพูดคุยแบบเสียง</h4>
              <p className="text-[10px] text-slate-400 mb-3">จำลองระบบพูดคุยสายเสียงสตรีมมิ่ง</p>
              
              {isCalling ? (
                <div className="space-y-2">
                  <div className="text-red-400 font-mono text-xs font-bold animate-pulse">
                    กำลังคอลสายเสียง... ({Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')})
                  </div>
                  <button onClick={() => setIsCalling(false)} className="bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md">
                    จบการคอล 🛑
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsCalling(true)} className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md active:scale-95 transition">
                  เปิดห้องคอลเสียงจำลอง
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: REAL-TIME CHAT ROOMS */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-xl h-[480px] overflow-hidden">
            <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex justify-around text-xs font-semibold">
              <button onClick={() => setActiveChannel('global')} className={`px-3.5 py-1.5 rounded-xl transition ${activeChannel === 'global' ? 'bg-red-600 text-white font-bold shadow-sm' : 'text-slate-500'}`}>ห้องแชทรวม</button>
              <button onClick={() => setActiveChannel('chiangrak')} className={`px-3.5 py-1.5 rounded-xl transition ${activeChannel === 'chiangrak' ? 'bg-red-600 text-white font-bold shadow-sm' : 'text-slate-500'}`}>เชียงราก</button>
              <button onClick={() => setActiveChannel('study')} className={`px-3.5 py-1.5 rounded-xl transition ${activeChannel === 'study' ? 'bg-red-600 text-white font-bold shadow-sm' : 'text-slate-500'}`}>ห้องติวหนังสือ</button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              {messages.map((m) => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-slate-400 mb-0.5 px-1">{m.senderName || 'นักศึกษา มธ.'}</span>
                    <div className={`p-3 rounded-2xl text-xs max-w-[80%] shadow-sm ${isMe ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'}`}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <input 
                type="text" 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
                placeholder="พิมพ์ข้อความคุยกับเพื่อนๆ..." 
                className="flex-1 bg-slate-50 text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-red-500"
              />
              <button type="submit" className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs px-5 py-3 rounded-xl font-bold shadow-md hover:opacity-95 transition">
                ส่ง
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: VIP 49 BAHT */}
        {activeTab === 'more' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xl">
              <h3 className="font-bold text-xs text-slate-900 mb-3">🎯 ภารกิจสะสมแต้มประจำวัน</h3>
              <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">เช็กอินเข้าใช้งาน</h4>
                  <p className="text-[10px] text-slate-400">รับทันที 30 แต้ม</p>
                </div>
                <button onClick={() => { setPoints(p => p + 30); alert('ได้รับ 30 แต้มสำเร็จ!'); }} className="bg-red-600 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold shadow-sm">
                  รับแต้ม
                </button>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block mb-1">
                TinnTuu VIP Membership
              </span>
              <h3 className="text-xl font-black">สมาชิกระดับ VIP</h3>
              <p className="text-xs text-slate-400 mt-1">ปลดล็อกฟีเจอร์กรองคณะ หอพัก และดูว่าใครกดถูกใจคุณ</p>

              <div className="my-4 text-xs space-y-2 text-slate-300 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <div>• ปัดการ์ดโปรไฟล์เพื่อนได้ไม่จำกัดจำนวน</div>
                <div>• เข้าถึงห้องแชทเสียงคุณภาพสูง</div>
                <div>• เครื่องหมายยืนยันตัวตนพิเศษ VIP</div>
              </div>

              <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-800">
                <div>
                  <span className="text-2xl font-black text-white">49 บาท</span>
                  <span className="text-xs text-slate-400"> / เดือน</span>
                </div>
                <button onClick={() => alert('จำลองการสมัครสมาชิกระดับ VIP 49 บาทสำเร็จ')} className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:opacity-95 transition">
                  สมัคร VIP 49.-
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around py-3 px-1 z-50 shadow-lg">
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
          <span>VIP</span>
        </button>
      </nav>
    </div>
  );
}
