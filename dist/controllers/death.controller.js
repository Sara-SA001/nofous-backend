"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestDeath = exports.uploadDeathDocuments = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const upload_1 = __importDefault(require("../utils/upload"));
exports.uploadDeathDocuments = upload_1.default.fields([
    { name: 'document1', maxCount: 1 },
    { name: 'document2', maxCount: 1 },
    { name: 'document3', maxCount: 1 },
    { name: 'familyRecord', maxCount: 1 },
    { name: 'deathAnnouncement', maxCount: 1 },
    { name: 'deathReport', maxCount: 1 }
]);
const requestDeath = async (req, res) => {
    try {
        const { deathDate, deathPlace, notes } = req.body;
        const targetNationalId = req.body.targetNationalId?.trim();
        const userId = req.body.userId ? Number(req.body.userId) : null;
        const requesterId = req.user?.userId;
        if (!requesterId) {
            return res.status(401).json({ success: false, message: 'غير مصرح لك بالدخول' });
        }
        if (!targetNationalId && (!userId || isNaN(userId))) {
            return res.status(400).json({
                success: false,
                message: 'يجب إدخال الرقم الوطني للمتوفى'
            });
        }
        if (!deathDate || !deathPlace?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'يجب إدخال تاريخ ومكان الوفاة'
            });
        }
        const targetUser = targetNationalId
            ? await prisma_1.default.user.findUnique({ where: { nationalId: targetNationalId } })
            : await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'لا يوجد مستخدم بهذا الرقم الوطني'
            });
        }
        const parsedDeathDate = new Date(deathDate);
        if (isNaN(parsedDeathDate.getTime())) {
            return res.status(400).json({ success: false, message: 'تاريخ الوفاة غير صالح' });
        }
        const files = req.files || {};
        const deathAnnouncementFile = files['document1']?.[0] || files['deathAnnouncement']?.[0];
        const deathReportFile = files['document2']?.[0] || files['deathReport']?.[0];
        const familyRecordFile = files['document3']?.[0] || files['familyRecord']?.[0];
        const deathAnnouncementUrl = deathAnnouncementFile ? `/uploads/${deathAnnouncementFile.filename}` : null;
        const deathReportUrl = deathReportFile ? `/uploads/${deathReportFile.filename}` : null;
        const familyRecordUrl = familyRecordFile ? `/uploads/${familyRecordFile.filename}` : null;
        if (!deathAnnouncementUrl || !deathReportUrl) {
            return res.status(400).json({
                success: false,
                message: 'يجب رفع خبر الوفاة وتقرير الوفاة على الأقل'
            });
        }
        const deathRequest = await prisma_1.default.deathRequest.create({
            data: {
                userId: targetUser.id,
                requesterId,
                deathDate: parsedDeathDate,
                deathPlace: deathPlace.toString().trim(),
                notes: notes?.toString().trim() || null,
                familyRecordUrl,
                deathAnnouncementUrl,
                deathReportUrl,
            },
            include: {
                user: { select: { firstName: true, nationalId: true } },
                requester: { select: { firstName: true, nationalId: true } }
            }
        });
        res.status(201).json({
            success: true,
            message: 'تم تقديم طلب الوفاة بنجاح، يرجى انتظار مراجعة الإدارة',
            request: deathRequest
        });
    }
    catch (error) {
        console.error('Death Request Error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تقديم طلب الوفاة',
            error: error.message
        });
    }
};
exports.requestDeath = requestDeath;
