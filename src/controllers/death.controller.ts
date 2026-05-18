import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import upload from '../utils/upload';

export const uploadDeathDocuments = upload.fields([
  { name: 'document1', maxCount: 1 },
  { name: 'document2', maxCount: 1 },
  { name: 'document3', maxCount: 1 },
  { name: 'familyRecord', maxCount: 1 },
  { name: 'deathAnnouncement', maxCount: 1 },
  { name: 'deathReport', maxCount: 1 }
]);

export const requestDeath = async (req: Request, res: Response) => {
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
      ? await prisma.user.findUnique({ where: { nationalId: targetNationalId } })
      : await prisma.user.findUnique({ where: { id: userId! } });

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

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};

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

    const deathRequest = await prisma.deathRequest.create({
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
  } catch (error: any) {
    console.error('Death Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تقديم طلب الوفاة',
      error: error.message
    });
  }
};

export const getMyDeathRequests = async (req: Request, res: Response) => {
  try {
    const requesterId = req.user?.userId;

    if (!requesterId) {
      return res.status(401).json({ success: false, message: 'غير مصرح لك بالدخول' });
    }

    const requests = await prisma.deathRequest.findMany({
      where: { requesterId },
      include: {
        user: { select: { firstName: true, nationalId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedRequests = requests.map((request) => ({
      id: request.id,
      targetNationalId: request.user.nationalId,
      targetName: request.user.firstName,
      status: request.status,
      deathDate: request.deathDate,
      deathPlace: request.deathPlace,
      notes: request.notes,
      createdAt: request.createdAt,
    }));

    res.json({ success: true, requests: formattedRequests });
  } catch (error: any) {
    console.error('Get My Death Requests Error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب الطلبات', error: error.message });
  }
};
