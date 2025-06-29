
import React, { useState } from 'react';
import LoginForm from '@/components/LoginForm';
import AdminDashboard from '@/components/AdminDashboard';

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const handleLogin = (username: string, password: string) => {
    // Simple authentication logic (in real app, this would be server-side)
    if (username === 'admin' && password === 'admin123') {
      setIsLoggedIn(true);
      setCurrentUser(username);
      console.log('Admin logged in successfully');
    } else {
      alert('Invalid credentials. Use admin/admin123 for demo.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    console.log('Admin logged out');
  };

  return (
    <div>
      {!isLoggedIn ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <AdminDashboard onLogout={handleLogout} />
      )}
    </div>
  );
};

export default Index;
