import { useState } from 'react';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    website: '', // Honeypot field
  });
  const [submitted, setSubmitted] = useState(false);
  const [submissionTime, setSubmissionTime] = useState(Date.now()); // Track form load time

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Anti-spam validation
    // 1. Check honeypot field (should be empty)
    if (formData.website) {
      console.warn('Bot detected: honeypot field filled');
      return; // Silently reject, don't inform the bot
    }
    
    // 2. Check submission time (should take at least 3 seconds for a human)
    const timeElapsed = Date.now() - submissionTime;
    if (timeElapsed < 3000) {
      console.warn('Bot detected: too fast submission');
      return; // Silently reject
    }
    
    // 3. Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      alert('Please fill in all required fields');
      return;
    }
    
    // 4. Message length validation
    if (formData.message.length < 10) {
      alert('Please write a message with at least 10 characters');
      return;
    }
    
    try {
      // Send to backend API
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3015/api';
      const response = await fetch(`${API_URL}/settings/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: 'Contact Form Submission',
          message: formData.message,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSubmitted(true);
        
        // Scroll to success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Reset form after 10 seconds (increased from 3)
        setTimeout(() => {
          setSubmitted(false);
          setFormData({
            name: '',
            email: '',
            phone: '',
            message: '',
            website: '',
          });
          setSubmissionTime(Date.now());
        }, 10000);
      } else {
        // Show the actual error message from the backend
        alert(data.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-hero">
        <h1>Contact Us</h1>
        <p>We'd love to hear from you</p>
      </div>

      <div className="container">
        <div className="contact-content">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <div className="info-item">
              <i className="fa fa-phone"></i>
              <div>
                <h3>Phone</h3>
                <p><a href="tel:+96279130170 7">+962 7 9130 1707</a></p>
              </div>
            </div>
            <div className="info-item">
              <i className="fa fa-envelope"></i>
              <div>
                <h3>Email</h3>
                <p><a href="mailto:Info@qabalanbakery.com">Info@qabalanbakery.com</a></p>
              </div>
            </div>
            <div className="info-item">
              <i className="fa fa-clock-o"></i>
              <div>
                <h3>Business Hours</h3>
                <p>Open 24/7 to serve you anytime</p>
              </div>
            </div>
            <div className="info-item">
              <i className="fa fa-map-marker"></i>
              <div>
                <h3>Our Branches in Amman</h3>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Al Rabeih</strong>
                  <p>Jordan, Amman - Al-Sharif Naser Ben Jamil Str. Building No. 11</p>
                  <p><a href="tel:0791301707">0791301707</a></p>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>ALBAYADER</strong>
                  <p>Jordan, Amman - Jamal Qaytouqah Street, Building No. 44</p>
                  <p><a href="tel:0791301707">0791301707</a></p>
                </div>
                <div>
                  <strong>ALYASMEEN</strong>
                  <p>Jordan, Amman - Shura Street, Building No. 47</p>
                  <p><a href="tel:0791301707">0791301707</a></p>
                </div>
              </div>
            </div>
            <div className="info-item">
              <i className="fa fa-share-alt"></i>
              <div>
                <h3>Follow Us</h3>
                <div className="social-links">
                  <a href="https://www.facebook.com/QabalanBakeries?mibextid=LQQJ4d" target="_blank" rel="noopener noreferrer">
                    <i className="fa fa-facebook"></i> Facebook
                  </a>
                  <a href="https://instagram.com/qabalanbakery?igshid=YmMyMTA2M2Y=" target="_blank" rel="noopener noreferrer">
                    <i className="fa fa-instagram"></i> Instagram
                  </a>
                  <a href="https://youtube.com/@qabalanbakery4122" target="_blank" rel="noopener noreferrer">
                    <i className="fa fa-youtube"></i> YouTube
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-container">
            <h2>Send us a Message</h2>
            {submitted ? (
              <div className="success-confirmation">
                <div className="success-icon">
                  <i className="fa fa-check-circle"></i>
                </div>
                <h3>Message Sent Successfully!</h3>
                <p className="success-main-message">
                  Thank you for contacting us, <strong>{formData.name}</strong>!
                </p>
                <div className="success-details">
                  <p>✓ Your message has been received</p>
                  <p>✓ We'll respond to <strong>{formData.email}</strong></p>
                  {formData.phone && <p>✓ Or call you at <strong>{formData.phone}</strong></p>}
                  <p>✓ Our team typically responds within 24 hours</p>
                </div>
                <div className="success-actions">
                  <button 
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: '',
                        email: '',
                        phone: '',
                        message: '',
                        website: '',
                      });
                      setSubmissionTime(Date.now());
                    }}
                    className="btn-secondary"
                  >
                    Send Another Message
                  </button>
                  <a href="/" className="btn-primary">
                    Return to Home
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              
              {/* Honeypot field - hidden from users, bots will fill it */}
              <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
                <input
                  type="text"
                  name="website"
                  tabIndex="-1"
                  autoComplete="off"
                  value={formData.website}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="message">Message * (minimum 10 characters)</label>
                <textarea
                  id="message"
                  name="message"
                  rows="6"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  minLength="10"
                  placeholder="Please enter your message (at least 10 characters)"
                ></textarea>
                <small style={{ color: formData.message.length < 10 ? '#d9534f' : '#5cb85c' }}>
                  {formData.message.length} / 10 characters minimum
                </small>
              </div>
              <button type="submit" className="submit-button">
                Send Message
              </button>
            </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
