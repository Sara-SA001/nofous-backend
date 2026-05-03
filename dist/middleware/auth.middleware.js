"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectAdmin = exports.protect = void 0;
const jwt_utils_1 = require("../utils/jwt.utils");
const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح لك بالدخول - يجب تسجيل الدخول أولاً'
            });
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, jwt_utils_1.verifyToken)(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: 'توكن غير صالح أو منتهي الصلاحية'
        });
    }
};
exports.protect = protect;
const protectAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح لك بالدخول - يجب تسجيل الدخول أولاً'
            });
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, jwt_utils_1.verifyToken)(token);
        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'يجب أن تكون مسؤولاً للوصول إلى هذه الصفحة'
            });
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: 'توكن غير صالح أو منتهي الصلاحية'
        });
    }
};
exports.protectAdmin = protectAdmin;
