import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAuthenticated, isProductManager } from '../middleware/auth.js';

// Middleware to check if customer is authenticated
const isCustomerAuthenticated = (req, res, next) => {
  if (!req.session.customerId) {
    return res.status(401).json({ message: 'Please login to continue' });
  }
  next();
};

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// POST /api/upload - Upload image (requires Product Manager role)
router.post('/', isAuthenticated, isProductManager, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Return the relative path to be saved in the database
    const imagePath = `/uploads/${req.file.filename}`;
    
    res.json({
      message: 'Image uploaded successfully',
      imagePath: imagePath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
});

// POST /api/upload/receipt - Upload payment receipt (requires customer login)
router.post('/receipt', isCustomerAuthenticated, upload.single('receipt'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imagePath = `/uploads/${req.file.filename}`;
    
    res.json({
      message: 'Receipt uploaded successfully',
      imagePath: imagePath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Receipt upload error:', error);
    res.status(500).json({ message: 'Error uploading receipt', error: error.message });
  }
});

// Error handling middleware for multer and file filter errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum 5MB allowed.' });
    }
    return res.status(400).json({ message: error.message });
  }
  // Handle file filter errors and other upload errors
  if (error) {
    return res.status(400).json({ message: error.message || 'Error processing file upload' });
  }
  next(error);
});

export default router;
