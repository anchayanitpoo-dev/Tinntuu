import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, limit, serverTimestamp, setDoc, doc,
  enableIndexedDbPersistence, where, getDocs, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';

// 1. ใส่ Firebase Config ของคุณที่นี่ (เหมือนเดิม)
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

export default function App() {
  // --- States ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [activeTab, setActiveTab] = useState('swipe');
  const [allProfiles, setAllProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  
  const [myProfile, setMyProfile] = useState({ name: '', faculty: '', location: '', bio: '', img: '', tags: '' });
  const [hasProfile, setHasProfile] = useState(false);

  // States สำหรับ Chat
  const [matches, setMatches] = useState([]); // รายการคนที่แมตช์
  const [activeChatType, setActiveChatType] = useState('list'); // 'list', 'private', 'group_list', 'group_chat'
  const [currentChatId, setCurrentChatId] = useState(null); // ID ห้องแชทที่กำลังคุย
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  // States สำหรับ Group Chat
  const [groupRooms, setGroupRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');

  // --- Effects ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    // ดึงโปรไฟล์ทั้งหมด (เหมือนเดิม)
    const qProfiles = query(collection(db, 'users'), limit(100));
    const unsubProfiles = onSnapshot(qProfiles, (snapshot) => {
      const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProfiles(profiles);
      const myDoc = profiles.find(p => p.uid === user.uid);
      if (myDoc) { setMyProfile(myDoc); setHasProfile(true); } 
      else { setHasProfile(false); setActiveTab('profile'); }
    });

    // ดึงรายการ Matches ของตัวเอง
    const qMatches1 = query(collection(db, 'matches'), where('user1_id', '==', user.uid));
    const qMatches2 = query(collection(db, 'matches'), where('user2_id', '==', user.uid));
    
    // (Note: Firestore requires composite indexes for complex OR queries, simplified for now)
    const fetchMatches = async () => {
        const m1 = await getDocs(qMatches1);
        const m2 = await getDocs(qMatches2);
        const allMatches = [...m1.docs, ...m2.docs].map(doc => ({ id: doc.id, ...doc.data() }));
        setMatches(allMatches);
    }
    fetchMatches();

    // ดึงรายการห้องแชทกลุ่ม
    const qGroups = query(collection(db, 'group_chats'));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
        const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroupRooms(groups);
    });

    return () => { unsubProfiles(); unsubGroups(); };
  }, [user]);

  // ดึงข้อความแชท (Private หรือ Group)
  useEffect(() => {
    if (!user || !currentChatId || (activeChatType !== 'private' && activeChatType !== 'group_chat')) return;

    let collectionPath = '';
    if (activeChatType === 'private') collectionPath = `private_chats/${currentChatId}/messages`;
    if (activeChatType === 'group_chat') collectionPath = `group_messages/${currentChatId}/messages`;

    const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [user, currentChatId, activeChatType]);


  // --- Handlers ---
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert('กรุณากรอกข้อมูล');
    try {
      if (isLoginMode) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { alert(err.message); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user || !myProfile.name) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { ...myProfile, uid: user.uid, updatedAt: serverTimestamp() }, { merge: true });
      setHasProfile(true);
      alert('บันทึกโปรไฟล์สำเร็จ!');
    } catch (err) { alert('Error saving profile'); }
  };

  // จำลองการแมตช์ (เมื่อกดถูกใจ)
  const handleLike = async (likedUserId) => {
    try {
        // ในระบบจริง ต้องเช็คว่าเขาไลก์เรากลับไหม (Mutual Like) 
        // แต่เพื่อการทดสอบ จะให้แมตช์ทันทีเมื่อกดถูกใจ
        const matchRef = await addDoc(collection(db, 'matches'), {
            user1_id: user.uid,
            user2_id: likedUserId,
            matchedAt: serverTimestamp()
        });
        alert('🎉 แมตช์สำเร็จ! สร้างห้องแชทแล้ว');
        setProfileIndex(p => p + 1);
        
        // รีเฟรชรายการ Match
        const m1 = await getDocs(query(collection(db, 'matches'), where('user1_id', '==', user.uid)));
        const m2 = await getDocs(query(collection(db, 'matches'), where('user2_id', '==', user.uid)));
        setMatches([...m1.docs, ...m2.docs].map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (err) { console.error(err); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentChatId) return;
    const text = inputText;
    setInputText('');
    
    let collectionPath = '';
    if (activeChatType === 'private') collectionPath = `private_chats/${currentChatId}/messages`;
    if (activeChatType === 'group_chat') collectionPath = `group_messages/${currentChatId}/messages`;

    try {
      await addDoc(collection(db, collectionPath), {
        text, senderId: user.uid, senderName: myProfile.name, createdAt: serverTimestamp()
      });
    } catch (err) { console.error(err); }
  };

  // Group Chat Handlers
  const createGroupRoom = async () => {
      if (!newRoomName.trim()) return;
      try {
          await addDoc(collection(db, 'group_chats'), {
              room_name: newRoomName,
              creator_id: user.uid,
              members: [user.uid], // สร้างปุ๊บ เป็นสมาชิกปั๊บ
              pending_requests: []
          });
          setNewRoomName('');
          alert('สร้างห้องแชทกลุ่มสำเร็จ');
      } catch (err) { console.error(err); }
  };

  const requestJoinGroup = async (roomId) => {
      try {
          const roomRef = doc(db, 'group_chats', roomId);
          await updateDoc(roomRef, {
              pending_requests: arrayUnion(user.uid)
          });
          alert('ส่งคำขอเข้าร่วมห้องแล้ว รอเจ้าของห้องอนุมัติ');
      } catch (err) { console.error(err); }
  };

  const approveJoinRequest = async (roomId, requesterId) => {
    try {
        const roomRef = doc(db, 'group_chats', roomId);
        await updateDoc(roomRef, {
            members: arrayUnion(requesterId),
            pending_requests: arrayRemove(requesterId)
        });
        alert('อนุมัติผู้ใช้เข้าห้องสำเร็จ');
    } catch (err) { console.error(err); }
  };


  const othersProfiles = allProfiles.filter(p => p.uid !== user?.uid);

  // --- Renders ---
  if (authLoading) return <div>Loading...</div>;
  if (!user) return ( /* Render Login Form (เหมือนเดิม) */ 
    <div className="max-w-md mx-auto min-h-screen bg-slate-100 flex flex-col justify-center p-6">
        <form onSubmit={handleAuth} className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">{isLoginMode ? 'Login' : 'Register'}</h2>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="border p-2 w-full mb-2 rounded" />
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="border p-2 w-full mb-4 rounded" />
            <button type="submit" className="bg-blue-500 text-white w-full py-2 rounded">{isLoginMode ? 'Login' : 'Register'}</button>
            <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="w-full mt-2 text-sm text-blue-500">Toggle Mode</button>
        </form>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col font-sans pb-20 shadow-lg relative">
      <header className="bg-white text-slate-800 px-5 py-4 flex justify-between items-center sticky top-0 z-50 border-b border-slate-200">
        <h1 className="text-xl font-bold text-red-500">TinnTuu</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        
        {/* TAB 1: SWIPE */}
        {activeTab === 'swipe' && (
          <div className="flex flex-col items-center">
            {othersProfiles.length > 0 && profileIndex < othersProfiles.length ? (
                <div className="w-full bg-white rounded-2xl shadow-md overflow-hidden">
                    <img src={othersProfiles[profileIndex].img || 'https://via.placeholder.com/400'} alt="profile" className="w-full h-[400px] object-cover" />
                    <div className="p-4">
                        <h2 className="text-xl font-bold">{othersProfiles[profileIndex].name}</h2>
                        <p className="text-sm text-gray-500">{othersProfiles[profileIndex].bio}</p>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setProfileIndex(p => p + 1)} className="flex-1 bg-gray-200 py-2 rounded font-bold">ข้าม</button>
                            <button onClick={() => handleLike(othersProfiles[profileIndex].uid)} className="flex-1 bg-red-500 text-white py-2 rounded font-bold">ถูกใจ</button>
                        </div>
                    </div>
                </div>
            ) : <p className="text-center mt-10">ไม่มีโปรไฟล์ใหม่ให้ปัดแล้ว</p>}
          </div>
        )}

        {/* TAB 2: CHATS (Private & Groups) */}
        {activeTab === 'chat' && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col">
                
                {/* Chat Navigation */}
                <div className="flex bg-gray-100 p-2 gap-2 text-sm font-bold">
                    <button onClick={() => setActiveChatType('list')} className={`flex-1 py-2 rounded ${activeChatType === 'list' || activeChatType === 'private' ? 'bg-white shadow' : ''}`}>แชทส่วนตัว</button>
                    <button onClick={() => setActiveChatType('group_list')} className={`flex-1 py-2 rounded ${activeChatType === 'group_list' || activeChatType === 'group_chat' ? 'bg-white shadow' : ''}`}>แชทกลุ่ม</button>
                </div>

                {/* --- Private Chat List --- */}
                {activeChatType === 'list' && (
                    <div className="p-4">
                        <h3 className="font-bold mb-4">คนที่คุณแมตช์ด้วย ({matches.length})</h3>
                        {matches.map(m => {
                            // หา UID ของอีกฝ่าย
                            const otherUid = m.user1_id === user.uid ? m.user2_id : m.user1_id;
                            const otherProfile = allProfiles.find(p => p.uid === otherUid);
                            if(!otherProfile) return null;
                            return (
                                <div key={m.id} onClick={() => { setCurrentChatId(m.id); setActiveChatType('private'); }} className="flex items-center gap-3 p-3 border-b cursor-pointer hover:bg-gray-50">
                                    <img src={otherProfile.img || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full object-cover" />
                                    <span className="font-semibold">{otherProfile.name}</span>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* --- Group Chat List --- */}
                {activeChatType === 'group_list' && (
                    <div className="p-4 flex flex-col h-full">
                        <h3 className="font-bold mb-4">ห้องแชทกลุ่ม</h3>
                        <div className="flex gap-2 mb-4">
                            <input value={newRoomName} onChange={e=>setNewRoomName(e.target.value)} placeholder="ชื่อห้องใหม่" className="border p-2 rounded flex-1 text-sm" />
                            <button onClick={createGroupRoom} className="bg-blue-500 text-white px-3 rounded text-sm">สร้างห้อง</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {groupRooms.map(room => {
                                const isMember = room.members?.includes(user.uid);
                                const isPending = room.pending_requests?.includes(user.uid);
                                const isCreator = room.creator_id === user.uid;

                                return (
                                <div key={room.id} className="border p-3 rounded mb-2 bg-gray-50">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold">{room.room_name} <span className="text-xs text-gray-500">({room.members?.length || 0} คน)</span></h4>
                                        
                                        {isMember ? (
                                            <button onClick={() => { setCurrentChatId(room.id); setActiveChatType('group_chat'); }} className="bg-green-500 text-white text-xs px-2 py-1 rounded">เข้าห้อง</button>
                                        ) : isPending ? (
                                            <span className="text-xs text-orange-500">รออนุมัติ...</span>
                                        ) : (
                                            <button onClick={() => requestJoinGroup(room.id)} className="bg-blue-500 text-white text-xs px-2 py-1 rounded">ขอเข้าร่วม</button>
                                        )}
                                    </div>
                                    
                                    {/* ส่วนจัดการคำขอเข้าห้อง (เฉพาะคนสร้าง) */}
                                    {isCreator && room.pending_requests?.length > 0 && (
                                        <div className="mt-2 pt-2 border-t text-xs">
                                            <p className="font-bold text-orange-600 mb-1">รออนุมัติ:</p>
                                            {room.pending_requests.map(reqUid => {
                                                const reqProfile = allProfiles.find(p => p.uid === reqUid);
                                                return (
                                                    <div key={reqUid} className="flex justify-between items-center bg-white p-1 rounded border mb-1">
                                                        <span>{reqProfile?.name || 'Unknown'}</span>
                                                        <button onClick={() => approveJoinRequest(room.id, reqUid)} className="bg-green-500 text-white px-2 py-1 rounded">รับเข้า</button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    </div>
                )}

                {/* --- Chat Room Area (Private & Group) --- */}
                {(activeChatType === 'private' || activeChatType === 'group_chat') && (
                    <div className="flex flex-col h-[500px]">
                        <div className="p-3 bg-gray-200 flex items-center font-bold">
                            <button onClick={() => setActiveChatType(activeChatType === 'private' ? 'list' : 'group_list')} className="mr-3 text-red-500">{'< กลับ'}</button>
                            <span>{activeChatType === 'private' ? 'แชทส่วนตัว' : 'แชทกลุ่ม'}</span>
                        </div>
                        <div className="flex-1 p-3 overflow-y-auto bg-gray-50 flex flex-col gap-2">
                            {messages.map(m => (
                                <div key={m.id} className={`max-w-[80%] p-2 rounded-lg text-sm ${m.senderId === user.uid ? 'bg-red-500 text-white self-end rounded-br-none' : 'bg-white border self-start rounded-bl-none'}`}>
                                    {activeChatType === 'group_chat' && m.senderId !== user.uid && <div className="text-[10px] text-gray-500 mb-1">{m.senderName}</div>}
                                    {m.text}
                                </div>
                            ))}
                        </div>
                        <form onSubmit={sendMessage} className="p-2 border-t flex gap-2">
                            <input value={inputText} onChange={e=>setInputText(e.target.value)} className="flex-1 border p-2 rounded text-sm" placeholder="พิมพ์ข้อความ..." />
                            <button className="bg-red-500 text-white px-4 rounded font-bold">ส่ง</button>
                        </form>
                    </div>
                )}
            </div>
        )}

        {/* TAB 3: PROFILE (หน้าแก้ไขโปรไฟล์ย้ายมาที่นี่) */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">แก้ไขโปรไฟล์</h2>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
                <input type="text" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} placeholder="ชื่อ / ชื่อเล่น" className="border p-2 rounded" required />
                <input type="text" value={myProfile.faculty} onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} placeholder="คณะ" className="border p-2 rounded" />
                <textarea value={myProfile.bio} onChange={e => setMyProfile({...myProfile, bio: e.target.value})} placeholder="แนะนำตัวสั้นๆ..." className="border p-2 rounded h-24" />
                <input type="text" value={myProfile.img} onChange={e => setMyProfile({...myProfile, img: e.target.value})} placeholder="URL รูปภาพโปรไฟล์ (หรือใช้การอัปโหลดไฟล์ในเวอร์ชันจริง)" className="border p-2 rounded text-xs" />
                <button type="submit" className="bg-blue-600 text-white py-2 rounded font-bold mt-2">บันทึกโปรไฟล์</button>
                <button type="button" onClick={() => signOut(auth)} className="bg-red-100 text-red-600 py-2 rounded font-bold mt-4 border border-red-200">ออกจากระบบ</button>
            </form>
          </div>
        )}
      </main>

      {/* Nav */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white border-t flex justify-around p-3 text-sm font-bold text-gray-500">
        <button onClick={() => setActiveTab('swipe')} className={activeTab === 'swipe' ? 'text-red-500' : ''}>ปัดเพื่อน</button>
        <button onClick={() => setActiveTab('chat')} className={activeTab === 'chat' ? 'text-red-500' : ''}>แชท</button>
        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-red-500' : ''}>โปรไฟล์</button>
      </nav>
    </div>
  );
}
