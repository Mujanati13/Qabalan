const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

class SocketManager {
  constructor(server) {
    console.log('🏗️ Creating Socket.IO server...');
    console.log('  - Environment:', process.env.NODE_ENV || 'development');
    console.log('  - Port:', process.env.PORT || 3015);
    console.log('  - Frontend URLs:', process.env.SOCKET_CORS_ORIGINS || 'Not set');
    
    console.log('🌐 Socket.IO CORS: Allowing all origins for debugging');
    
    this.io = new Server(server, {
      cors: {
        origin: "*", // Allow all origins for debugging
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true, // Allow Engine.IO v3 clients
      pingTimeout: 60000,
      pingInterval: 25000
    });

    console.log('✅ Socket.IO server created successfully');
    console.log('  - Available transports:', ['websocket', 'polling']);
    console.log('  - CORS origin:', '*');
    console.log('  - Ping timeout:', 60000);
    console.log('  - Ping interval:', 25000);
    
    this.connectedClients = new Map(); // Store connected clients
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupDebugEvents();
  }

  setupDebugEvents() {
    // Debug connection attempts
    this.io.engine.on('connection_error', (err) => {
      console.error('🚨 Socket.IO Engine connection error:', err);
      console.error('  - Error message:', err.message);
      console.error('  - Error code:', err.code);
      console.error('  - Context:', err.context);
    });

    this.io.engine.on('initial_headers', (headers, req) => {
      console.log('📋 Initial headers from client:', {
        origin: req.headers.origin,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer
      });
    });
  }

  setupMiddleware() {
    // Debug middleware to log all connection attempts
    this.io.use((socket, next) => {
      console.log('🔍 Socket connection attempt:');
      console.log('  - Socket ID:', socket.id);
      console.log('  - Origin:', socket.handshake.headers.origin);
      console.log('  - Referer:', socket.handshake.headers.referer);
      console.log('  - Transport:', socket.conn.transport.name);
      console.log('  - Auth token present:', !!socket.handshake.auth.token);
      next();
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          console.error('❌ No authentication token provided');
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        socket.userId = decoded.id;
        socket.userRole = decoded.userType; // Changed from decoded.role to decoded.userType
        
        console.log(`✅ Socket authenticated for user: ${decoded.id} (${decoded.userType})`);
        next();
      } catch (error) {
        console.error('❌ Socket authentication failed:', error.message);
        next(new Error('Invalid authentication token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ Socket.io client connected: User ID ${socket.userId}, Role: ${socket.userRole}`);
      
      // Store the connected client
      this.connectedClients.set(socket.userId, socket);

      // Only join admin room for admin users
      if (socket.userRole === 'admin' || socket.userRole === 'staff') {
        socket.join('admin-room');
        console.log(`👤 Admin user ${socket.userId} (${socket.userRole}) joined admin-room`);
      } else {
        console.log(`👤 Regular user ${socket.userId} connected (not added to admin-room)`);
      }

      // Send connection confirmation
      socket.emit('connection_confirmed', {
        message: 'Connected to real-time updates',
        timestamp: new Date().toISOString()
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Admin user disconnected: ${socket.userId}, reason: ${reason}`);
        this.connectedClients.delete(socket.userId);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Handle admin-specific events
      socket.on('join_admin_room', () => {
        socket.join('admin-room');
        socket.emit('joined_admin_room');
      });

      // Handle order status updates from admin
      socket.on('update_order_status', (data) => {
        // Broadcast order status change to all connected clients
        this.broadcastOrderStatusChange(data);
      });
    });
  }

  // Broadcast new order to all connected admin clients
  broadcastNewOrder(orderData) {
    console.log('Broadcasting new order:', orderData.id);
    this.io.to('admin-room').emit('newOrderCreated', orderData);
  }

  // Broadcast order update to all connected admin clients
  broadcastOrderUpdate(orderData) {
    console.log('Broadcasting order update:', orderData.id);
    this.io.to('admin-room').emit('orderUpdated', orderData);
  }

  // Broadcast order status change
  broadcastOrderStatusChange(data) {
    console.log('Broadcasting order status change:', data);
    this.io.to('admin-room').emit('orderStatusChanged', data);
  }

  // Send notification to all connected admin clients
  sendNotificationToAdmins(notification) {
    console.log('Sending notification to admins:', notification.message);
    this.io.to('admin-room').emit('notification', notification);
  }

  // Emit event to all admin clients
  emitToAdmins(event, data) {
    console.log(`Emitting ${event} to admins:`, data);
    this.io.to('admin-room').emit(event, data);
  }

  // Emit event to specific user
  emitToUser(userId, event, data) {
    const userSocket = this.connectedClients.get(userId);
    if (userSocket) {
      console.log(`Emitting ${event} to user ${userId}:`, data);
      userSocket.emit(event, data);
    } else {
      console.log(`User ${userId} not connected for event ${event}`);
    }
  }

  // Send notification to specific user
  sendNotificationToUser(userId, notification) {
    const userSocket = this.connectedClients.get(userId);
    if (userSocket) {
      userSocket.emit('notification', notification);
    }
  }

  // Get connected clients count
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  // Get all connected admin users
  getConnectedAdminUsers() {
    const users = [];
    this.connectedClients.forEach((socket, userId) => {
      if (socket.userRole === 'admin' || socket.userRole === 'super_admin') {
        users.push({
          id: userId,
          role: socket.userRole,
          connectedAt: socket.handshake.time
        });
      }
    });
    return users;
  }

  // Broadcast system notification
  broadcastSystemNotification(message, type = 'info') {
    this.io.to('admin-room').emit('notification', {
      type,
      message,
      timestamp: new Date().toISOString(),
      isSystem: true
    });
  }
}

module.exports = SocketManager;
