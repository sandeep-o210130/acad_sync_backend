import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadDirectory = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(uploadDirectory)) {
	fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadDirectory);
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		const ext = path.extname(file.originalname || '');
		cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
	},
});

export const upload = multer({ storage });
