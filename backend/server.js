import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectionDB } from './config/db.js';
import dns from 'node:dns';
import fs from 'fs';
import authRoutes from './routes/auth.js';
import staffRoutes from './routes/staff.js';
import adminRoutes from './routes/admin.js';
import customerRoutes from './routes/customer.js';
import productRoutes from './routes/product.js';
import uploadRoutes from './routes/upload.js';
import messageRoutes from './routes/message.js';
import testmailRoutes from './routes/testmail.js';
import orderRoutes from './routes/order.js';
import chatRoutes from './routes/chat.js';
import inventoryRoutes from './routes/inventory.js';
import loyaltyRoutes from './routes/loyalty.js';
import reviewRoutes from './routes/reviews.js';
import supplierRoutes from './routes/suppliers.js';
import appointmentRoutes from './routes/appointments.js';
import bannerRoutes from './routes/banners.js';
import staffAuditLogger from './middleware/staffAuditLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();
const PORT = process.env.PORT || 3000;

const frontendDistDir = path.join(__dirname, '..', 'frontend', 'dist');
const uploadsDir = path.join(__dirname, 'uploads');

await connectionDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration with MongoDB store for persistence
app.use(session({
  secret: process.env.SESSION_SECRET || 'saranya-jewellery-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/saranyadb',
    touchAfter: 24 * 3600, // Lazy session update - only update session once per 24 hours
    crypto: {
      secret: process.env.SESSION_SECRET || 'saranya-jewellery-secret-key-2026'
    }
  }),
  cookie: {
    secure: false, // Set to true if using HTTPS in production
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax' // Protects against CSRF
  }
}));

// Record every staff API action for the admin audit log.
app.use(staffAuditLogger);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/testmail', testmailRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/banners', bannerRoutes);

// Serve uploaded images from backend storage
app.use('/uploads', express.static(uploadsDir));

// Serve built React frontend if present, otherwise expose helpful message
const indexFile = path.join(frontendDistDir, 'index.html');
if (fs.existsSync(indexFile)) {
  app.use(express.static(frontendDistDir));

  // SPA fallback for frontend routes
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(indexFile);
  });
} else {
  console.warn(`Frontend build not found at ${indexFile}. Static files will not be served.`);
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.status(200).send(
      '<h1>Backend running</h1><p>Frontend not built. Please ensure the frontend is built during deployment (run `npm run frontend:build`).</p>'
    );
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
