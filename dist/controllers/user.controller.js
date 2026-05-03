"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                nationalId: true,
                firstName: true,
                fatherName: true,
                motherName: true,
                grandfatherName: true,
                gender: true,
                maritalStatus: true,
                personalPhoto: true,
                idFrontPhoto: true,
                idBackPhoto: true,
                registrationDate: true,
                issueDate: true,
                fatherId: true,
                husbandId: true
            }
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }
        res.json({
            success: true,
            user
        });
    }
    catch (error) {
        console.error('Get Current User Error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب البيانات'
        });
    }
};
exports.getCurrentUser = getCurrentUser;
