import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
const handleSubmit = async (e) => {
  e.preventDefault();
  console.log("LOGIN CLICKED", form);   // ✅ check click
  setLoading(true);

  try {
    console.log("API CALL START");      // ✅ check API start
    const { data } = await authAPI.login(form);
    console.log("API RESPONSE", data);  

    login(data.token, data.user);
    toast.success(`Welcome back, ${data.user.name}!`);
    navigate('/dashboard');
  } catch (err) {
    console.log("LOGIN ERROR", err.response || err); 
    toast.error(err.response?.data?.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-orb orb-1" />
        <div className="auth-bg-orb orb-2" />
        <div className="auth-bg-orb orb-3" />
      </div>
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <span className="auth-logo-icon">⬡</span>
          <span className="auth-logo-text">Sakshi Task</span>
        </div>
        <h1 className="auth-title">Welcome Team</h1>
        <p className="auth-subtitle">Sign in to your workspace</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <><span className="btn-loader" />Signing in...</> : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>

        <div className="auth-demo">
          <p>Demo credentials:</p>
          <code>admin@demo.com / password123</code>
        </div>
      </div>
    </div>
  );
};

export default Login;