const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Initialize global disable scheduler
const globalDisableScheduler = require('./services/globalDisableScheduler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const addressRoutes = require('./routes/addresses');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const branchRoutes = require('./routes/branches');
const deliveryAreasRoutes = require('./routes/delivery-areas');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const locationRoutes = require('./routes/locations');
const promoRoutes = require('./routes/promos');
const offersRoutes = require('./routes/offers');
const notificationRoutes = require('./routes/notifications');
const supportRoutes = require('./routes/support');
const invoiceRoutes = require('./routes/invoice');
const newsRoutes = require('./routes/news');
const staffRoleRoutes = require('./routes/staffRole');
const dashboardRoutes = require('./routes/dashboard');
const debugRoutes = require('./routes/debug');
const reviewRoutes = require('./routes/reviews');
const settingsRoutes = require('./routes/settings');
const shippingRoutes = require('./routes/shipping');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // limit each IP to 3000 requests per windowMs (increased by 30x from 100)
  message: {
    error: 'Too many requests from this IP, please try again later.',
    message_ar: 'تم إرسال عدد كبير من الطلبات من هذا العنوان، يرجى المحاولة لاحقاً'
  }
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3006', // Admin dashboard
    'http://localhost:3070', // Web client  
    'http://localhost:5173', // Vite dev server
    'https://qablan.albech.me', // Production domain
    'http://qablan.albech.me', // Production domain (HTTP)
    /^https?:\/\/.*\.albech\.me$/, // Any subdomain
    /^https?:\/\/localhost:\d+$/, // Any localhost port
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Compression middleware
app.use(compression());

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Language middleware
app.use((req, res, next) => {
  const acceptLanguage = req.headers['accept-language'] || 'en';
  req.language = acceptLanguage.startsWith('ar') ? 'ar' : 'en';
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/delivery-areas', deliveryAreasRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/staff-roles', staffRoleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/shipping', shippingRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
