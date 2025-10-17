import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, user, loading: authLoading } = useAuth();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('passwordAtLeast6'));
      return;
    }

    setLoading(true);

    const result = await register({
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      user_type: 'customer'
    });

    if (result.success) {
      if (result.verification_required) {
        setSuccess(result.message || t('registrationSuccessful'));
        setTimeout(() => navigate('/login'), 2000);
      } else {
        navigate('/');
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
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
            <h2 className="login-font">{t('createAccount')}</h2>

            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="success-message">
                <p>{success}</p>
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group form-half">
                  <label className="login-lable">{t('firstName')}</label>
                  <input
                    type="text"
                    className="login-select"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder={t('firstName')}
                    required
                  />
                </div>

                <div className="form-group form-half">
                  <label className="login-lable">{t('lastName')}</label>
                  <input
                    type="text"
                    className="login-select"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder={t('lastName')}
                    required
                  />
                </div>
              </div>

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
                <label className="login-lable">{t('phoneNumberOptional')}</label>
                <input
                  type="tel"
                  className="login-select"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('phoneNumber')}
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
                  placeholder={t('enterPasswordMin6')}
                  required
                />
              </div>

              <div className="form-group">
                <label className="login-lable">{t('confirmPassword')}</label>
                <input
                  type="password"
                  className="login-select"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t('confirmPasswordPlaceholder')}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="login-submit" disabled={loading}>
                  {loading ? t('creatingAccount') : t('createAccount')}
                </button>
              </div>
            </form>

            <div className="login-footer">
              <p>
                {t('alreadyHaveAccount')}{' '}
                <Link to="/login" className="register-link">
                  {t('signIn')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
