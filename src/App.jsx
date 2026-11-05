import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  Heart, X, MessageSquare, Sparkles, Trophy, Target, 
  Crown, Cat, Volume2, Send, PawPrint 
} from 'lucide-react';

// 🛠️ คีย์ Firebase ของคุณ tinntuu-tu
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
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [points, setPoints] = useState(120);
  const [isPremium, setIsPremium] = useState(false);
  const [showAiHelper, setShowAiHelper] = useState(false);

  // เข้าสู่ระบบ Anonymous อัตโนมัติ
  useEffect(() => {
    signInAnonymously(auth)
      .then(res => setUser(res.user))
      .catch(err => console.error("Auth error:", err));
  }, []);

  // ดึงข้อความ Real-time จาก Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'global_chat'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [user]);

  // ส่งข้อความลง Firestore
  const sendMessage = async (textToSend, isVoice = false) => {
    const text = textToSend || inputText;
    if (!text.trim() && !isVoice) return;

    try {
      await addDoc(collection(db, 'global_chat'), {
        text: isVoice ? 'ข้อความเสียง (0:05)' : text,
        senderId: user ? user.uid : 'anonymous',
        isVoice: isVoice,
        createdAt: serverTimestamp()
      });
      setInputText('');
      setShowAiHelper(false);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const profiles = [
    { name: 'ข้าวฟ่าง', faculty: 'ศิลปศาสตร์ ปี 2', bio: 'หาเพื่อนติวอิ้ง มธ. คุยเล่นได้หมดดด 🇰🇷', tags: ['เด็กหอ', 'ติ่งเกาหลี'] },
    { name: 'เคน', faculty: 'วิศวกรรมศาสตร์ ปี 3', bio: 'เด็กหอเชียงราก หาคนแชร์ค่าบอร์ดเกมครับ 🎲', tags: ['SIIT', 'บอร์ดเกม'] }
  ];
  const [profileIndex, setProfileIndex] = useState(0);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col justify-between shadow-xl font-sans pb-16">
      
      {/* HEADER */}
      <header className="bg-gradient-to-r from-orange-500 via-red-600 to-rose-600 p-4 text-white flex justify-between items-center sticky top-0 z-50 rounded-b-2xl shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1.5 rounded-full shadow-inner">
            <Cat className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-1">
              TinnTuu {isPremium && <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />}
            </h1>
            <p className="text-[10px] text-orange-100 font-medium">เด็กธรรมศาสตร์ชวนคุย 🐱💬</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
          <Trophy className="w-4 h-4 text-amber-300" />
          <span className="text-xs font-bold">{points} แต้ม</span>
        </div>
      </header>

      {/* MAIN BODY */}
      <main className="p-4 flex-1 flex flex-col">
        
        {/* TAB 1: SWIPE */}
        {activeTab === 'swipe' && (
          <div className="flex-1 flex flex-col justify-center items-center">
            {profileIndex < profiles.length ? (
              <div className="w-full bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden flex flex-col">
                <div className="h-64 bg-gradient-to-br from-orange-500 to-red-600 p-6 flex flex-col justify-between text-white">
                  <span className="bg-black/30 px-3 py-1 rounded-full text-xs font-semibold self-start">
                    {profiles[profileIndex].faculty}
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold">{profiles[profileIndex].name}</h2>
                    <p className="text-xs text-orange-100">มหาวิทยาลัยธรรมศาสตร์</p>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-slate-700 text-sm">{profiles[profileIndex].bio}</p>
                  <div className="flex gap-2">
                    {profiles[profileIndex].tags.map((t, i) => (
                      <span key={i} className="bg-orange-50 text-red-600 text-xs px-2.5 py-1 rounded-lg border border-orange-100">#{t}</span>
                    ))}
                  </div>
                  <div className="flex justify-center gap-6 pt-2">
                    <button onClick={() => setProfileIndex(p => p + 1)} className="w-14 h-14 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center shadow">
                      <X className="w-6 h-6" />
                    </button>
                    <button onClick={() => { alert('แมตช์สำเร็จ!'); setProfileIndex(p => p + 1); }} className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                      <Heart className="w-8 h-8 fill-white" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <PawPrint className="w-12 h-12 text-orange-400 mx-auto" />
                <h3 className="text-md font-bold text-slate-800">ปัดครบทุกคนแล้ว!</h3>
                <button onClick={() => setProfileIndex(0)} className="bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-bold">เริ่มใหม่</button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHAT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-100 h-[480px] overflow-hidden">
            <div className="p-3 bg-slate-50 border-b flex justify-between items-center text-xs font-bold text-slate-700">
              <span>ห้องรวมเด็ก มธ. (Real-time Chat)</span>
              <span className="text-green-600">● เชื่อมต่อเรียบร้อย</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-slate-50/50">
              {messages.map((m) => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-2.5 rounded-2xl text-xs max-w-[80%] ${isMe ? 'bg-red-600 text-white rounded-br-none' : 'bg-white border text-slate-800 rounded-bl-none'}`}>
                      {m.isVoice ? <div className="flex items-center gap-1"><Volume2 className="w-3.5 h-3.5" />{m.text}</div> : m.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI HELPER */}
            {showAiHelper && (
              <div className="p-2 bg-orange-50 border-t border-orange-200 space-y-1">
                <p className="text-[10px] font-bold text-red-600">💡 Meow AI แนะนำคำถาม:</p>
                {['เลิกเรียนแล้วไปหาไรกินเชียงรากไหม?', 'วิชา TU104 ตัวนี้อาจารย์เช็กชื่อไหม?'].map((prompt, i) => (
                  <button key={i} onClick={() => sendMessage(prompt)} className="w-full text-left text-[11px] bg-white p-1.5 rounded border text-slate-700">
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* INPUT BAR */}
            <div className="p-2 border-t bg-white flex items-center gap-1.5">
              <button onClick={() => setShowAiHelper(!showAiHelper)} className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                <Sparkles className="w-4 h-4" />
              </button>
              <input 
                type="text" 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
                placeholder="พิมพ์ข้อความ..." 
                className="flex-1 bg-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-none"
              />
              <button onClick={() => sendMessage(null, true)} className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                <Volume2 className="w-4 h-4" />
              </button>
              <button onClick={() => sendMessage()} className="p-2 bg-red-600 text-white rounded-xl">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: MISSIONS */}
        {activeTab === 'missions' && (
          <div className="space-y-3">
            <h2 className="font-bold text-slate-800 text-sm">ภารกิจสะสมแต้ม 🎯</h2>
            <div className="bg-white p-3 rounded-2xl border flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold">ส่งข้อความหาเพื่อนในแชทรวม</h4>
                <span className="text-[10px] text-orange-600 font-semibold">+50 แต้ม</span>
              </div>
              <button onClick={() => setPoints(p => p + 50)} className="bg-orange-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold">
                รับรางวัล
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: PREMIUM */}
        {activeTab === 'premium' && (
          <div className="bg-white p-5 rounded-3xl border text-center space-y-3">
            <Crown className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-md font-bold">TinnTuu Premium</h2>
            <p className="text-xs text-slate-500">สมัครเพื่อรับตรามงกุฎและปัดไม่จำกัด เพียง 49 บาท/เดือน</p>
            <button onClick={() => setIsPremium(true)} className="w-full bg-red-600 text-white text-xs py-2.5 rounded-xl font-bold">
              {isPremium ? 'คุณเป็นสมาชิก Premium แล้ว' : 'สมัครสมาชิก 49 บาท / เดือน'}
            </button>
          </div>
        )}

      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white border-t flex justify-around p-2 z-50">
        <button onClick={() => setActiveTab('swipe')} className={`flex flex-col items-center text-[10px] ${activeTab === 'swipe' ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
          <Heart className="w-5 h-5" /> ปัดเพื่อน
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center text-[10px] ${activeTab === 'chat' ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
          <MessageSquare className="w-5 h-5" /> ห้องแชท
        </button>
        <button onClick={() => setActiveTab('missions')} className={`flex flex-col items-center text-[10px] ${activeTab === 'missions' ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
          <Target className="w-5 h-5" /> ภารกิจ
        </button>
        <button onClick={() => setActiveTab('premium')} className={`flex flex-col items-center text-[10px] ${activeTab === 'premium' ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
          <Crown className="w-5 h-5" /> พรีเมียม
        </button>
      </nav>

    </div>
  );
}
