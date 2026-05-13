"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadsDir = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
exports.uploadsDir = path_1.default.resolve(__dirname, '../../uploads');
if (!fs_1.default.existsSync(exports.uploadsDir)) {
    fs_1.default.mkdirSync(exports.uploadsDir, { recursive: true });
}
// إعداد التخزين على المجلد uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, exports.uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
// فلترة الملفات (فقط الصور)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(new Error('فقط الملفات الصورية مسموح بها (jpg, png, jpeg, webp)'));
    }
};
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // الحد الأقصى 5 ميغابايت
});
exports.default = upload;
