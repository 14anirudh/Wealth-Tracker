import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CategoryView from './pages/CategoryView';
import Returns from './pages/Returns';
import Ratios from './pages/Ratios';
import Login from './pages/Login';
import Allocator from './pages/Allocator';
import Chat from './pages/Chat';
import Navbar from './components/Navbar';
import './index.css';
import { authAPI, setAuthToken } from './services/api';

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const storedToken = window.localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      setAuthToken(storedToken);
    }
    setInitializing(false);
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setUser(null);
        return;
      }

      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.data.user || null);
      } catch (error) {
        setUser(null);
      }
    };

    loadUser();
  }, [token]);

  const handleLogin = (newToken, authUser) => {
    setToken(newToken);
    setAuthToken(newToken);
    setUser(authUser || null);
  };

  const handleLogout = () => {
    setToken(null);
    setAuthToken(null);
    setUser(null);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#1c212b] flex items-center justify-center">
        <div className="text-black dark:text-white">Loading...</div>
      </div>
    );
  }

  const isAuthenticated = Boolean(token);

  return (
    <Router>
      <div className="min-h-screen bg-white dark:bg-[#161717] transition-colors duration-200">
        {isAuthenticated && <Navbar onLogout={handleLogout} user={user} />}
        <div className={isAuthenticated ? 'pt-16' : ''}>
          <Routes>
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Login onLogin={handleLogin} />
                )
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/dashboard/edit"
              element={
                isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/dashboard/equity"
              element={
                isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/dashboard/non-equity"
              element={
                isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/dashboard/emergency"
              element={
                isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/dashboard/custom/:categoryKey"
              element={
                isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/category/:categoryName"
              element={
                isAuthenticated ? (
                  <CategoryView />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/returns"
              element={
                isAuthenticated ? <Returns /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/ratios"
              element={
                isAuthenticated ? <Ratios /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/allocator"
              element={
                isAuthenticated ? <Allocator /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/chat"
              element={
                isAuthenticated ? <Chat /> : <Navigate to="/login" replace />
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

