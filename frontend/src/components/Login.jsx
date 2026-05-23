import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, CalendarClock, Cloud } from 'lucide-react';
import axios from 'axios';

export default function Login({ setUser }) {
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const endpoint = isSignup ? 'http://localhost:5000/api/auth/signup' : 'http://localhost:5000/api/auth/login';
      const payload = isSignup ? { name, email, password, role } : { email, password };
      const response = await axios.post(endpoint, payload);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${isSignup ? 'sign up' : 'login'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCognitoHostedUI = () => {
    // This will be replaced with the actual Cognito Hosted UI URL
    alert("This will redirect to your AWS Cognito Hosted UI domain once configured!");
  };

  const getTitle = () => {
    return isSignup ? 'Create Account' : 'Leave Management System';
  };

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel login-card" 
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            style={{ display: 'inline-block', background: 'rgba(99, 102, 241, 0.2)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}
          >
            <CalendarClock size={48} color="var(--primary-color)" />
          </motion.div>
          <h2>{getTitle()}</h2>
          <p className="text-muted">Powered by AWS Architecture</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-muted mb-2" style={{ display: 'block' }}>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="emp@test.com / mgr@test.com"
              required 
            />
          </div>

          {isSignup && (
            <div>
              <label className="text-sm text-muted mb-2" style={{ display: 'block' }}>Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required={isSignup} 
              />
            </div>
          )}

          <div>
            <label className="text-sm text-muted mb-2" style={{ display: 'block' }}>
              Password
              {!isSignup && (
                <Link 
                  to="/forgot-password"
                  style={{ float: 'right', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  Forgot Password?
                </Link>
              )}
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
              required 
            />
          </div>

          {isSignup && (
            <div>
              <label className="text-sm text-muted mb-2" style={{ display: 'block' }}>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} required={isSignup}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full mb-4" disabled={loading}>
            {loading ? 'Authenticating...' : (
              <>
                <LogIn size={20} />
                {isSignup ? 'Sign Up' : 'Sign In'}
              </>
            )}
          </button>
          
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
            <span style={{ padding: '0 10px', fontSize: '0.85rem', color: 'var(--muted)' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
          </div>

          <button 
            type="button" 
            onClick={handleCognitoHostedUI}
            className="btn btn-outline w-full mb-4" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Cloud size={20} />
            Sign in with AWS
          </button>
        </form>

        <div className="text-center text-sm text-muted">
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <button 
            type="button" 
            onClick={() => { setIsSignup(!isSignup); setError(''); }} 
            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}
          >
            {isSignup ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        {!isSignup && (
          <div className="mt-4 text-center text-sm text-muted" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
            <p>Demo Accounts:</p>
            <p>Employee: emp@test.com / password123</p>
            <p>Manager: mgr@test.com / password123</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
