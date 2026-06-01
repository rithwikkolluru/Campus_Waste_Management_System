import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const loadUser = () => {
  try {
    const saved     = localStorage.getItem('ecocampus_user');
    const loginTime = localStorage.getItem('ecocampus_login_time');
    if (!saved || !loginTime) return null;
    if (Date.now() - parseInt(loginTime, 10) > SESSION_DURATION) {
      localStorage.removeItem('ecocampus_user');
      localStorage.removeItem('ecocampus_login_time');
      localStorage.removeItem('ecocampus_token');
      return null;
    }
    return JSON.parse(saved);
  } catch {
    return null;
  }
};

const saveSession = (user, token) => {
  localStorage.setItem('ecocampus_user',       JSON.stringify(user));
  localStorage.setItem('ecocampus_login_time', Date.now().toString());
  if (token) localStorage.setItem('ecocampus_token', token);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  // Validate token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('ecocampus_token');
      if (!token) return;
      try {
        const res = await fetch('http://localhost:8000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          logout();
        } else {
          const data = await res.json();
          setUser(data.user);
          saveSession(data.user, token);
        }
      } catch (err) {
        console.error('Session verify failed', err);
      }
    };
    verifyToken();
  }, []);

  // Google OAuth login (students only)
  const googleLogin = (userData, token) => {
    setUser(userData);
    saveSession(userData, token);
  };

  // Staff login — always hits the backend to get a real JWT
  const loginStaff = async (email, password) => {
    try {
      const res  = await fetch('http://localhost:8000/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid credentials');

      setUser(data.user);
      saveSession(data.user, data.token);
      return { success: true, role: data.user.role };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ecocampus_user');
    localStorage.removeItem('ecocampus_login_time');
    localStorage.removeItem('ecocampus_token');
  };

  return (
    <AuthContext.Provider value={{ user, loginStaff, logout, googleLogin, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
