import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, limit, serverTimestamp, setDoc, doc,
  enableIndexedDbPersistence, where, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';

// 1. Firebase Config
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
  // --- Auth States ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  // --- App States ---
  const [activeTab, setActiveTab] = useState('swipe'); 
  const [allProfiles, setAllProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  
  const [myProfile, setMyProfile] = useState({ name: '', faculty: 'พาณิชยศาสตร์และการบัญชี', location: 'หอพักเชียงราก', bio: '', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80', tags: 'สายคาเฟ่' });
  const [hasProfile, setHasProfile] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // --- Chat States ---
  const [matches, setMatches] = useState([]);
  const [activeChatType, setActiveChatType] = useState('list'); // list, private, group_list, group_chat
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [groupRooms, setGroupRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');

  // --- Practice & Missions ---
  const [selectedScenario, setSelectedScenario] = useState('ev_bus');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [points, setPoints] = useState(0);
  const [dailyMission, setDailyMission] = useState({ title: '', reward: 0, done: false });

  // 1. Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Data
  useEffect(() => {
    if (!user) return;
    
    // Fetch Profiles
    const qProfiles = query(collection(db, 'users'), limit(100));
    const unsubProfiles = onSnapshot(qProfiles, (snapshot) => {
      const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProfiles(profiles);
      const myDoc = profiles.find(p => p.uid === user.uid);
      if (myDoc) { 
        setMyProfile(myDoc); 
        setHasProfile(true);
        setIsOnboarding(false);
      } else { 
        setHasProfile(false); 
        setIsOnboarding(true); 
      }
    });

    // Fetch Matches (using array-contains for optimization)
    const qMatches = query(collection(db, 'matches'), where('participants', 'array-contains', user.uid));
    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
        const allMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMatches(allMatches);
    });

    // Fetch Group Chats
    const qGroups = query(collection(db, 'group_chats'));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
        const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroupRooms(groups);
    });

    // Generate Dynamic Daily Mission based on Day of Week
    const day = new Date().getDay();
    const missions = [
        { title: 'เช็กอินวันอาทิตย์: ส่งข้อความในกลุ่ม', reward: 30 },
        { title: 'เริ่มวันจันทร์: ปัดโปรไฟล์หาเพื่อนใหม่ 3 คน', reward: 20 },
        { title: 'วันอังคาร: อัปเดต Bio ของคุณใหม่', reward: 15 },
        { title: 'วันพุธ: เข้าร่วมห้องแชทกลุ่ม 1 ห้อง', reward: 25 },
        { title: 'วันพฤหัสบดี: ทดสอบระบบจำลอง Voice Call', reward: 20 },
        { title: 'ศุกร์หรรษา: ส่งข้อความทักทายคนที่แมตช์', reward: 30 },
        { title: 'วันเสาร์: ทดลองใช้ AI ช่วยคิดประโยค', reward: 15 },
    ];
    setDailyMission({ ...missions[day], done: localStorage.getItem(`mission_${day}_${new Date().toDateString()}`) === 'true' });

    return () => { unsubProfiles(); unsubMatches(); unsubGroups(); };
  }, [user]);

  // 3. Fetch Active Chat Messages
  useEffect(() => {
    if (!user || !currentChatId || (activeChatType !== 'private' && activeChatType !== 'group_chat')) return;
    const collectionPath = activeChatType === 'private' ? `private_chats/${currentChatId}/messages` : `group_messages/${currentChatId}/messages`;
    const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse());
    });
    return () => unsubscribe();
  }, [user, currentChatId, activeChatType]);

  // 4. Voice Call Timer
  useEffect(() => {
    let interval;
    if (isCalling) interval = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    else setCallTimer(0);
    return () => clearInterval(interval);
  }, [isCalling]);


  // --- Action Handlers ---
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert('Please enter email and password');
    try {
      if (isLoginMode) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { alert(err.message); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMyProfile({ ...myProfile, img: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user || !myProfile.name) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { ...myProfile, uid: user.uid, updatedAt: serverTimestamp() }, { merge: true });
      setHasProfile(true);
      if (isOnboarding) {
          setIsOnboarding(false);
          setActiveTab('swipe');
      } else {
          alert('Profile updated successfully');
      }
    } catch (err) { alert('Error saving profile'); }
  };

  const handleLike = async (likedUserId) => {
    try {
        await addDoc(collection(db, 'matches'), {
            participants: [user.uid, likedUserId],
            matchedAt: serverTimestamp()
        });
        alert('Match created successfully');
        setProfileIndex(p => p + 1);
    } catch (err) { console.error(err); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentChatId) return;
    const text = inputText;
    setInputText('');
    const collectionPath = activeChatType === 'private' ? `private_chats/${currentChatId}/messages` : `group_messages/${currentChatId}/messages`;
    try {
      await addDoc(collection(db, collectionPath), {
        text, senderId: user.uid, senderName: myProfile.name, createdAt: serverTimestamp()
      });
    } catch (err) { console.error(err); }
  };

  const createGroupRoom = async () => {
      if (!newRoomName.trim()) return;
      try {
          await addDoc(collection(db, 'group_chats'), {
              room_name: newRoomName, creator_id: user.uid, members: [user.uid], pending_requests: []
          });
          setNewRoomName('');
      } catch (err) { console.error(err); }
  };

  const requestJoinGroup = async (roomId) => {
      try {
          await updateDoc(doc(db, 'group_chats', roomId), { pending_requests: arrayUnion(user.uid) });
          alert('Join request sent to the admin');
      } catch (err) { console.error(err); }
  };

  const approveJoinRequest = async (roomId, requesterId) => {
    try {
        await updateDoc(doc(db, 'group_chats', roomId), { members: arrayUnion(requesterId), pending_requests: arrayRemove(requesterId) });
    } catch (err) { console.error(err); }
  };

  const completeMission = () => {
      if (dailyMission.done) return;
      const day = new Date().getDay();
      localStorage.setItem(`mission_${day}_${new Date().toDateString()}`, 'true');
      setDailyMission({ ...dailyMission, done: true });
      setPoints(p => p + dailyMission.reward);
  };

  const generateAiNextQuestion = () => {
    const questions = [
      "Midterm period: Do you prefer studying at SC building or your dorm?",
      "What is your go-to restaurant at Chiangrak?",
      "Which EV bus line do you usually take?",
      "Are you staying at the dorm this weekend or going home?"
    ];
    setAiSuggestion(questions[Math.floor(Math.random() * questions.length)]);
  };

  const othersProfiles = allProfiles.filter(p => p.uid !== user?.uid);

  // --- View: Loading ---
  if (authLoading) return <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white font-sans uppercase tracking-widest text-sm">Loading System...</div>;

  // --- View: Authentication (Modern Black/Red) ---
  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-white font-sans">
        <div className="w-full">
          <div className="mb-10">
            <h1 className="text-4xl font-black text-red-600 tracking-tighter mb-1">TINNTUU</h1>
            <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Thammasat Exclusive</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-800 px-4 py-3.5 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors" required />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-800 px-4 py-3.5 rounded-lg text-white focus:outline-none focus:border-red-600 transition-colors" required />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white font-bold py-4 rounded-lg shadow-lg hover:from-red-600 hover:to-red-500 transition-all uppercase tracking-wider text-sm mt-4">
              {isLoginMode ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full text-center text-xs text-slate-500 font-medium mt-8 hover:text-white transition-colors">
            {isLoginMode ? 'Need an account? Register' : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    );
  }

  // --- View: Onboarding (Force Create Profile) ---
  if (isOnboarding) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 p-6 flex flex-col font-sans">
        <div className="mt-10 mb-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Profile</h1>
            <p className="text-sm text-slate-500 mt-1">Set up your identity before exploring.</p>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4 text-sm flex-1">
            <div className="flex flex-col mb-4">
                <div className="w-24 h-24 bg-slate-200 rounded-lg overflow-hidden mb-3 border border-slate-300">
                {myProfile.img && <img src={myProfile.img} alt="preview" className="w-full h-full object-cover" />}
                </div>
                <label className="text-red-600 font-bold text-xs cursor-pointer uppercase tracking-wider">
                Upload Photo
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
            </div>
            <div>
                <label className="font-bold text-slate-700 block mb-1">Display Name</label>
                <input type="text" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full bg-white p-3.5 rounded-lg border border-slate-200 focus:outline-none focus:border-red-500" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                <label className="font-bold text-slate-700 block mb-1">Faculty</label>
                <input type="text" value={myProfile.faculty} onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} className="w-full bg-white p-3.5 rounded-lg border border-slate-200 focus:outline-none focus:border-red-500" />
                </div>
                <div>
                <label className="font-bold text-slate-700 block mb-1">Dorm / Zone</label>
                <input type="text" value={myProfile.location} onChange={e => setMyProfile({...myProfile, location: e.target.value})} className="w-full bg-white p-3.5 rounded-lg border border-slate-200 focus:outline-none focus:border-red-500" />
                </div>
            </div>
            <div>
                <label className="font-bold text-slate-700 block mb-1">Bio</label>
                <textarea value={myProfile.bio} onChange={e => setMyProfile({...myProfile, bio: e.target.value})} rows={3} className="w-full bg-white p-3.5 rounded-lg border border-slate-200 focus:outline-none focus:border-red-500 resize-none" />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg mt-6 uppercase tracking-wider text-xs hover:bg-slate-800 transition-colors">
                Save & Continue
            </button>
        </form>
      </div>
    );
  }

  // --- View: Main Application ---
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col font-sans pb-[70px] shadow-2xl relative">
      
      {/* Header */}
      <header className="bg-slate-950 text-white px-5 py-4 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-black tracking-tighter text-red-600">TINNTUU</h1>
        </div>
        <div className="bg-slate-800 px-3 py-1.5 rounded text-xs font-bold text-orange-400">
          PTS: {points}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        
        {/* SWIPE TAB */}
        {activeTab === 'swipe' && (
          <div className="p-4 flex flex-col h-full justify-center">
            {othersProfiles.length > 0 && profileIndex < othersProfiles.length ? (
              <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="relative h-[480px] bg-slate-100">
                  <img src={othersProfiles[profileIndex].img} alt="profile" className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] px-3 py-1.5 rounded font-bold uppercase tracking-wider">
                    {othersProfiles[profileIndex].location || 'Thammasat'}
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent p-5 pt-20">
                    <h2 className="text-3xl font-black text-white">{othersProfiles[profileIndex].name}</h2>
                    <p className="text-sm text-slate-300 mt-1 mb-3">{othersProfiles[profileIndex].bio}</p>
                    <span className="bg-red-600 text-white font-bold text-[10px] px-2.5 py-1 rounded uppercase tracking-wider">
                      {othersProfiles[profileIndex].faculty}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-white flex gap-3">
                  <button onClick={() => setProfileIndex(p => p + 1)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors">
                    Pass
                  </button>
                  <button onClick={() => handleLike(othersProfiles[profileIndex].uid)} className="flex-1 py-4 bg-red-600 text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-colors">
                    Match
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 px-6">
                <div className="w-12 h-12 border-4 border-slate-900 rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">End of List</h3>
                <p className="text-sm text-slate-500 mt-2">Check back later for more profiles.</p>
                <button onClick={() => setProfileIndex(0)} className="mt-6 bg-slate-900 text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider">Reload Profiles</button>
              </div>
            )}
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
            <div className="flex flex-col h-full bg-white">
                <div className="flex border-b border-slate-200 text-xs font-bold uppercase tracking-wider">
                    <button onClick={() => setActiveChatType('list')} className={`flex-1 py-4 transition-colors ${activeChatType === 'list' || activeChatType === 'private' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Matches</button>
                    <button onClick={() => setActiveChatType('group_list')} className={`flex-1 py-4 transition-colors ${activeChatType === 'group_list' || activeChatType === 'group_chat' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Groups</button>
                </div>

                {/* Private List */}
                {activeChatType === 'list' && (
                    <div className="p-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Private Conversations</div>
                        {matches.length === 0 ? (
                            <div className="text-sm text-slate-500 text-center py-10">No matches yet. Keep swiping.</div>
                        ) : matches.map(m => {
                            const otherUid = m.participants.find(uid => uid !== user.uid);
                            const otherProfile = allProfiles.find(p => p.uid === otherUid);
                            if(!otherProfile) return null;
                            return (
                                <div key={m.id} onClick={() => { setCurrentChatId(m.id); setActiveChatType('private'); }} className="flex items-center gap-4 p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                    <img src={otherProfile.img} alt="avatar" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                                    <span className="font-bold text-sm text-slate-900">{otherProfile.name}</span>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Group List */}
                {activeChatType === 'group_list' && (
                    <div className="p-4 flex flex-col h-full">
                        <div className="flex gap-2 mb-6">
                            <input value={newRoomName} onChange={e=>setNewRoomName(e.target.value)} placeholder="New Group Name" className="border border-slate-200 bg-slate-50 p-3 rounded-lg flex-1 text-sm focus:outline-none focus:border-slate-400" />
                            <button onClick={createGroupRoom} className="bg-slate-900 text-white px-5 rounded-lg text-xs font-bold uppercase tracking-wider">Create</button>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Available Groups</div>
                        <div className="flex-1">
                            {groupRooms.map(room => {
                                const isMember = room.members?.includes(user.uid);
                                const isPending = room.pending_requests?.includes(user.uid);
                                const isCreator = room.creator_id === user.uid;

                                return (
                                <div key={room.id} className="border border-slate-200 p-4 rounded-xl mb-3 bg-white shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">{room.room_name}</h4>
                                            <div className="text-xs text-slate-500 mt-0.5">{room.members?.length || 0} Members</div>
                                        </div>
                                        
                                        {isMember ? (
                                            <button onClick={() => { setCurrentChatId(room.id); setActiveChatType('group_chat'); }} className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded">Enter</button>
                                        ) : isPending ? (
                                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Pending</span>
                                        ) : (
                                            <button onClick={() => requestJoinGroup(room.id)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded transition-colors">Request Join</button>
                                        )}
                                    </div>
                                    
                                    {isCreator && room.pending_requests?.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pending Approvals</p>
                                            {room.pending_requests.map(reqUid => {
                                                const reqProfile = allProfiles.find(p => p.uid === reqUid);
                                                return (
                                                    <div key={reqUid} className="flex justify-between items-center bg-slate-50 p-2 rounded mb-1">
                                                        <span className="text-xs font-bold text-slate-700">{reqProfile?.name || 'User'}</span>
                                                        <button onClick={() => approveJoinRequest(room.id, reqUid)} className="text-red-600 text-xs font-bold uppercase">Approve</button>
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

                {/* Chat Room Window */}
                {(activeChatType === 'private' || activeChatType === 'group_chat') && (
                    <div className="flex flex-col h-[calc(100vh-140px)]">
                        <div className="p-4 bg-white border-b border-slate-200 flex items-center shadow-sm z-10">
                            <button onClick={() => setActiveChatType(activeChatType === 'private' ? 'list' : 'group_list')} className="mr-4 text-slate-400 hover:text-slate-900 font-bold">&lt; Back</button>
                            <span className="font-bold text-sm uppercase tracking-wider text-slate-900">{activeChatType === 'private' ? 'Private Chat' : 'Group Chat'}</span>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3">
                            {messages.map(m => (
                                <div key={m.id} className={`max-w-[75%] p-3 text-sm rounded-xl ${m.senderId === user.uid ? 'bg-red-600 text-white self-end rounded-br-sm shadow-sm' : 'bg-white border border-slate-200 text-slate-800 self-start rounded-bl-sm shadow-sm'}`}>
                                    {activeChatType === 'group_chat' && m.senderId !== user.uid && <div className="text-[10px] text-slate-400 mb-1 font-bold">{m.senderName}</div>}
                                    {m.text}
                                </div>
                            ))}
                        </div>
                        <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                            <input value={inputText} onChange={e=>setInputText(e.target.value)} className="flex-1 bg-slate-100 border-transparent p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Type a message..." />
                            <button className="bg-slate-900 text-white px-5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors">Send</button>
                        </form>
                    </div>
                )}
            </div>
        )}

        {/* PRACTICE TAB */}
        {activeTab === 'practice' && (
          <div className="p-4 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-black text-slate-900 tracking-tight mb-1">AI Assistant</h2>
              <p className="text-xs text-slate-500 mb-5">Select a scenario to generate conversation starters.</p>

              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                <button onClick={() => setSelectedScenario('ev_bus')} className={`px-4 py-2 rounded text-xs font-bold tracking-wide transition-colors ${selectedScenario === 'ev_bus' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>EV Bus</button>
                <button onClick={() => setSelectedScenario('chiangrak')} className={`px-4 py-2 rounded text-xs font-bold tracking-wide transition-colors ${selectedScenario === 'chiangrak' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Chiangrak</button>
                <button onClick={() => setSelectedScenario('study')} className={`px-4 py-2 rounded text-xs font-bold tracking-wide transition-colors ${selectedScenario === 'study' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>SC Building</button>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg mb-4">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest block mb-2">Generated Phrase</span>
                <p className="text-sm text-slate-800 font-medium">
                  {aiSuggestion || 'Press generate to get started.'}
                </p>
              </div>
              <button onClick={generateAiNextQuestion} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors">
                Generate Phrase
              </button>
            </div>

            <div className="bg-slate-950 text-white p-6 rounded-xl shadow-lg border border-slate-800 text-center">
              <h4 className="text-sm font-black tracking-tight mb-1 text-red-500">Voice Simulation</h4>
              <p className="text-[11px] text-slate-400 mb-5">Practice speaking in real-time.</p>
              
              {isCalling ? (
                <div className="space-y-4">
                  <div className="text-white font-mono text-sm font-bold bg-slate-800 py-3 rounded-lg">
                    Active Call: {Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')}
                  </div>
                  <button onClick={() => setIsCalling(false)} className="bg-red-600 text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-700 w-full transition-colors">
                    End Call
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsCalling(true)} className="bg-white text-slate-900 px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-200 w-full transition-colors">
                  Start Voice Call
                </button>
              )}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="p-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-black text-slate-900 mb-6">Edit Profile</h2>
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 text-sm">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Display Name</label>
                        <input type="text" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:border-slate-400" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Faculty</label>
                            <input type="text" value={myProfile.faculty} onChange={e => setMyProfile({...myProfile, faculty: e.target.value})} className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:border-slate-400" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Location</label>
                            <input type="text" value={myProfile.location} onChange={e => setMyProfile({...myProfile, location: e.target.value})} className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:border-slate-400" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Bio</label>
                        <textarea value={myProfile.bio} onChange={e => setMyProfile({...myProfile, bio: e.target.value})} rows={3} className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg focus:outline-none focus:border-slate-400 resize-none" />
                    </div>
                    <button type="submit" className="bg-slate-900 text-white py-4 rounded-lg font-bold text-xs uppercase tracking-wider mt-2 hover:bg-slate-800 transition-colors">Save Changes</button>
                </form>
            </div>
          </div>
        )}

        {/* MORE TAB (Missions & Premium) */}
        {activeTab === 'more' && (
          <div className="p-4 flex flex-col gap-4">
            
            {/* Missions */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-widest mb-4">Daily Mission</h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{dailyMission.title}</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Reward: {dailyMission.reward} PTS</p>
                </div>
                <button 
                  onClick={completeMission} 
                  disabled={dailyMission.done}
                  className={`py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${dailyMission.done ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  {dailyMission.done ? 'Completed' : 'Claim Reward'}
                </button>
              </div>
            </div>

            {/* Premium */}
            <div className="bg-slate-950 p-6 rounded-xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block mb-2">Premium Experience</span>
              <h3 className="text-2xl font-black text-white mb-2">TINNTUU VIP</h3>
              <div className="text-xs text-slate-300 mb-6 space-y-2 font-medium">
                <p>+ Ad-free browsing</p>
                <p>+ Unlimited swipes</p>
                <p>+ See who liked you</p>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800 pt-5">
                <div>
                  <span className="text-2xl font-black text-white">49 THB</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">/ Month</span>
                </div>
                <button onClick={() => alert('VIP Subscription simulated.')} className="bg-red-600 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors">
                  Upgrade
                </button>
              </div>
            </div>

            <button onClick={() => signOut(auth)} className="w-full bg-white text-red-600 font-bold py-4 rounded-xl text-xs uppercase tracking-wider border border-slate-200 hover:bg-slate-50 transition-colors mt-2">
                Log Out
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white border-t border-slate-200 flex justify-between px-2 py-3 z-50">
        <button onClick={() => setActiveTab('swipe')} className={`flex-1 flex flex-col items-center gap-1 transition-colors ${activeTab === 'swipe' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest">Swipe</span>
        </button>
        <button onClick={() => setActiveTab('chat')} className={`flex-1 flex flex-col items-center gap-1 transition-colors ${activeTab === 'chat' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest">Chat</span>
        </button>
        <button onClick={() => setActiveTab('practice')} className={`flex-1 flex flex-col items-center gap-1 transition-colors ${activeTab === 'practice' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest">Voice</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex-1 flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest">Profile</span>
        </button>
        <button onClick={() => setActiveTab('more')} className={`flex-1 flex flex-col items-center gap-1 transition-colors ${activeTab === 'more' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest">Menu</span>
        </button>
      </nav>
    </div>
  );
}
