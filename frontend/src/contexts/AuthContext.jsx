import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('eco_user');
    const loginTime = localStorage.getItem('eco_login_time');
    // Check 24 hour session expiration
    if (saved && loginTime) {
      if (Date.now() - parseInt(loginTime, 10) > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('eco_user');
        localStorage.removeItem('eco_login_time');
        localStorage.removeItem('eco_token');
        return null;
      }
      return JSON.parse(saved);
    }
    return null;
  });

  const requestOtp = async (phone) => {
    try {
      const res = await fetch('http://localhost:8000/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP request failed');
      return { success: true, otpHint: data.otp_hint };
    } catch (err) {
      // Fallback mock if backend is down
      console.warn('Backend fail, using mock OTP', err);
      const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
      return { success: true, otpHint: mockOtp, mock: true };
    }
  };

  const login = async (phone, otp, isMock, sentOtpHint) => {
    if (isMock) {
      if (otp !== sentOtpHint) {
        return { success: false, error: 'Invalid OTP' };
      }
      const mockUser = { id: 1, name: 'Student Demo', phone, role: 'student', total_points: 0 };
      setUser(mockUser);
      localStorage.setItem('eco_user', JSON.stringify(mockUser));
      localStorage.setItem('eco_login_time', Date.now().toString());
      return { success: true, role: 'student' };
    }

    try {
      const res = await fetch('http://localhost:8000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid OTP');
      
      setUser(data.user);
      localStorage.setItem('eco_user', JSON.stringify(data.user));
      localStorage.setItem('eco_token', data.token);
      localStorage.setItem('eco_login_time', Date.now().toString());
      return { success: true, role: data.user.role };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const loginStaff = async (email, password) => {
    // Demo Mock fallback
    if (password === 'demo1234') {
      const mockUser = {
        id: email.includes('admin') ? 3 : 2, 
        name: email.includes('admin') ? 'Admin Demo' : 'Coordinator Demo', 
        email, 
        role: email.includes('admin') ? 'admin' : 'coordinator' 
      };
      setUser(mockUser);
      localStorage.setItem('eco_user', JSON.stringify(mockUser));
      localStorage.setItem('eco_login_time', Date.now().toString());
      return { success: true, role: mockUser.role };
    }

    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid credentials');
      
      setUser(data.user);
      localStorage.setItem('eco_user', JSON.stringify(data.user));
      localStorage.setItem('eco_token', data.token);
      localStorage.setItem('eco_login_time', Date.now().toString());
      return { success: true, role: data.user.role };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('eco_user');
    localStorage.removeItem('eco_login_time');
    localStorage.removeItem('eco_token');
  };

  const googleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('eco_user', JSON.stringify(userData));
    localStorage.setItem('eco_token', token);
    localStorage.setItem('eco_login_time', Date.now().toString());
  };


  return (
    <AuthContext.Provider value={{ user, requestOtp, login, loginStaff, logout, googleLogin, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
