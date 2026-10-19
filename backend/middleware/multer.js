import multer from 'multer';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|png|webp|avif)$/;

const imageFilter = (req, file, callback) => {
  if (ALLOWED_IMAGE_TYPES.test(file.mimetype)) return callback(null, true);
  const error = new Error('Only JPEG, PNG, WebP or AVIF images are allowed');
  error.status = 400;
  callback(error);
};

// Random file names so two uploads with the same name never overwrite each other
const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: function (req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    callback(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
});

// In-memory variant for single small uploads (e.g. review photos)
export const memoryImageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
});

export default upload;
