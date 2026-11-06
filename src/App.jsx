import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase'; // เช็ก path นำเข้าให้ตรงกับไฟล์ตั้งค่าของคุณ
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function App() {
  // --- State สำหรับเก็บข้อมูล ---
  const [user, setUser] = useState(null); // เก็บสถานะคนล็อกอิน
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // ช่องกรอกฟอร์ม
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [faculty, setFaculty] = useState('');
  const [address, setAddress] = useState('');

  // --- เช็กสถานะการล็อกอินและยืนยันอีเมล ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // ถ้าล็อกอินเข้ามา แต่ยังไม่ได้กดลิงก์ยืนยันในอีเมล จะไม่ให้เข้าหน้าหลัก
      if (currentUser && !currentUser.emailVerified) {
        setUser(null);
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- ฟังก์ชันจัดการ สมัครสมาชิก / ล็อกอิน ---
  const handleAuth = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    // 1. เช็กโดเมน มธ.
    if (!cleanEmail.endsWith('@tu.ac.th') && !cleanEmail.endsWith('@mail.tu.ac.th')) {
      alert('กรุณาใช้อีเมลมหาวิทยาลัยธรรมศาสตร์เท่านั้นเมี๊ยว! 🐾');
      return;
    }

    try {
      if (isLoginMode) {
        // ========== โหมดเข้าสู่ระบบ ==========
        const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        
        // เช็กว่ากดยืนยันลิงก์ในอีเมลหรือยัง
        if (!userCred.user.emailVerified) {
          alert('กรุณาตรวจสอบตู้จดหมายอีเมลของคุณ และกดลิงก์ยืนยันตัวตนก่อนเข้าใช้งานเมี๊ยว! 📩');
          await signOut(auth); // เตะออกถ้ายังไม่ยืนยัน
          return;
        }
        alert('เข้าสู่ระบบสำเร็จ!');
        
      } else {
        // ========== โหมดสมัครสมาชิก ==========
        // เช็กช่องกรอกคณะและที่อยู่
        if (!faculty.trim() || !address.trim()) {
          alert('กรุณากรอกชื่อคณะและแถวที่อยู่ให้ครบถ้วนด้วยเมี๊ยว! 📝');
          return;
        }

        // สร้างบัญชีใน Firebase Auth
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const newUser = userCred.user;

        // บันทึก คณะ และ ที่อยู่ ลง Firestore (คอลเล็กชัน users)
        await setDoc(doc(db, 'users', newUser.uid), {
          email: cleanEmail,
          faculty: faculty.trim(),
          address: address.trim(),
          createdAt: new Date()
        });

        // ส่งลิงก์ยืนยันไปที่อีเมลจริง
        await sendEmailVerification(newUser);
        alert('สร้างบัญชีสำเร็จ! ระบบได้ส่งลิงก์ยืนยันไปที่อีเมล มธ. ของคุณแล้ว กรุณาเข้าไปกดยืนยันก่อนเข้าใช้งานเมี๊ยว 📩🐾');
        
        // บังคับออกจากระบบ และสลับกลับไปหน้าล็อกอินรอ
        await signOut(auth);
        setIsLoginMode(true);
        
        // เคลียร์ค่าในช่องกรอก
        setEmail(''); setPassword(''); setFaculty(''); setAddress('');
      }
    } catch (err) { 
      alert(err.message); 
    }
  };

  // --- ฟังก์ชันออกจากระบบ ---
  const handleLogout = async () => {
    await signOut(auth);
  };

  // ==========================================
  // ส่วนหน้าจอ (UI)
  // ==========================================

  // ถ้าล็อกอินและยืนยันอีเมลแล้ว ให้แสดงหน้าหลัก
  if (user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>ยินดีต้อนรับเข้าสู่ระบบ! 🎉</h2>
        <p>อีเมลของคุณ: {user.email}</p>
        <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '5px' }}>
          ออกจากระบบ
        </button>
      </div>
    );
  }

  // ถ้ายังไม่ล็อกอิน ให้แสดงหน้าฟอร์ม
  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h2>{isLoginMode ? 'เข้าสู่ระบบ 🔐' : 'สมัครสมาชิก 📝'}</h2>
      
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="อีเมล (@tu.ac.th หรือ @mail.tu.ac.th)" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '10px' }}
        />
        <input 
          type="password" 
          placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '10px' }}
        />

        {/* --- โชว์ 2 ช่องนี้ เฉพาะตอนสมัครสมาชิก --- */}
        {!isLoginMode && (
          <>
            <input 
              type="text" 
              placeholder="ชื่อคณะ (เช่น วิศวกรรมศาสตร์)" 
              value={faculty} 
              onChange={(e) => setFaculty(e.target.value)} 
              required 
              style={{ padding: '10px' }}
            />
            <input 
              type="text" 
              placeholder="แถวที่อยู่ (เช่น หอพัก JPark)" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              required 
              style={{ padding: '10px' }}
            />
          </>
        )}

        <button type="submit" style={{ padding: '10px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          {isLoginMode ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
        </button>
      </form>

      <button 
        onClick={() => setIsLoginMode(!isLoginMode)} 
        style={{ marginTop: '15px', width: '100%', padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        สลับไปหน้า {isLoginMode ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
      </button>
    </div>
  );
}

export default App;
