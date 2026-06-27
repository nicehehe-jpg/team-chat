const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middlewares/auth');
const { uploadFile } = require('../controllers/uploadController');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|zip|mp4|mov/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase())
      || allowed.test(file.mimetype);
    cb(ok ? null : new Error('지원하지 않는 파일 형식'), ok);
  },
});

router.post('/', auth, upload.single('file'), uploadFile);

router.use((err, req, res, next) => {
  res.status(400).json({ message: err.message });
});

module.exports = router;
