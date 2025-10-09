import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
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
        setSuccess(result.message || 'Registration successful! Please check your email to verify your account.');
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
            <h2 className="login-font">Create Account</h2>

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
                  <label className="login-lable">First Name</label>
                  <input
                    type="text"
                    className="login-select"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="First name"
                    required
                  />
                </div>

                <div className="form-group form-half">
                  <label className="login-lable">Last Name</label>
                  <input
                    type="text"
                    className="login-select"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

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
                <label className="login-lable">Phone Number (Optional)</label>
                <input
                  type="tel"
                  className="login-select"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
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
                  placeholder="Enter your password (min 6 characters)"
                  required
                />
              </div>

              <div className="form-group">
                <label className="login-lable">Confirm Password</label>
                <input
                  type="password"
                  className="login-select"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="login-submit" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>

            <div className="login-footer">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="register-link">
                  Sign In
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
