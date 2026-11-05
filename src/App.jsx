import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// คีย์จาก Project Settings ในภาพของคุณ (projectId: tinntuu-tu)
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

  useEffect(() => {
    signInAnonymously(auth)
      .then(res => setUser(res.user))
      .catch(err => console.error("Auth error:", err));
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'global_chat'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    }, (err) => console.error("Firestore error:", err));
    return () => unsubscribe();
  }, [user]);

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await addDoc(collection(db, 'global_chat'), {
        text: inputText,
        senderId: user ? user.uid : 'anonymous',
        createdAt: serverTimestamp()
      });
      setInputText('');
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const profiles = [
    { name: 'ข้าวฟ่าง', faculty: 'ศิลปศาสตร์ ปี 2', bio: 'หาเพื่อนติวอิ้ง มธ. คุยเล่นได้หมดดด 🇰🇷', tags: ['เด็กหอ', 'ติ่งเกาหลี'] },
    { name: 'เคน', faculty: 'วิศวกรรมศาสตร์ ปี 3', bio: 'เด็กหอเชียงราก หาคนแชร์ค่าบอร์ดเกมครับ 🎲', tags: ['SIIT', 'บอร์ดเกม'] }
  ];
  const [profileIndex, setProfileIndex] = useState(0);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col justify-between shadow-xl font-sans pb-16">
      <header className="bg-gradient-to-r from-orange-500 to-red-600 p-4 text-white flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-black">TinnTuu 🐱</h1>
          <p className="text-[10px] text-orange-100">คอมมูนิตี้เด็กธรรมศาสตร์</p>
        </div>
        <div className="bg-black/20 px-3 py-1 rounded-full text-xs font-bold">
          {points} แต้ม
        </div>
      </header>

      <main className="p-4 flex-1 flex flex-col">
        {activeTab === 'swipe' && (
          <div className="flex-1 flex flex-col justify-center items-center">
            {profileIndex < profiles.length ? (
              <div className="w-full bg-white rounded-3xl shadow-lg border p-5 flex flex-col justify-between">
                <div>
                  <span className="bg-orange-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                    {profiles[profileIndex].faculty}
                  </span>
                  <h2 className="text-2xl font-bold mt-3">{profiles[profileIndex].name}</h2>
                  <p className="text-slate-600 text-sm mt-2">{profiles[profileIndex].bio}</p>
                </div>
                <div className="flex justify-center gap-4 mt-6">
                  <button onClick={() => setProfileIndex(p => p + 1)} className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold">ข้าม</button>
                  <button onClick={() => { alert('แมตช์สำเร็จ!'); setProfileIndex(p => p + 1); }} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold">ถูกใจ ❤️</button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-md font-bold text-slate-800">ปัดครบทุกคนแล้ว!</h3>
                <button onClick={() => setProfileIndex(0)} className="mt-3 bg-red-600 text-white px-5 py-2 rounded-xl text-xs font-bold">เริ่มใหม่</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col bg-white rounded-2xl border h-[450px]">
            <div className="p-3 bg-slate-50 border-b text-xs font-bold text-slate-700">
              ห้องแชทรวมเด็ก มธ. Real-time
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {messages.map((m) => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-2.5 rounded-2xl text-xs max-w-[80%] ${isMe ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={sendMessage} className="p-2 border-t flex gap-2">
              <input 
                type="text" 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
                placeholder="พิมพ์ข้อความ..." 
                className="flex-1 bg-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-none"
              />
              <button type="submit" className="bg-red-600 text-white text-xs px-4 py-2 rounded-xl font-bold">ส่ง</button>
            </form>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 max-w-md w-full bg-white border-t flex justify-around p-3 z-50">
        <button onClick={() => setActiveTab('swipe')} className={`text-xs font-bold ${activeTab === 'swipe' ? 'text-red-600' : 'text-slate-400'}`}>ปัดเพื่อน</button>
        <button onClick={() => setActiveTab('chat')} className={`text-xs font-bold ${activeTab === 'chat' ? 'text-red-600' : 'text-slate-400'}`}>ห้องแชท</button>
      </nav>
    </div>
  );
}
