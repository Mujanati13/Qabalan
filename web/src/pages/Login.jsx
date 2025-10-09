import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
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
    setLoading(true);

    const result = await login(formData);

    if (result.success) {
      navigate('/');
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

            <form className="login-form" onSubmit={handleSubmit}>
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
