import { useState } from 'react';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission - could connect to backend API
    console.log('Form submitted:', formData);
    setSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
      });
    }, 3000);
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
            {submitted && (
              <div className="success-message">
                Thank you for contacting us! We'll get back to you soon.
              </div>
            )}
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
              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  rows="6"
                  value={formData.message}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>
              <button type="submit" className="submit-button">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
