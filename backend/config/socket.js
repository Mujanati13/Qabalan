const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

class SocketManager {
  constructor(server) {
    console.log('🏗️ Creating Socket.IO server...');
    
    const corsOrigins = [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:3006", // Admin dashboard
      "http://localhost:3070", // Web client
      "http://localhost:5173", // Default Vite port
      "https://qablan.albech.me", // Production domain
      "http://qablan.albech.me", // Production domain (HTTP)
      /^https?:\/\/.*\.albech\.me$/, // Any subdomain of albech.me
      /^https?:\/\/localhost:\d+$/, // Any localhost port
    ];
    
    console.log('🌐 CORS origins:', corsOrigins);
    
    this.io = new Server(server, {
      cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    console.log('✅ Socket.IO server created successfully');
    
    this.connectedClients = new Map(); // Store connected clients
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        
        console.log(`Socket authenticated for user: ${decoded.id} (${decoded.role})`);
        next();
      } catch (error) {
        console.error('Socket authentication failed:', error.message);
        next(new Error('Invalid authentication token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ Socket.io client connected: User ID ${socket.userId}, Role: ${socket.userRole}`);
      
      // Store the connected client
      this.connectedClients.set(socket.userId, socket);

      // Join admin room for admin-specific events
      socket.join('admin-room');
      console.log(`👤 User ${socket.userId} joined admin-room`);

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
