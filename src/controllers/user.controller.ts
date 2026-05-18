import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    const user = await prisma.user.findUnique({
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
        husbandId: true,
        role: true,
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    res.json({
      success: true,
      user
    });

  } catch (error: any) {
    console.error('Get Current User Error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب البيانات'
    });
  }
};