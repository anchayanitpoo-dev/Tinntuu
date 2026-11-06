import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase'; // เช็ก path นำเข้าให้ตรงกับไฟล์ตั้งค่า Firebase ของคุณ
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function App() {
  // ==========================================
  // 1. ตัวแปรเก็บข้อมูล (State)
  // ==========================================
  const [user, setUser] = useState(null); // เก็บสถานะผู้ใช้ที่ล็อกอิน
  const [isLoginMode, setIsLoginMode] = useState(true); // สลับหน้าล็อกอิน/สมัคร
  
  // ช่องกรอกข้อมูลฟอร์ม
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [faculty, setFaculty] = useState('');
  const [address, setAddress] = useState('');

  // ==========================================
  // 2. ตรวจสอบสถานะล็อกอิน & การยืนยันอีเมล
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // ถ้าเข้าสู่ระบบมา แต่ยังไม่ได้กดลิงก์ยืนยันในอีเมล จะไม่ให้เข้าหน้าหลัก
      if (currentUser && !currentUser.emailVerified) {
        setUser(null);
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // 3. ฟังก์ชันกดปุ่ม เข้าสู่ระบบ / สมัครสมาชิก
  // ==========================================
  const handleAuth = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    // กรองโดเมน มธ.
    if (!cleanEmail.endsWith('@tu.ac.th') && !cleanEmail.endsWith('@mail.tu.ac.th')) {
      alert('กรุณาใช้อีเมลมหาวิทยาลัยธรรมศาสตร์เท่านั้นเมี๊ยว! 🐾');
      return;
    }

    try {
      if (isLoginMode) {
        // --- ส่วนของการเข้าสู่ระบบ ---
        const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        
        // ตรวจสอบว่ากดยืนยันลิงก์ในอีเมลหรือยัง
        if (!userCred.user.emailVerified) {
          alert('กรุณาตรวจสอบตู้จดหมายอีเมลของคุณ และกดลิงก์ยืนยันตัวตนก่อนเข้าใช้งานเมี๊ยว! 📩');
          await signOut(auth); // เตะออกถ้ายังไม่ยืนยัน
          return;
        }
        alert('เข้าสู่ระบบสำเร็จ!');
        
      } else {
        // --- ส่วนของการสมัครสมาชิก ---
        // เช็กช่องกรอกคณะและที่อยู่
        if (!faculty.trim() || !address.trim()) {
          alert('กรุณากรอกชื่อคณะและแถวที่อยู่ให้ครบถ้วนด้วยเมี๊ยว! 📝');
          return;
        }

        // สร้างบัญชีผู้ใช้ใน Firebase Authentication
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const newUser = userCred.user;

        // บันทึก ชื่อคณะ และ แถวที่อยู่ ลงใน Firestore Database (คอลเล็กชัน users)
        await setDoc(doc(db, 'users', newUser.uid), {
          email: cleanEmail,
          faculty: faculty.trim(),
          address: address.trim(),
          createdAt: new Date()
        });

        // ส่งลิงก์ยืนยันไปที่ตู้จดหมายอีเมล
        await sendEmailVerification(newUser);
        alert('สร้างบัญชีสำเร็จ! ระบบได้ส่งลิงก์ยืนยันไปที่อีเมล มธ. ของคุณแล้ว กรุณาเข้าไปกดยืนยันก่อนเข้าใช้งานเมี๊ยว 📩🐾');
        
        // บังคับออกจากระบบ และสลับกลับไปหน้าล็อกอินเพื่อรอให้ผู้ใช้ไปกดยืนยันอีเมล
        await signOut(auth);
        setIsLoginMode(true);
        
        // ล้างข้อมูลในช่องกรอก
        setEmail(''); 
        setPassword(''); 
        setFaculty(''); 
        setAddress('');
      }
    } catch (err) { 
      // แจ้งเตือนกรณีรหัสผิด หรือมีอีเมลนี้อยู่แล้ว
      alert('เกิดข้อผิดพลาด: ' + err.message); 
    }
  };

  // ==========================================
  // 4. ฟังก์ชันออกจากระบบ
  // ==========================================
  const handleLogout = async () => {
    await signOut(auth);
  };

  // ==========================================
  // 5. ส่วนแสดงผลหน้าจอ (UI)
  // ==========================================

  // [หน้าหลัก] - แสดงเมื่อล็อกอินและยืนยันอีเมลแล้ว
  if (user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>ยินดีต้อนรับเข้าสู่ระบบ! 🎉</h2>
        <p>อีเมลของคุณ: {user.email}</p>
        <button 
          onClick={handleLogout} 
          style={{ padding: '10px 20px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}
        >
          ออกจากระบบ
        </button>
      </div>
    );
  }

  // [หน้าเข้าสู่ระบบ/สมัครสมาชิก] - แสดงเมื่อยังไม่ล็อกอิน
  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>
        {isLoginMode ? 'เข้าสู่ระบบ 🔐' : 'สมัครสมาชิก 📝'}
      </h2>
      
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="อีเมล (@tu.ac.th หรือ @mail.tu.ac.th)" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <input 
          type="password" 
          placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />

        {/* --- แสดง 2 ช่องนี้ เฉพาะโหมด "สมัครสมาชิก" --- */}
        {!isLoginMode && (
          <>
            <input 
              type="text" 
              placeholder="ชื่อคณะ (เช่น วิศวกรรมศาสตร์)" 
              value={faculty} 
              onChange={(e) => setFaculty(e.target.value)} 
              required 
              style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
            <input 
              type="text" 
              placeholder="แถวที่อยู่ (เช่น หอพัก JPark)" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              required 
              style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            />
          </>
        )}

        <button 
          type="submit" 
          style={{ padding: '12px', background: '#1890ff', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
        >
          {isLoginMode ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
        </button>
      </form>

      <button 
        onClick={() => setIsLoginMode(!isLoginMode)} 
        style={{ marginTop: '15px', width: '100%', padding: '10px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        สลับไปหน้า {isLoginMode ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
      </button>

      {/* --- ส่วนช่องทางติดต่อเมื่อมีปัญหา --- */}
      <div style={{ 
        marginTop: '30px', 
        paddingTop: '20px', 
        borderTop: '1px solid #eee', 
        fontSize: '13px', 
        color: '#555', 
        textAlign: 'center',
        lineHeight: '1.8'
      }}>
        <p style={{ fontWeight: 'bold', color: '#222', marginBottom: '8px', fontSize: '14px' }}>
          🛠 พบปัญหาการใช้งาน ติดต่อได้ที่:
        </p>
        <p>📧 อีเมล: <a href="mailto:Anchayanit.poo@dome.ac.th" style={{ color: '#1890ff', textDecoration: 'none' }}>Anchayanit.poo@dome.ac.th</a></p>
        <p>📞 เบอร์โทร: <a href="tel:0979981570" style={{ color: '#1890ff', textDecoration: 'none' }}>0979981570</a></p>
        <p>💬 LINE Official: <span style={{ color: '#00B900', fontWeight: 'bold' }}>@tinntuu_support</span></p>
      </div>

    </div>
  );
}

export default App;
