import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
  const { t } = useLanguage();
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
      setError(t('enterPhoneToComplete') || 'Please enter your phone number');
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
        setError(data.message || t('somethingWentWrong'));
      }
    } catch (err) {
      setError(t('somethingWentWrong'));
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
          setError(t('enterPhoneToComplete') || 'Please request a verification code first');
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
      setError(t('somethingWentWrong'));
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
              <p>{t('loading')}</p>
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
            <h2 className="login-font">{t('welcomeBack')}</h2>

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
              >
                {t('phoneNumberLogin')}
              </button>
              <button
                type="button"
                className={`toggle-btn ${loginMethod === 'email' ? 'active' : ''}`}
                onClick={() => {
                  setLoginMethod('email');
                  setError('');
                }}
              >
                {t('emailPasswordLogin')}
              </button>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {loginMethod === 'phone' ? (
                <>
                  {/* Phone Number Login */}
                  <div className="form-group">
                    <label className="login-lable">{t('phoneNumber')}</label>
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
                        {sendingCode ? t('sending') : t('sendVerificationCode')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label className="login-lable">{t('verificationCode')}</label>
                        <input
                          type="text"
                          className="login-select"
                          name="sms_code"
                          value={formData.sms_code}
                          onChange={handleChange}
                          placeholder={t('enter6DigitCode')}
                          required
                          maxLength="6"
                        />
                      </div>

                      <div className="form-actions">
                        <button type="submit" className="login-submit" disabled={loading}>
                          {loading ? t('signingIn') : t('signIn')}
                        </button>
                      </div>

                      <div className="form-actions" style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          className="login-submit secondary-btn"
                          onClick={() => {
                            setSmsSent(false);
                            setFormData({ ...formData, sms_code: '' });
                          }}
                        >
                          {t('changePhoneNumber')}
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Email/Password Login */}
                  <div className="form-group">
                    <label className="login-lable">{t('email')}</label>
                    <input
                      type="email"
                      className="login-select"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={t('email')}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="login-lable">{t('password')}</label>
                    <input
                      type="password"
                      className="login-select"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={t('password')}
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="login-submit" disabled={loading}>
                      {loading ? t('signingIn') : t('signIn')}
                    </button>
                  </div>
                </>
              )}
            </form>

            <div className="login-footer">
              <p>
                {t('dontHaveAccount')}{' '}
                <Link to="/register" className="register-link">
                  {t('registerNow')}
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
