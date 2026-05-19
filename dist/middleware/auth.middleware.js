"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectAdminPermission = exports.protectAdmin = exports.protect = void 0;
const jwt_utils_1 = require("../utils/jwt.utils");
const prisma_1 = __importDefault(require("../utils/prisma"));
// حماية المستخدم العادي
const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, jwt_utils_1.verifyToken)(token);
        req.user = decoded;
        if (req.user.role === 'USER' && req.user.status !== 'APPROVED') {
            if (req.user.status === 'PENDING') {
                return res.status(403).json({ success: false, message: 'حسابك قيد المراجعة' });
            }
            return res.status(403).json({ success: false, message: 'حسابك غير مفعل' });
        }
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, message: 'توكن غير صالح' });
    }
};
exports.protect = protect;
// حماية الأدمن (Factory Function)
const protectAdmin = (minRole = 'SUB_ADMIN') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول' });
            }
            if (req.user.role === 'ADMIN')
                return next();
            if (req.user.role === 'SUB_ADMIN' && minRole === 'SUB_ADMIN')
                return next();
            return res.status(403).json({ success: false, message: 'صلاحيات غير كافية' });
        }
        catch (error) {
            return res.status(403).json({ success: false, message: 'خطأ في التحقق من الصلاحيات' });
        }
    };
};
exports.protectAdmin = protectAdmin;
const protectAdminPermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول' });
            }
            if (req.user.role === 'ADMIN')
                return next();
            if (req.user.role !== 'SUB_ADMIN') {
                return res.status(403).json({ success: false, message: 'صلاحيات غير كافية' });
            }
            const admin = await prisma_1.default.admin.findUnique({
                where: { id: req.user.userId },
                select: {
                    role: true,
                    permissions: true,
                    isActive: true,
                }
            });
            if (!admin || !admin.isActive) {
                return res.status(403).json({ success: false, message: 'الحساب غير مفعل' });
            }
            if (admin.role === 'ADMIN')
                return next();
            if (!admin.permissions.includes(permission)) {
                return res.status(403).json({ success: false, message: 'لا تملك صلاحية الوصول لهذه الصفحة' });
            }
            req.user.permissions = admin.permissions;
            return next();
        }
        catch (error) {
            return res.status(403).json({ success: false, message: 'خطأ في التحقق من صلاحيات الحساب' });
        }
    };
};
exports.protectAdminPermission = protectAdminPermission;
