import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import upload from '../utils/upload';

export const uploadLinkDocuments = upload.fields([
  { name: 'document1', maxCount: 1 },
  { name: 'document2', maxCount: 1 }
]);

export const requestFamilyLink = async (req: Request, res: Response) => {
  try {
    const targetId = Number(req.body.targetId);
    const type = req.body.type as 'FATHER_LINK' | 'HUSBAND_LINK';
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

    const targetUser = await prisma.user.findUnique({
      where: { id: targetId }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'المستخدم المستهدف غير موجود' });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};

    const document1Url = files['document1']?.[0] ? `/uploads/${files['document1'][0].filename}` : null;
    const document2Url = files['document2']?.[0] ? `/uploads/${files['document2'][0].filename}` : null;

    if (!document1Url || !document2Url) {
      return res.status(400).json({ success: false, message: 'يجب رفع صورتين من دفتر العائلة' });
    }

    const linkRequest = await prisma.familyLinkRequest.create({
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

  } catch (error: any) {
    console.error('Link Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إرسال الطلب',
      error: error.message
    });
  }
};