"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const link_routes_1 = __importDefault(require("./routes/link.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const death_routes_1 = __importDefault(require("./routes/death.routes"));
const documents_routes_1 = __importDefault(require("./routes/documents.routes"));
const upload_1 = require("./utils/upload");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Debug: Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('  Headers:', JSON.stringify(req.headers, null, 2));
    next();
});
// Middleware
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000', // للـ Next.js frontend لاحقاً
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/images', express_1.default.static('public/images'));
// إضافة هذا السطر الجديد
app.use('/uploads', express_1.default.static(upload_1.uploadsDir));
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default); // ← أضف هذا السطر
app.use('/api/link', link_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/death', death_routes_1.default);
app.use('/api/documents', documents_routes_1.default);
// Health check
app.get('/', (req, res) => {
    res.json({ message: '🚀 نفوس API تعمل بنجاح!' });
});
app.listen(PORT, () => {
    console.log('=================================');
    console.log('🚀 SERVER STARTED WITH NEW CODE');
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log('=================================');
});
