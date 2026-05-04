import express from 'express';
import multer from 'multer';
import path from 'path';
import streamifier from 'streamifier';
import { v2 as cloudinary } from 'cloudinary';
import { isAuthenticated, isProductManager } from '../middleware/auth.js';

// Middleware to check if customer is authenticated
const isCustomerAuthenticated = (req, res, next) => {
  if (!req.session.customerId) {
    return res.status(401).json({ message: 'Please login to continue' });
  }
  next();
};

const router = express.Router();

let cloudinaryConfigured = false;

function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET
  );
}

function ensureCloudinaryConfigured() {
  if (cloudinaryConfigured) return;
  if (!hasCloudinaryConfig()) return;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  cloudinaryConfigured = true;
}

function uploadToCloudinary(fileBuffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}

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
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// POST /api/upload - Upload image (requires Product Manager role)
router.post('/', isAuthenticated, isProductManager, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    ensureCloudinaryConfigured();
    if (!cloudinaryConfigured) {
      return res.status(500).json({ message: 'Cloudinary is not configured on server' });
    }

    const uploaded = await uploadToCloudinary(req.file.buffer, 'saranya/products');

    res.json({
      message: 'Image uploaded successfully',
      imagePath: uploaded.secure_url,
      filename: uploaded.public_id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
});

// POST /api/upload/receipt - Upload payment receipt (requires customer login)
router.post('/receipt', isCustomerAuthenticated, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    ensureCloudinaryConfigured();
    if (!cloudinaryConfigured) {
      console.error('Cloudinary not configured - missing credentials');
      return res.status(500).json({ message: 'Upload service not configured. Please try again later.' });
    }

    const uploaded = await uploadToCloudinary(req.file.buffer, 'saranya/receipts');

    res.json({
      message: 'Receipt uploaded successfully',
      imagePath: uploaded.secure_url,
      filename: uploaded.public_id
    });
  } catch (error) {
    console.error('Receipt upload error:', error);
    const errorMessage = error?.message || 'Error uploading receipt';
    res.status(500).json({ message: errorMessage });
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
