import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [loginMethod, setLoginMethod] = useState('phone'); // Default to phone
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    password: '',
    sms_code: '',
  });
  const [smsSent, setSmsSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithTokens, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSendCode = async () => {
    if (!formData.phone) {
      setError('Please enter your phone number');
      return;
    }

    setError('');
    setSendingCode(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
      const response = await fetch(`${API_URL}/auth/send-sms-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: formData.phone }),
      });

      const data = await response.json();

      if (data.success) {
        setSmsSent(true);
        setError(''); // Clear any previous errors
      } else {
        setError(data.message || 'Failed to send verification code');
      }
    } catch (err) {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      
      if (loginMethod === 'phone') {
        // SMS-based login
        if (!smsSent) {
          setError('Please request a verification code first');
          setLoading(false);
          return;
        }

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
        const response = await fetch(`${API_URL}/auth/login-with-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: formData.phone,
            sms_code: formData.sms_code,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Use the new loginWithTokens method to store tokens and fetch user
          const result = await loginWithTokens(data.data.tokens);
          
          if (result.success) {
            navigate('/');
          } else {
            setError(result.error || 'Failed to complete login');
          }
          return;
        } else {
          setError(data.message || 'Login failed');
          setLoading(false);
          return;
        }
      } else {
        // Email/password login
        result = await login({
          email: formData.email,
          password: formData.password,
        });

        if (result.success) {
          navigate('/');
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content-wrapper">
          <div className="modal-content-box">
            <div className="t-a-c">
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content-box">
          <button className="modal-close-btn" onClick={handleClose} aria-label="Close">
            ×
          </button>
          
          <div className="t-a-c">
            <img src="/assets/images/1.png" className="img-class" alt="Qabalan Bakery" />
            <h2 className="login-font">Welcome Back</h2>

            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}

            {/* Login Method Toggle */}
            <div className="login-method-toggle" style={{ marginBottom: '20px' }}>
              <button
                type="button"
                className={`toggle-btn ${loginMethod === 'phone' ? 'active' : ''}`}
                onClick={() => {
                  setLoginMethod('phone');
                  setError('');
                  setSmsSent(false);
                }}
                style={{
                  padding: '10px 20px',
                  marginRight: '10px',
                  border: '2px solid #c49a6c',
                  background: loginMethod === 'phone' ? '#c49a6c' : 'transparent',
                  color: loginMethod === 'phone' ? 'white' : '#c49a6c',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  fontWeight: '600',
                }}
              >
                Phone Number
              </button>
              <button
                type="button"
                className={`toggle-btn ${loginMethod === 'email' ? 'active' : ''}`}
                onClick={() => {
                  setLoginMethod('email');
                  setError('');
                }}
                style={{
                  padding: '10px 20px',
                  border: '2px solid #c49a6c',
                  background: loginMethod === 'email' ? '#c49a6c' : 'transparent',
                  color: loginMethod === 'email' ? 'white' : '#c49a6c',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  fontWeight: '600',
                }}
              >
                Email & Password
              </button>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {loginMethod === 'phone' ? (
                <>
                  {/* Phone Number Login */}
                  <div className="form-group">
                    <label className="login-lable">Phone Number</label>
                    <input
                      type="tel"
                      className="login-select"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="07XXXXXXXX or 9627XXXXXXXX"
                      required
                      disabled={smsSent}
                    />
                  </div>

                  {!smsSent ? (
                    <div className="form-actions">
                      <button
                        type="button"
                        className="login-submit"
                        onClick={handleSendCode}
                        disabled={sendingCode || !formData.phone}
                      >
                        {sendingCode ? 'Sending...' : 'Send Verification Code'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label className="login-lable">Verification Code</label>
                        <input
                          type="text"
                          className="login-select"
                          name="sms_code"
                          value={formData.sms_code}
                          onChange={handleChange}
                          placeholder="Enter 6-digit code"
                          required
                          maxLength="6"
                        />
                      </div>

                      <div className="form-actions">
                        <button type="submit" className="login-submit" disabled={loading}>
                          {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                      </div>

                      <div className="form-actions" style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          className="login-submit"
                          onClick={() => {
                            setSmsSent(false);
                            setFormData({ ...formData, sms_code: '' });
                          }}
                          style={{
                            background: 'transparent',
                            color: '#c49a6c',
                            border: '2px solid #c49a6c',
                          }}
                        >
                          Change Phone Number
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Email/Password Login */}
                  <div className="form-group">
                    <label className="login-lable">Email</label>
                    <input
                      type="email"
                      className="login-select"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="login-lable">Password</label>
                    <input
                      type="password"
                      className="login-select"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="login-submit" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                  </div>
                </>
              )}
            </form>

            <div className="login-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/register" className="register-link">
                  Register Now
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
