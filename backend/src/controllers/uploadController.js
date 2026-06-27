const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadFile(req, res) {
  if (!req.file) return res.status(400).json({ message: '파일이 없습니다' });

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    const url = `${process.env.BASE_URL || 'http://localhost:4000'}/uploads/${req.file.filename}`;
    const type = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
    return res.json({ url, type, originalName: req.file.originalname, size: req.file.size });
  }

  const uploadStream = cloudinary.uploader.upload_stream(
    { folder: 'team-chat', resource_type: 'auto' },
    (error, result) => {
      if (error) return res.status(500).json({ message: '업로드 실패' });
      const type = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
      res.json({ url: result.secure_url, type, originalName: req.file.originalname, size: req.file.size });
    }
  );
  streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
}

module.exports = { uploadFile };
