import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, serverTimestamp, setDoc, doc 
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
  
  // Real-time Profiles & Multi-Channel Chat States
  const [allProfiles, setAllProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [activeChannel, setActiveChannel] = useState('global'); // 'global', 'chiangrak', 'study'
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [points, setPoints] = useState(250);

  // Profile Form State
  const [myProfile, setMyProfile] = useState({
    name: '',
    faculty: 'ศิลปศาสตร์',
    location: 'หอพักเชียงราก',
    bio: '',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60',
    tags: 'เด็กหอ, สายคาเฟ่'
  });

  // Voice Call State
  const [isCalling, setIsCalling] = useState(false);
  const [callTimer, setCallTimer] = useState(0);

  // Practice & Scenario State
  const [selectedScenario, setSelectedScenario] = useState('ev_bus');
  const [aiSuggestion, setAiSuggestion] = useState('');

  // 1. Anonymous Auth
  useEffect(() => {
    signInAnonymously(auth)
      .then(res => setUser(res.user))
      .catch(err => console.error("Auth error:", err));
  }, []);

  // 2. Fetch Profiles from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProfiles(profiles);
    }, (err) => console.error("Fetch profiles error:", err));
    return () => unsubscribe();
  }, [user]);

  // 3. Fetch Multi-Channel Chat Messages
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `chat_${activeChannel}`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    }, (err) => console.error("Fetch chat error:", err));
    return () => unsubscribe();
  }, [user, activeChannel]);

  // Voice Call Timer Effect
  useEffect(() => {
    let interval;
    if (isCalling) {
      interval = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  // Image Upload Handler (Base64)
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

  // Save Profile to Firestore
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!myProfile.name.trim()) return alert('กรุณากรอกชื่อของคุณด้วยครับ!');

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        name: myProfile.name,
        faculty: myProfile.faculty,
        location: myProfile.location,
        bio: myProfile.bio || 'เด็ก มธ. ยินดีที่ได้รู้จักครับ!',
        img: myProfile.img,
        tags: myProfile.tags.split(',').map(t => t.trim()),
        updatedAt: serverTimestamp()
      }, { merge: true });

      alert('สร้างตัวตนสำเร็จ! ตอนนี้โปรไฟล์ของคุณเข้าสู่ระบบแล้ว');
      setActiveTab('swipe');
    } catch (err) {
      console.error("Save profile error:", err);
      alert('เกิดข้อผิดพลาดในการบันทึกโปรไฟล์');
    }
  };

  // Send Message
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await addDoc(collection(db, `chat_${activeChannel}`), {
        text: inputText,
        senderName: myProfile.name || 'เพื่อน มธ.',
        senderId: user ? user.uid : 'anonymous',
        createdAt: serverTimestamp()
      });
      setInputText('');
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  // AI Next Question Helper
  const generateAiNextQuestion = () => {
    const questions = [
      "แล้วปกติเวลาว่างชอบไปนั่งเล่นที่ไหนใน มธ. ครับ?",
      "สอบกลางภาควิชานี้ รู้สึกว่าบทไหนยากที่สุดเหรอ?",
      "เคยไปทานชาบูร้านตรงเชียงรากหรือยัง แนะนำเมนูไหนดี?",
      "วันเสาร์-อาทิตย์นี้มีแพลนไปไหนหรือยังครับ?",
      "ปกติเดินทางมาเรียนด้วยรถ EV หรือเดินครับ?"
    ];
    const randomQ = questions[Math.floor(Math.random() * questions.length)];
    setAiSuggestion(randomQ);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-100 flex flex-col justify-between shadow-2xl font-sans pb-20">
      {/* Header - TU Red & Orange Theme */}
      <header className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 p-4 text-white flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div>
          <h1 className="text-2xl font-black tracking-wider flex items-center gap-1">TinnTuu <span className="text-xl">🐱</span></h1>
          <p className="text-[11px] text-orange-100 font-medium">มธ. คอมมูนิตี้สร้างตัวตน & ฝึกคุย</p>
        </div>
        <div className="bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-inner">
          <span>🪙</span> {points} แต้ม
        </div>
      </header>

      {/* Main Body */}
      <main className="p-4 flex-1 flex flex-col">
        {/* TAB 1: SWIPE FRIENDS */}
        {activeTab === 'swipe' && (
          <div className="flex-1 flex flex-col justify-center items-center">
            {allProfiles.length > 0 && profileIndex < allProfiles.length ? (
              <div className="w-full bg-white rounded-3xl shadow-xl border overflow-hidden flex flex-col border-orange-200">
                <div className="relative h-72 bg-slate-200">
                  <img 
                    src={allProfiles[profileIndex].img} 
                    alt="profile" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute top-3 left-3 bg-red-600/80 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full font-semibold">
                    📍 {allProfiles[profileIndex].location || 'ธรรมศาสตร์ รังสิต'}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-black text-slate-800">{allProfiles[profileIndex].name}</h2>
                      <span className="bg-orange-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">
                        {allProfiles[profileIndex].faculty}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm mt-3 leading-relaxed">{allProfiles[profileIndex].bio}</p>
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {Array.isArray(allProfiles[profileIndex].tags) && allProfiles[profileIndex].tags.map((tag, idx) => (
                        <span key={idx} className="bg-orange-50 text-orange-700 text-[11px] px-2.5 py-1 rounded-lg font-medium border border-orange-100">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-center gap-3 mt-6">
                    <button onClick={() => setProfileIndex(p => p + 1)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold shadow-sm active:scale-95 transition text-xs">
                      ข้าม ✖️
                    </button>
                    <button onClick={() => { alert(`แมตช์สำเร็จ! ส่งสัญญาณทักทายหา ${allProfiles[profileIndex].name} แล้ว`); setProfileIndex(p => p + 1); }} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-bold shadow-md active:scale-95 transition text-xs">
                      ถูกใจคุยด้วย ❤️
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white w-full rounded-3xl shadow-md border p-6 border-orange-100">
                <span className="text-4xl">🐱</span>
                <h3 className="text-lg font-bold text-slate-800 mt-2">ยังไม่มีตัวตนอื่นให้ปัด!</h3>
                <p className="text-xs text-slate-500 mt-1">สร้างตัวตนของคุณเพื่อเป็นโปรไฟล์แรกให้เพื่อนปัดได้เลย</p>
                <button onClick={() => setActiveTab('profile')} className="mt-4 bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md">
                  ไปสร้างตัวตนกันเลย 👤
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREATE PROFILE WITH IMAGE UPLOAD */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-5 border shadow-md flex-1 flex flex-col justify-between border-orange-100">
            <div>
              <h2 className="text-lg font-bold text-red-600 mb-1 flex items-center gap-1">👤 สร้างตัวตนของคุณ</h2>
              <p className="text-xs text-slate-500 mb-4">ใส่รูปภาพจริงและข้อมูลของคุณ เพื่อแสดงบนการ์ดปัดเพื่อน</p>

              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                {/* Image Upload Area */}
                <div className="flex flex-col items-center justify-center mb-3">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-orange-400 shadow-md mb-2 bg-slate-100 relative">
                    <img src={myProfile.img} alt="preview" className="w-full h-full object-cover" />
                  </div>
                  <label className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer shadow-sm">
                    📷 เลือกรูปโปรไฟล์จากเครื่อง
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
                    className="w-full bg-slate-50 p-2.5 rounded-xl border focus:outline-none focus:border-red-500" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">คณะ</label>
                    <input 
                      type="text" 
                      value={myProfile.faculty} 
                      onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} 
                      placeholder="เช่น พาณิชยศาสตร์ฯ" 
                      className="w-full bg-slate-50 p-2.5 rounded-xl border focus:outline-none focus:border-red-500" 
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">หอพัก / โซน</label>
                    <input 
                      type="text" 
                      value={myProfile.location} 
                      onChange={e => setMyProfile({...myProfile, location: e.target.value})} 
                      placeholder="เช่น หอเชียงราก, หอโดม" 
                      className="w-full bg-slate-50 p-2.5 rounded-xl border focus:outline-none focus:border-red-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">คำอธิบายตัวเอง (Bio)</label>
                  <textarea 
                    value={myProfile.bio} 
                    onChange={e => setMyProfile({...myProfile, bio: e.target.value})} 
                    placeholder="ชอบกินอะไร ชวนไปไหนได้บ้าง..." 
                    rows={2}
                    className="w-full bg-slate-50 p-2.5 rounded-xl border focus:outline-none focus:border-red-500" 
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">แท็ก (คั่นด้วย ,)</label>
                  <input 
                    type="text" 
                    value={myProfile.tags} 
                    onChange={e => setMyProfile({...myProfile, tags: e.target.value})} 
                    placeholder="เด็กหอ, บอร์ดเกม, ติวอิ้ง" 
                    className="w-full bg-slate-50 p-2.5 rounded-xl border focus:outline-none focus:border-red-500" 
                  />
                </div>

                <button type="submit" className="w-full mt-2 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition">
                  บันทึกตัวตนลงระบบ ✨
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: TU PRACTICE & AI NEXT QUESTION */}
        {activeTab === 'practice' && (
          <div className="bg-white rounded-3xl p-5 border shadow-md flex-1 flex flex-col justify-between border-orange-100">
            <div>
              <h2 className="text-lg font-bold text-red-600 mb-1 flex items-center gap-1">🗣️ ฝึกพูดคุยสไตล์เด็ก มธ.</h2>
              <p className="text-xs text-slate-500 mb-3">เลือกลองซ้อมสถานการณ์ชวนคุยกับเพื่อน มธ.</p>

              {/* Scenario Selector */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
                <button onClick={() => setSelectedScenario('ev_bus')} className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${selectedScenario === 'ev_bus' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>🚌 ทักบนรถ EV</button>
                <button onClick={() => setSelectedScenario('chiangrak')} className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${selectedScenario === 'chiangrak' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>🍲 หาเพื่อนกินชาบู</button>
                <button onClick={() => setSelectedScenario('study')} className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${selectedScenario === 'study' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>📚 ชวนติวที่ SC</button>
              </div>

              {/* Scenario Context Box */}
              <div className="bg-orange-50 border border-orange-200 p-3.5 rounded-2xl mb-4 text-xs">
                {selectedScenario === 'ev_bus' && <p><strong>สถานการณ์:</strong> คุณนั่งอยู่บนรถ EV ใน มธ. แล้วมีคนน่ารักนั่งข้างๆ อยากชวนคุยแก้เขิน!</p>}
                {selectedScenario === 'chiangrak' && <p><strong>สถานการณ์:</strong> อยากกินชาบูเชียงรากตอน 2 ทุ่ม แต่วันนี้เพื่อนในกลุ่มติดธุระหมด!</p>}
                {selectedScenario === 'study' && <p><strong>สถานการณ์:</strong> ใกล้สอบสัปดาห์หน้า อยากหาเพื่อนติววิชา TU100/TU109 ที่ตึก SC</p>}
              </div>

              {/* AI Suggestion Box */}
              <div className="bg-slate-50 border p-3.5 rounded-2xl mb-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-bold text-orange-600 flex items-center gap-1">🤖 Meow AI ช่วยคิดประโยคถัดไป</span>
                </div>
                <p className="text-xs text-slate-700 italic">
                  {aiSuggestion || '"กดปุ่มช่วยคิดคำถามด้านล่างเพื่อให้ AI ช่วยเสนอประโยคทักทาย!"'}
                </p>
              </div>

              <button onClick={generateAiNextQuestion} className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl text-xs shadow-md active:scale-95 transition mb-4">
                💡 สุ่มช่วยคิดคำถามต่อไป (+5 แต้ม)
              </button>
            </div>

            {/* Voice Call Simulator */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl text-center shadow-lg">
              <h4 className="text-xs font-bold mb-1">🎙️ ระบบจำลองพูดคุยแบบเสียง (Voice Room)</h4>
              <p className="text-[10px] text-slate-400 mb-3">ทดสอบฝึกพูดคุยออกเสียงสตรีมสด</p>
              
              {isCalling ? (
                <div className="space-y-2">
                  <div className="text-red-400 font-mono text-sm font-bold animate-pulse">
                    🔴 กำลังคอลสายเสียง... ({Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')})
                  </div>
                  <button onClick={() => setIsCalling(false)} className="bg-red-600 text-white px-5 py-1.5 rounded-full text-xs font-bold">
                    วางสาย 🛑
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsCalling(true)} className="bg-green-500 text-white px-5 py-2 rounded-full text-xs font-bold shadow-md active:scale-95">
                  📞 เริ่มทดลองคอลเสียง
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MULTI-CHANNEL CHAT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-white rounded-3xl border shadow-lg h-[480px] overflow-hidden border-orange-100">
            {/* Channel Selector */}
            <div className="p-2 bg-slate-50 border-b flex justify-around text-[11px] font-bold">
              <button onClick={() => setActiveChannel('global')} className={`px-2.5 py-1 rounded-xl ${activeChannel === 'global' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500'}`}>💬 ห้องแชทรวม</button>
              <button onClick={() => setActiveChannel('chiangrak')} className={`px-2.5 py-1 rounded-xl ${activeChannel === 'chiangrak' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500'}`}>🍲 เชียงรากฮับ</button>
              <button onClick={() => setActiveChannel('study')} className={`px-2.5 py-1 rounded-xl ${activeChannel === 'study' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500'}`}>📚 ห้องหาเพื่อนติว</button>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-slate-50/50">
              {messages.map((m) => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-slate-400 mb-0.5 px-1">{m.senderName || 'เพื่อน มธ.'}</span>
                    <div className={`p-3 rounded-2xl text-xs max-w-[80%] shadow-sm ${isMe ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-br-none' : 'bg-white text-slate-800 border rounded-bl-none'}`}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input */}
            <form onSubmit={sendMessage} className="p-2.5 bg-white border-t flex gap-2">
              <input 
                type="text" 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
                placeholder={myProfile.name ? `พิมพ์ส่งเข้าห้อง ${activeChannel}...` : "สร้างตัวตนก่อนเพื่อพิมพ์แชท..."} 
                className="flex-1 bg-slate-100 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none border focus:border-red-400"
              />
              <button type="submit" className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs px-5 py-2.5 rounded-xl font-bold shadow-md active:scale-95 transition">
                ส่ง
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: MISSIONS & VIP 49 BAHT */}
        {activeTab === 'more' && (
          <div className="space-y-4">
            {/* Missions Box */}
            <div className="bg-white p-4 rounded-3xl border shadow-md border-orange-100">
              <h3 className="font-bold text-xs text-red-600 mb-2 flex items-center gap-1">🎯 ภารกิจสะสม TinnCoins</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">เช็กอินประจำวัน มธ.</h4>
                    <p className="text-[10px] text-slate-500">รับทันที 30 แต้ม</p>
                  </div>
                  <button onClick={() => { setPoints(p => p + 30); alert('ได้รับ 30 แต้มเรียบร้อย!'); }} className="bg-orange-500 text-white text-xs px-3 py-1 rounded-lg font-bold">
                    รับแต้ม
                  </button>
                </div>
              </div>
            </div>

            {/* VIP 49 Baht Subscription Box */}
            <div className="bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 p-5 rounded-3xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 text-7xl opacity-20">👑</div>
              <span className="bg-black/30 text-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                TinnTuu VIP Membership
              </span>
              <h3 className="text-xl font-black mt-2">ปลดล็อกพรีเมียมขั้นสุด</h3>
              <p className="text-xs text-orange-100 mt-1">เห็นว่าใครถูกใจเรา + กรองคณะหอพักได้ไม่จำกัด</p>

              <div className="my-4 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5">✨ ปัดการ์ดโปรไฟล์เพื่อน มธ. ได้ไม่จำกัด</div>
                <div className="flex items-center gap-1.5">✨ ห้องแชทเสียง VIP คุณภาพสูง</div>
                <div className="flex items-center gap-1.5">✨ ตราสัญลักษณ์มงกุฎ VIP ข้างชื่อ</div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black">49 บาท</span>
                  <span className="text-[11px] text-orange-200"> / เดือน</span>
                </div>
                <button onClick={() => alert('จำลองการชำระเงิน TinnTuu VIP 49 บาท สำเร็จ!')} className="bg-white text-red-600 px-5 py-2.5 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition">
                  สมัคร VIP 49.-
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white/95 backdrop-blur-md border-t flex justify-around py-2.5 px-1 z-50 shadow-lg border-orange-100">
        <button onClick={() => setActiveTab('swipe')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'swipe' ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
          <span className="text-base">🔥</span>
          <span className="text-[10px]">ปัดเพื่อน</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'profile' ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
          <span className="text-base">👤</span>
          <span className="text-[10px]">สร้างตัวตน</span>
        </button>
        <button onClick={() => setActiveTab('practice')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'practice' ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
          <span className="text-base">🗣️</span>
          <span className="text-[10px]">ฝึกคุย</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'chat' ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
          <span className="text-base">💬</span>
          <span className="text-[10px]">ห้องแชท</span>
        </button>
        <button onClick={() => setActiveTab('more')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'more' ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
          <span className="text-base">👑</span>
          <span className="text-[10px]">VIP/ภารกิจ</span>
        </button>
      </nav>
    </div>
  );
}
