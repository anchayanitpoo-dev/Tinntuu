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
  
  // Real-time Profiles & Chat States
  const [allProfiles, setAllProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [points, setPoints] = useState(200);

  // Form State for User Profile
  const [myProfile, setMyProfile] = useState({
    name: '',
    faculty: 'ศิลปศาสตร์',
    location: 'หอพักเชียงราก',
    bio: '',
    img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60',
    tags: 'เด็กหอ, ติ่งเกาหลี'
  });
  const [isProfileSaved, setIsProfileSaved] = useState(false);

  // Anonymous Auth Login
  useEffect(() => {
    signInAnonymously(auth)
      .then(res => setUser(res.user))
      .catch(err => console.error("Auth error:", err));
  }, []);

  // Fetch Real-time Profiles from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProfiles(profiles);
    }, (err) => console.error("Fetch profiles error:", err));
    return () => unsubscribe();
  }, [user]);

  // Fetch Real-time Global Chat
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'global_chat'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    }, (err) => console.error("Firestore error:", err));
    return () => unsubscribe();
  }, [user]);

  // Save/Update My Profile to Firestore
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

      setIsProfileSaved(true);
      alert('สร้างตัวตนสำเร็จ! ตอนนี้โปรไฟล์ของคุณถูกเพิ่มเข้าไปในระบบแล้ว');
      setActiveTab('swipe');
    } catch (err) {
      console.error("Save profile error:", err);
      alert('เกิดข้อผิดพลาดในการบันทึกโปรไฟล์');
    }
  };

  // Send Chat Message
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await addDoc(collection(db, 'global_chat'), {
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

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-100 flex flex-col justify-between shadow-2xl font-sans pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-4 text-white flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div>
          <h1 className="text-2xl font-black tracking-wider flex items-center gap-1">TinnTuu <span className="text-xl">🐱</span></h1>
          <p className="text-[11px] text-orange-100 font-medium">มธ. คอมมูนิตี้สร้างตัวตนปัดเพื่อน</p>
        </div>
        <div className="bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-inner">
          <span>🪙</span> {points} แต้ม
        </div>
      </header>

      {/* Main Container */}
      <main className="p-4 flex-1 flex flex-col">
        {/* TAB 1: SWIPE REAL PROFILES */}
        {activeTab === 'swipe' && (
          <div className="flex-1 flex flex-col justify-center items-center">
            {allProfiles.length > 0 && profileIndex < allProfiles.length ? (
              <div className="w-full bg-white rounded-3xl shadow-xl border overflow-hidden flex flex-col">
                <div className="relative h-72 bg-slate-200">
                  <img 
                    src={allProfiles[profileIndex].img || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=60'} 
                    alt="profile" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full font-semibold">
                    📍 {allProfiles[profileIndex].location || 'ธรรมศาสตร์ รังสิต'}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-black text-slate-800">{allProfiles[profileIndex].name}</h2>
                      <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                        {allProfiles[profileIndex].faculty}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm mt-3 leading-relaxed">{allProfiles[profileIndex].bio}</p>
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {Array.isArray(allProfiles[profileIndex].tags) && allProfiles[profileIndex].tags.map((tag, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-600 text-[11px] px-2.5 py-1 rounded-lg font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mt-6">
                    <button onClick={() => setProfileIndex(p => p + 1)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-2xl font-bold shadow-sm active:scale-95 transition">
                      ข้าม ✖️
                    </button>
                    <button onClick={() => { alert(`แมตช์สำเร็จ! ส่งสัญญาณทักทายหา ${allProfiles[profileIndex].name} แล้ว`); setProfileIndex(p => p + 1); }} className="flex-1 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-bold shadow-md active:scale-95 transition">
                      ถูกใจ ❤️
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white w-full rounded-3xl shadow-md border p-6">
                <span className="text-4xl">🐱</span>
                <h3 className="text-lg font-bold text-slate-800 mt-2">ยังไม่มีโปรไฟล์อื่นให้ปัด!</h3>
                <p className="text-xs text-slate-500 mt-1">กดแท็บ "ตัวตนฉัน" ด้านล่าง เพื่อสร้างตัวตนของคุณเป็นคนแรกได้เลย</p>
                <button onClick={() => setActiveTab('profile')} className="mt-4 bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md">
                  ไปสร้างตัวตนกันเลย
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREATE & EDIT MY PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-5 border shadow-md flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">👤 สร้างตัวตนของคุณ</h2>
              <p className="text-xs text-slate-500 mb-4">ข้อมูลนี้จะถูกนำไปแสดงเป็นแผ่นการ์ดให้เพื่อน มธ. คนอื่นปัดหาคุณ!</p>

              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ชื่อ / ชื่อเล่น *</label>
                  <input 
                    type="text" 
                    value={myProfile.name} 
                    onChange={e => setMyProfile({...myProfile, name: e.target.value})} 
                    placeholder="เช่น ข้าวฟ่าง, เคน วิศวะ" 
                    className="w-full bg-slate-50 p-2.5 rounded-xl border focus:outline-none focus:border-orange-500" 
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
                      className="w-full bg-slate-50 p-2.5 rounded-xl border focus:outline-none focus:border-orange-500" 
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">หอพัก / โซน</label>
                    <input 
                      type="text" 
                      value={myProfile.location} 
                      onChange={e => setMyProfile({...myProfile, location: e.target.value})} 
                      placeholder="เช่น หอเชียงราก, หอโดม" 
                      className="w-full bg-slate-50 p-2.5 rounded-xl border focus:outline-none focus:border-orange-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">คำอธิบายตัวเอง (Bio)</label>
                  <textarea 
                    value={myProfile.bio} 
                    onChange={e => setMyProfile({...myProfile, bio: e.target.value})} 
                    placeholder="หาเพื่อนติววิชาอะไร ชอบทำกิจกรรมอะไร ใส่ได้เลย..." 
                    rows={2}
                    className="w-full bg-slate-50 p-2.5 rounded-xl border focus:outline-none focus:border-orange-500" 
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ลิงก์ URL รูปโปรไฟล์</label>
                  <input 
                    type="text" 
                    value={myProfile.img} 
                    onChange={e => setMyProfile({...myProfile, img: e.target.value})} 
                    placeholder="วางลิงก์รูปภาพสไตล์คุณที่นี่..." 
                    className="w-full bg-slate-50 p-2.5 rounded-xl border focus:outline-none focus:border-orange-500 text-[10px]" 
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">แท็กไลฟ์สไตล์ (คั่นด้วยจุลภาค ,)</label>
                  <input 
                    type="text" 
                    value={myProfile.tags} 
                    onChange={e => setMyProfile({...myProfile, tags: e.target.value})} 
                    placeholder="เด็กหอ, สายคาเฟ่, หาเพื่อนหารรถ" 
                    className="w-full bg-slate-50 p-2.5 rounded-xl border focus:outline-none focus:border-orange-500" 
                  />
                </div>

                <button type="submit" className="w-full mt-2 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl shadow-md active:scale-95 transition">
                  บันทึกตัวตนลงระบบ Firebase ✨
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: REAL-TIME CHAT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-white rounded-3xl border shadow-lg h-[480px] overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b flex justify-between items-center text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">💬 ห้องแชทรวมเด็ก มธ. Real-time</span>
              <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">ออนไลน์</span>
            </div>
            <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-slate-50/50">
              {messages.map((m) => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-slate-400 mb-0.5 px-1">{m.senderName || 'เพื่อน มธ.'}</span>
                    <div className={`p-3 rounded-2xl text-xs max-w-[80%] shadow-sm ${isMe ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-br-none' : 'bg-white text-slate-800 border rounded-bl-none'}`}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={sendMessage} className="p-2.5 bg-white border-t flex gap-2">
              <input 
                type="text" 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
                placeholder={myProfile.name ? `พิมพ์แชทในชื่อ ${myProfile.name}...` : "สร้างตัวตนก่อนเพื่อพิมพ์แชท..."} 
                className="flex-1 bg-slate-100 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none border focus:border-orange-400"
              />
              <button type="submit" className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-5 py-2.5 rounded-xl font-bold shadow-md active:scale-95 transition">
                ส่ง
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white/90 backdrop-blur-md border-t flex justify-around py-2.5 px-2 z-50 shadow-lg">
        <button onClick={() => setActiveTab('swipe')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'swipe' ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
          <span className="text-base">🔥</span>
          <span className="text-[10px]">ปัดเพื่อน</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'profile' ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
          <span className="text-base">👤</span>
          <span className="text-[10px]">ตัวตนฉัน</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'chat' ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
          <span className="text-base">💬</span>
          <span className="text-[10px]">ห้องแชท</span>
        </button>
      </nav>
    </div>
  );
}
