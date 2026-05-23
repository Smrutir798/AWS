import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Mail, Lock } from 'lucide-react';
import axios from 'axios';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setResetToken(token);
      setIsConfirming(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (isConfirming) {
        // Step 2: Reset Password via Token
        const response = await axios.post('http://localhost:5000/api/auth/reset-password-link', { token: resetToken, newPassword });
        setSuccess(response.data.message);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        // Step 1: Request Forgot Password Link
        const response = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
        setSuccess(response.data.message);
        setEmail('');
      }
    } catch (err) {
      setError(err.response?.data?.error || `Failed to process request`);
    } finally {
      setLoading(false);
    }
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
            style={{ display: 'inline-block', background: 'rgba(124, 58, 237, 0.2)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}
          >
            <KeyRound size={48} color="var(--primary-color)" />
          </motion.div>
          <h2>{isConfirming ? 'Create New Password' : 'Reset Password'}</h2>
          <p className="text-muted">
            {isConfirming 
              ? 'Enter your new password below.' 
              : 'Enter your email and we will send you a reset link.'}
          </p>
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
          {!isConfirming ? (
            <div>
              <label className="text-sm text-muted mb-2" style={{ display: 'block' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required 
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm text-muted mb-2" style={{ display: 'block' }}>New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required 
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full mb-4" disabled={loading}>
            {loading ? 'Processing...' : (
              <>
                {isConfirming ? <Lock size={20} /> : <Mail size={20} />}
                {isConfirming ? 'Update Password' : 'Send Reset Link'}
              </>
            )}
          </button>
        </form>

        <div className="text-center text-sm text-muted">
          <Link to="/" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
