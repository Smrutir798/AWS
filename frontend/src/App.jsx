import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import EmployeeDashboard from './components/EmployeeDashboard';
import ManagerDashboard from './components/ManagerDashboard';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={!user || !user.role ? <Login setUser={setUser} /> : <Navigate to={`/${user.role}-dashboard`} />} />
        
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route 
          path="/employee-dashboard" 
          element={user && user.role === 'employee' ? <EmployeeDashboard user={user} setUser={setUser} /> : <Navigate to="/" />} 
        />
        
        <Route 
          path="/manager-dashboard" 
          element={user && user.role === 'manager' ? <ManagerDashboard user={user} setUser={setUser} /> : <Navigate to="/" />} 
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
