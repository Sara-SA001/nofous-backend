"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestFamilyLink = exports.uploadLinkDocuments = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const upload_1 = __importDefault(require("../utils/upload"));
exports.uploadLinkDocuments = upload_1.default.fields([
    { name: 'document1', maxCount: 1 },
    { name: 'document2', maxCount: 1 }
]);
const requestFamilyLink = async (req, res) => {
    try {
        const targetId = Number(req.body.targetId);
        const type = req.body.type;
        const notes = req.body.notes?.trim();
        const marriageDate = req.body.marriageDate;
        const marriagePlace = req.body.marriagePlace?.trim();
        const requesterId = req.user?.userId;
        if (!requesterId) {
            return res.status(401).json({ success: false, message: 'غير مصرح لك بالدخول' });
        }
        if (!targetId || isNaN(targetId)) {
            return res.status(400).json({ success: false, message: 'يجب إرسال targetId صالح' });
        }
        if (!['FATHER_LINK', 'HUSBAND_LINK'].includes(type)) {
            return res.status(400).json({ success: false, message: 'نوع الارتباط غير صحيح' });
        }
        // التحقق الإلزامي للزواج
        if (type === 'HUSBAND_LINK') {
            if (!marriageDate || !marriagePlace) {
                return res.status(400).json({
                    success: false,
                    message: 'يجب إدخال تاريخ الزواج ومحل الزواج'
                });
            }
            const date = new Date(marriageDate);
            if (isNaN(date.getTime())) {
                return res.status(400).json({ success: false, message: 'تاريخ الزواج غير صالح' });
            }
        }
        const targetUser = await prisma_1.default.user.findUnique({
            where: { id: targetId }
        });
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'المستخدم المستهدف غير موجود' });
        }
        const files = req.files || {};
        const document1Url = files['document1']?.[0] ? `/uploads/${files['document1'][0].filename}` : null;
        const document2Url = files['document2']?.[0] ? `/uploads/${files['document2'][0].filename}` : null;
        if (!document1Url || !document2Url) {
            return res.status(400).json({ success: false, message: 'يجب رفع صورتين من دفتر العائلة' });
        }
        const linkRequest = await prisma_1.default.familyLinkRequest.create({
            data: {
                requesterId,
                targetId: targetUser.id,
                type,
                notes: notes || null,
                document1Url,
                document2Url,
                marriageDate: type === 'HUSBAND_LINK' ? new Date(marriageDate) : null,
                marriagePlace: type === 'HUSBAND_LINK' ? marriagePlace : null,
            },
            include: {
                requester: { select: { firstName: true, nationalId: true } },
                target: { select: { firstName: true, nationalId: true } }
            }
        });
        res.status(201).json({
            success: true,
            message: type === 'HUSBAND_LINK'
                ? 'تم إرسال طلب ارتباط الزواج بنجاح، يرجى انتظار موافقة الإدارة'
                : 'تم إرسال طلب الارتباط بنجاح، يرجى انتظار موافقة الإدارة',
            request: {
                id: linkRequest.id,
                type: linkRequest.type,
                targetId: linkRequest.targetId,
                targetName: linkRequest.target.firstName,
                marriageDate: linkRequest.marriageDate,
                marriagePlace: linkRequest.marriagePlace,
            }
        });
    }
    catch (error) {
        console.error('Link Request Error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إرسال الطلب',
            error: error.message
        });
    }
};
exports.requestFamilyLink = requestFamilyLink;
