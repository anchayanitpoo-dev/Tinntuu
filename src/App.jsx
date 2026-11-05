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
  
  // Real-time Profiles & Chat
  const [allProfiles, setAllProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [activeChannel, setActiveChannel] = useState('global');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [points, setPoints] = useState(250);

  // Profile Form
  const [myProfile, setMyProfile] = useState({
    name: '',
    faculty: 'พาณิชยศาสตร์และการบัญชี',
    location: 'หอพักเชียงราก',
    bio: '',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60',
    tags: 'เด็กหอ, สายคาเฟ่'
  });

  // Practice & Voice
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

  // 2. Optimized Profile Query (Limit 30 profiles for scalability)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'), limit(30));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProfiles(profiles);
    }, (err) => console.error("Fetch profiles error:", err));
    return () => unsubscribe();
  }, [user]);

  // 3. Optimized Chat Query (Limit 50 latest messages)
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

  // Voice Call Counter
  useEffect(() => {
    let interval;
    if (isCalling) {
      interval = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  // Image File Upload (Base64)
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

  // Save User Profile to Firestore
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
        tags: myProfile.tags.split(',').map(t => t.trim()),
        updatedAt: serverTimestamp()
      }, { merge: true });

      alert('บันทึกข้อมูลตัวตนลงระบบสำเร็จ!');
      setActiveTab('swipe');
    } catch (err) {
      console.error("Save profile error:", err);
      alert('เกิดข้อผิดพลาด ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  // Send Chat Message
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await addDoc(collection(db, `chat_${activeChannel}`), {
        text: inputText,
        senderName: myProfile.name || 'สมาชิก มธ.',
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
      "ช่วงสอบมิดเทอมนี้ อ่านหนังสือที่ SC หรืออ่านที่หอเป็นหลักครับ?",
      "เมนูเด็ดประจำเวลาสั่งกินที่เชียงรากของคุณคืออะไร?",
      "ปกติเดินทางในมหาลัย นั่งรถ EV สายไหนบ่อยที่สุด?",
      "เสาร์-อาทิตย์นี้ มีแพลนไปคาเฟ่หรือกลับบ้านครับ?"
    ];
    setAiSuggestion(questions[Math.floor(Math.random() * questions.length)]);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-neutral-50 flex flex-col justify-between font-sans text-neutral-800 pb-20 shadow-xl border-x border-neutral-200">
      
      {/* Header - Minimal TU Red */}
      <header className="bg-white border-b border-neutral-200 px-5 py-3.5 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-black tracking-tight text-red-600">TinnTuu</h1>
          <p className="text-[10px] text-neutral-400 font-medium -mt-0.5">Thammasat Student Community</p>
        </div>
        <div className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full text-xs font-bold border border-neutral-200">
          🪙 {points} แต้ม
        </div>
      </header>

      {/* Main Body */}
      <main className="p-4 flex-1 flex flex-col">
        
        {/* TAB 1: SWIPE FRIENDS */}
        {activeTab === 'swipe' && (
          <div className="flex-1 flex flex-col justify-center items-center">
            {allProfiles.length > 0 && profileIndex < allProfiles.length ? (
              <div className="w-full bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
                <div className="relative h-80 bg-neutral-100">
                  <img 
                    src={allProfiles[profileIndex].img} 
                    alt="profile" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute top-3 left-3 bg-neutral-900/70 backdrop-blur-md text-white text-[10px] px-3 py-1 rounded-full font-medium">
                    📍 {allProfiles[profileIndex].location || 'ธรรมศาสตร์ รังสิต'}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-baseline">
                      <h2 className="text-2xl font-bold text-neutral-900">{allProfiles[profileIndex].name}</h2>
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                        {allProfiles[profileIndex].faculty}
                      </span>
                    </div>
                    <p className="text-neutral-600 text-sm mt-2.5 leading-relaxed">{allProfiles[profileIndex].bio}</p>
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {Array.isArray(allProfiles[profileIndex].tags) && allProfiles[profileIndex].tags.map((tag, idx) => (
                        <span key={idx} className="bg-neutral-100 text-neutral-600 text-[11px] px-2.5 py-1 rounded-md font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setProfileIndex(p => p + 1)} className="flex-1 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-bold text-xs hover:bg-neutral-200 transition">
                      ข้าม
                    </button>
                    <button onClick={() => { alert(`แมตช์สำเร็จ! ทักทาย ${allProfiles[profileIndex].name} แล้ว`); setProfileIndex(p => p + 1); }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-red-700 transition">
                      ถูกใจโปรไฟล์
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white w-full rounded-2xl border border-neutral-200 p-6">
                <h3 className="text-base font-bold text-neutral-800">ยังไม่มีตัวตนถัดไปให้ปัด</h3>
                <p className="text-xs text-neutral-400 mt-1">กดแท็บ "สร้างตัวตน" ด้านล่างเพื่อเพิ่มโปรไฟล์แรกของคุณ</p>
                <button onClick={() => setActiveTab('profile')} className="mt-4 bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm">
                  สร้างตัวตนเลย
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREATE PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900 mb-1">สร้างตัวตนของคุณ</h2>
              <p className="text-xs text-neutral-400 mb-5">ข้อมูลนี้จะถูกบันทึกลงระบบเพื่อให้เพื่อนๆ มธ. เห็นโปรไฟล์คุณ</p>

              <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
                <div className="flex flex-col items-center justify-center mb-2">
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-neutral-200 mb-2 bg-neutral-100 relative">
                    <img src={myProfile.img} alt="preview" className="w-full h-full object-cover" />
                  </div>
                  <label className="text-red-600 border border-red-200 bg-red-50 px-3 py-1 rounded-lg font-bold text-[11px] cursor-pointer">
                    อัปโหลดรูปภาพโปรไฟล์
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">ชื่อ / ชื่อเล่น *</label>
                  <input 
                    type="text" 
                    value={myProfile.name} 
                    onChange={e => setMyProfile({...myProfile, name: e.target.value})} 
                    placeholder="เช่น ข้าวฟ่าง, เคน SIIT" 
                    className="w-full bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-red-500" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">คณะ</label>
                    <input 
                      type="text" 
                      value={myProfile.faculty} 
                      onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} 
                      placeholder="พาณิชยศาสตร์ฯ" 
                      className="w-full bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-red-500" 
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">หอพัก / โซน</label>
                    <input 
                      type="text" 
                      value={myProfile.location} 
                      onChange={e => setMyProfile({...myProfile, location: e.target.value})} 
                      placeholder="หอเชียงราก" 
                      className="w-full bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-red-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">คำอธิบายตัวตน (Bio)</label>
                  <textarea 
                    value={myProfile.bio} 
                    onChange={e => setMyProfile({...myProfile, bio: e.target.value})} 
                    placeholder="แนะนำตัวเองสั้นๆ ชวนไปกินข้าวหรือหารค่าแท็กซี่..." 
                    rows={2}
                    className="w-full bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-red-500" 
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-700 block mb-1">แท็ก (คั่นด้วย ,)</label>
                  <input 
                    type="text" 
                    value={myProfile.tags} 
                    onChange={e => setMyProfile({...myProfile, tags: e.target.value})} 
                    placeholder="เด็กหอ, บอร์ดเกม, ติวอิ้ง" 
                    className="w-full bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-red-500" 
                  />
                </div>

                <button type="submit" className="w-full mt-2 py-3 bg-red-600 text-white font-bold rounded-xl shadow-sm hover:bg-red-700 transition">
                  บันทึกข้อมูลตัวตน
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: PRACTICE & VOICE */}
        {activeTab === 'practice' && (
          <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900 mb-1">ฝึกบทสนทนา มธ.</h2>
              <p className="text-xs text-neutral-400 mb-4">สถานการณ์จำลองสำหรับการฝึกชวนคุย</p>

              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
                <button onClick={() => setSelectedScenario('ev_bus')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${selectedScenario === 'ev_bus' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'}`}>บนรถ EV</button>
                <button onClick={() => setSelectedScenario('chiangrak')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${selectedScenario === 'chiangrak' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'}`}>ร้านอาหารเชียงราก</button>
                <button onClick={() => setSelectedScenario('study')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${selectedScenario === 'study' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'}`}>โต๊ะติวตึก SC</button>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl mb-4 text-xs text-neutral-700">
                {selectedScenario === 'ev_bus' && <p><strong>บริบท:</strong> นั่งบนรถ EV ข้างเพื่อนนักศึกษาที่ไม่รู้จัก อยากเริ่มทักทายแบบเป็นธรรมชาติ</p>}
                {selectedScenario === 'chiangrak' && <p><strong>บริบท:</strong> อยากหาเพื่อนร่วมโต๊ะทานอาหารเย็นย่านเชียงราก</p>}
                {selectedScenario === 'study' && <p><strong>บริบท:</strong> ต้องการชวนเพื่อนกลุ่มวิชาเดียวกันตั้งกลุ่มติวสอบกลางภาค</p>}
              </div>

              <div className="bg-red-50 border border-red-100 p-3.5 rounded-xl mb-3">
                <span className="text-[11px] font-bold text-red-600 block mb-1">คำถามแนะนำสำหรับชวนคุยต่อ</span>
                <p className="text-xs text-neutral-700 leading-relaxed">
                  {aiSuggestion || 'กดปุ่มด้านล่างเพื่อสุ่มประโยคชวนคุย'}
                </p>
              </div>

              <button onClick={generateAiNextQuestion} className="w-full py-2.5 bg-neutral-900 text-white font-bold rounded-xl text-xs shadow-sm mb-4">
                สุ่มหัวข้อคำถามถัดไป
              </button>
            </div>

            <div className="bg-neutral-900 text-white p-4 rounded-xl text-center">
              <h4 className="text-xs font-bold mb-1">ทดลองฝึกพูดคุยแบบเสียง</h4>
              <p className="text-[10px] text-neutral-400 mb-3">จำลองระบบการพูดคุยด้วยเสียงแบบ Real-time</p>
              
              {isCalling ? (
                <div className="space-y-2">
                  <div className="text-red-400 font-mono text-xs font-bold">
                    กำลังเชื่อมต่อสายเสียง ({Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')})
                  </div>
                  <button onClick={() => setIsCalling(false)} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold">
                    จบการคอล
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsCalling(true)} className="bg-white text-neutral-900 px-4 py-2 rounded-lg text-xs font-bold">
                  เปิดห้องเสียงจำลอง
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CHAT ROOMS */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-neutral-200 shadow-sm h-[480px] overflow-hidden">
            <div className="p-2 bg-neutral-50 border-b border-neutral-200 flex justify-around text-xs font-medium">
              <button onClick={() => setActiveChannel('global')} className={`px-3 py-1.5 rounded-lg ${activeChannel === 'global' ? 'bg-red-600 text-white font-bold' : 'text-neutral-500'}`}>ห้องแชทรวม</button>
              <button onClick={() => setActiveChannel('chiangrak')} className={`px-3 py-1.5 rounded-lg ${activeChannel === 'chiangrak' ? 'bg-red-600 text-white font-bold' : 'text-neutral-500'}`}>เชียงราก</button>
              <button onClick={() => setActiveChannel('study')} className={`px-3 py-1.5 rounded-lg ${activeChannel === 'study' ? 'bg-red-600 text-white font-bold' : 'text-neutral-500'}`}>ห้องติวหนังสือ</button>
            </div>

            <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-neutral-50/50">
              {messages.map((m) => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-neutral-400 mb-0.5 px-1">{m.senderName || 'นักศึกษา มธ.'}</span>
                    <div className={`p-3 rounded-xl text-xs max-w-[80%] ${isMe ? 'bg-red-600 text-white rounded-br-none' : 'bg-white text-neutral-800 border border-neutral-200 rounded-bl-none'}`}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={sendMessage} className="p-2.5 bg-white border-t border-neutral-200 flex gap-2">
              <input 
                type="text" 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
                placeholder="พิมพ์ข้อความคุยกับเพื่อนๆ..." 
                className="flex-1 bg-neutral-50 text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-red-500"
              />
              <button type="submit" className="bg-red-600 text-white text-xs px-4 py-2.5 rounded-xl font-bold hover:bg-red-700 transition">
                ส่ง
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: VIP 49 BAHT */}
        {activeTab === 'more' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
              <h3 className="font-bold text-xs text-neutral-900 mb-2">ภารกิจสะสมแต้มประจำวัน</h3>
              <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <div>
                  <h4 className="text-xs font-bold text-neutral-800">เช็กอินเข้าใช้งาน</h4>
                  <p className="text-[10px] text-neutral-400">รับทันที 30 แต้ม</p>
                </div>
                <button onClick={() => { setPoints(p => p + 30); alert('ได้รับ 30 แต้มสำเร็จ!'); }} className="bg-neutral-900 text-white text-xs px-3 py-1.5 rounded-lg font-bold">
                  รับแต้ม
                </button>
              </div>
            </div>

            <div className="bg-neutral-900 text-white p-5 rounded-2xl shadow-md">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                TinnTuu Premium
              </span>
              <h3 className="text-xl font-bold">สมาชิกระดับ VIP</h3>
              <p className="text-xs text-neutral-400 mt-1">ปลดล็อกฟีเจอร์กรองคณะ หอพัก และดูผู้ที่กดถูกใจคุณ</p>

              <div className="my-4 text-xs space-y-2 text-neutral-300">
                <div>• ปัดการ์ดโปรไฟล์เพื่อนได้ไม่จำกัดจำนวน</div>
                <div>• เข้าถึงห้องแชทเสียงคุณภาพสูง</div>
                <div>• เครื่องหมายยืนยันตัวตนพิเศษ</div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
                <div>
                  <span className="text-2xl font-bold">49 บาท</span>
                  <span className="text-xs text-neutral-400"> / เดือน</span>
                </div>
                <button onClick={() => alert('ระบบจำลองการสมัคร VIP 49 บาท สำเร็จ')} className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-red-700 transition">
                  สมัคร VIP 49.-
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white border-t border-neutral-200 flex justify-around py-3 px-1 z-50">
        <button onClick={() => setActiveTab('swipe')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'swipe' ? 'text-red-600' : 'text-neutral-400'}`}>
          <span className="text-base mb-0.5">🔥</span>
          <span>ปัดเพื่อน</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'profile' ? 'text-red-600' : 'text-neutral-400'}`}>
          <span className="text-base mb-0.5">👤</span>
          <span>สร้างตัวตน</span>
        </button>
        <button onClick={() => setActiveTab('practice')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'practice' ? 'text-red-600' : 'text-neutral-400'}`}>
          <span className="text-base mb-0.5">🗣️</span>
          <span>ฝึกคุย</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'chat' ? 'text-red-600' : 'text-neutral-400'}`}>
          <span className="text-base mb-0.5">💬</span>
          <span>ห้องแชท</span>
        </button>
        <button onClick={() => setActiveTab('more')} className={`flex flex-col items-center text-[10px] font-bold ${activeTab === 'more' ? 'text-red-600' : 'text-neutral-400'}`}>
          <span className="text-base mb-0.5">👑</span>
          <span>VIP</span>
        </button>
      </nav>
    </div>
  );
}
