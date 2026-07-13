import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Lock, User, Mail, ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [branch, setBranch] = useState('CSE');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await register(username, email, password, role, role === 'student' ? branch : undefined);
      setSuccess('Registration successful! Redirecting to login page...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Registration failed. Username or email might be taken.'
      );
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="glass-panel animate-fade-in">
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <GraduationCap size={40} color="#8b5cf6" />
          </div>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Register to start asking college FAQs</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={styles.successAlert}>
            <AlertCircle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <div style={styles.inputWrapper}>
              <User size={18} style={styles.inputIcon} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Role</label>
            <div style={styles.inputWrapper}>
              <ShieldAlert size={18} style={styles.inputIcon} />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={styles.select}
                disabled={loading}
              >
                <option value="student">Student</option>
                <option value="admin">College Administrator</option>
              </select>
            </div>
          </div>

          {role === 'student' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Academic Branch</label>
              <div style={styles.inputWrapper}>
                <GraduationCap size={18} style={styles.inputIcon} />
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  style={styles.select}
                  disabled={loading}
                >
                  <option value="CSE">Computer Science (CSE)</option>
                  <option value="ECE">Electronics & Communication (ECE)</option>
                  <option value="ME">Mechanical Engineering (ME)</option>
                  <option value="AIML">Artificial Intelligence & ML (AIML)</option>
                  <option value="Civil">Civil Engineering (Civil)</option>
                </select>
              </div>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? (
              <RefreshCw size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <span>Already have an account? </span>
          <Link to="/login" style={styles.link}>
            Sign In here
          </Link>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100vw',
    minHeight: '100vh',
    background: 'radial-gradient(circle at center, #0f172a 0%, #080d1a 100%)',
    padding: '40px 20px',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '26px',
  },
  logoContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '70px',
    height: '70px',
    borderRadius: '18px',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    marginBottom: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    fontFamily: 'var(--font-display)',
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text-muted)',
    zIndex: 2,
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    marginTop: '10px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#fca5a5',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    color: '#a7f3d0',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px',
  },
  footer: {
    marginTop: '25px',
    textAlign: 'center',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  link: {
    color: '#8b5cf6',
    textDecoration: 'none',
    fontWeight: '500',
  },
};
