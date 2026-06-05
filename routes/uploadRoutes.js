const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'clubs');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      const error = new Error('이미지 파일만 업로드할 수 있습니다.');
      error.status = 400;
      error.code = 'UPLOAD_400';
      return cb(error);
    }

    return cb(null, true);
  }
});

router.post('/clubs/images', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'UPLOAD_400',
        message: '업로드할 이미지 파일이 없습니다.'
      }
    });
  }

  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/clubs/${req.file.filename}`;

  return res.status(201).json({
    success: true,
    data: {
      imageUrl,
      fileName: req.file.filename
    },
    error: null
  });
});

module.exports = router;
