const path = require('path');

function uploadFile(req, res) {
  if (!req.file) return res.status(400).json({ message: '파일이 없습니다' });

  const url = `${process.env.BASE_URL || 'http://localhost:4000'}/uploads/${req.file.filename}`;
  const type = req.file.mimetype.startsWith('image/') ? 'image' : 'file';

  res.json({ url, type, originalName: req.file.originalname, size: req.file.size });
}

module.exports = { uploadFile };
