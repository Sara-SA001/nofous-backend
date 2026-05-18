"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectAdmin = exports.protect = void 0;
const jwt_utils_1 = require("../utils/jwt.utils");
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
