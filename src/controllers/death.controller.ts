import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import upload from '../utils/upload';

export const uploadDeathDocuments = upload.fields([
  { name: 'familyRecord', maxCount: 1 },
  { name: 'deathAnnouncement', maxCount: 1 },
  { name: 'deathReport', maxCount: 1 }
]);

export const requestDeath = async (req: Request, res: Response) => {
  try {
    const { userId, deathDate, deathPlace, notes } = req.body;
    const requesterId = req.user?.userId;

    if (!requesterId) {
      return res.status(401).json({ success: false, message: 'غير مصرح لك بالدخول' });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};

    const familyRecordUrl = files['familyRecord']?.[0] 
      ? `/uploads/${files['familyRecord'][0].filename}` : null;

    const deathAnnouncementUrl = files['deathAnnouncement']?.[0] 
      ? `/uploads/${files['deathAnnouncement'][0].filename}` : null;

    const deathReportUrl = files['deathReport']?.[0] 
      ? `/uploads/${files['deathReport'][0].filename}` : null;

    if (!familyRecordUrl || !deathAnnouncementUrl || !deathReportUrl) {
      return res.status(400).json({
        success: false,
        message: 'يجب رفع الثلاث وثائق المطلوبة (بيان عائلي + أخبار وفاة + تقرير وفاة)'
      });
    }

    const deathRequest = await prisma.deathRequest.create({
      data: {
        userId: Number(userId),
        requesterId,
        deathDate: deathDate ? new Date(deathDate) : null,
        deathPlace: deathPlace?.toString().trim() || null,
        notes: notes || null,
        familyRecordUrl,
        deathAnnouncementUrl,
        deathReportUrl,
      },
      include: {
        user: { select: { firstName: true, nationalId: true } },
        requester: { select: { firstName: true } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم تقديم طلب الوفاة بنجاح، يرجى انتظار مراجعة الإدارة',
      request: deathRequest
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تقديم طلب الوفاة',
      error: error.message
    });
  }
};
