import { Router } from 'express';
import upload from '../middlewares/uploadMiddleware.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import AppError from '../utils/AppError.js';

const router = Router();

// Single file upload route
router.post('/', authMiddleware, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return next(new AppError(err.message, 400));
    }
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Return the relative URL (e.g., /uploads/filename.mp4)
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      status: 'success',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  });
});

export default router;
