import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { generateToken } from '../utils/jwt.utils';
import { adminLoginSchema, registerAdminSchema } from '../validations/auth.validation';

export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const validatedData = registerAdminSchema.parse(req.body);

    const existingAdmin = await prisma.admin.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { username: validatedData.username }
        ]
      }
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(validatedData.password, salt);

    const admin = await prisma.admin.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        fullName: validatedData.fullName || ''
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء حساب أدمن بنجاح',
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors: error.errors.map((err: any) => ({
          field: err.path.join(' → '),
          message: err.message
        }))
      });
    }

    res.status(500).json({ success: false, message: 'حدث خطأ أثناء إنشاء حساب الأدمن', error: error.message });
  }
};

export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const validatedData = adminLoginSchema.parse(req.body);
    const admin = await prisma.admin.findUnique({
      where: { email: validatedData.email }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    const isPasswordValid = await bcrypt.compare(validatedData.password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    const token = generateToken({
      userId: admin.id,
      nationalId: admin.email,
      role: 'admin'
    });

    res.json({
      success: true,
      message: 'تم تسجيل الدخول كأدمن بنجاح',
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      },
      token
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors: error.errors.map((err: any) => ({
          field: err.path.join(' → '),
          message: err.message
        }))
      });
    }

    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تسجيل دخول الأدمن', error: error.message });
  }
};

export const getAllLinkRequests = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.familyLinkRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        requester: { select: { id: true, firstName: true, nationalId: true } },
        target: { select: { id: true, firstName: true, nationalId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
  }
};

// ====================== الموافقة على طلب الارتباط ======================
export const approveLinkRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const adminId = req.user?.userId;

    const linkRequest = await prisma.familyLinkRequest.findUnique({
      where: { id: Number(requestId) },
      include: {
        requester: true,
        target: true
      }
    });

    if (!linkRequest) {
      return res.status(404).json({ success: false, message: 'طلب الارتباط غير موجود' });
    }

    if (linkRequest.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'هذا الطلب تمت معالجته مسبقاً' });
    }

    // ====================== حالة زواج ======================
    if (linkRequest.type === 'HUSBAND_LINK') {
      let husband = linkRequest.requester;
      let wife = linkRequest.target;

      if (linkRequest.requester.gender === 'FEMALE' && linkRequest.target.gender === 'MALE') {
        husband = linkRequest.target;
        wife = linkRequest.requester;
      }

      // إنشاء سجل الزواج
      await prisma.marriageInfo.create({
        data: {
          husbandId: husband.id,
          wifeId: wife.id,
          marriageDate: linkRequest.marriageDate,
          marriagePlace: linkRequest.marriagePlace,
          status: 'APPROVED',
        }
      });

      // تحديث علاقة الزوجة وحالة الزوجين الاجتماعية
      await prisma.user.update({
        where: { id: wife.id },
        data: { husbandId: husband.id, maritalStatus: 'MARRIED' }
      });
      await prisma.user.update({
        where: { id: husband.id },
        data: { maritalStatus: 'MARRIED' }
      });
    } 
    // ====================== حالة أب ======================
    else if (linkRequest.type === 'FATHER_LINK') {
      const child = linkRequest.requester;
      const father = linkRequest.target;

      await prisma.user.update({
        where: { id: child.id },
        data: { fatherId: father.id }
      });
    }

    // تحديث حالة الطلب
    await prisma.familyLinkRequest.update({
      where: { id: Number(requestId) },
      data: {
        status: 'APPROVED',
        checkedById: adminId,
      }
    });

    res.json({
      success: true,
      message: linkRequest.type === 'HUSBAND_LINK' 
        ? 'تمت الموافقة على طلب الزواج وإنشاء سجل الزواج بنجاح' 
        : 'تمت الموافقة على طلب الارتباط بنجاح',
    });

  } catch (error: any) {
    console.error('Approve Link Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء الموافقة على الطلب',
      error: error.message
    });
  }
};

export const rejectLinkRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const adminId = req.user?.userId;

    if (!adminId) {
      return res.status(403).json({ success: false, message: 'يجب أن تكون مسؤولاً لتنفيذ هذه العملية' });
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return res.status(403).json({ success: false, message: 'يجب أن تكون مسؤولاً لتنفيذ هذه العملية' });
    }

    const updatedRequest = await prisma.familyLinkRequest.update({
      where: { id: Number(requestId) },
      data: {
        status: 'REJECTED',
        checkedById: adminId,
        checkedAt: new Date(),
        adminNotes: req.body.adminNotes || 'تم الرفض'
      }
    });

    res.json({
      success: true,
      message: 'تم رفض الطلب بنجاح',
      request: updatedRequest
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء الرفض', error: error.message });
  }
};

export const getAllDeathRequests = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.deathRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { firstName: true, nationalId: true } },
        requester: { select: { firstName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, count: requests.length, requests });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
  }
};

export const approveDeathRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const adminId = req.user?.userId;

    const request = await prisma.deathRequest.findUnique({
      where: { id: Number(requestId) }
    });

    if (!request) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    // تحديث حالة الوفاة
    await prisma.user.update({
      where: { id: request.userId },
      data: { isAlive: false }
    });

    await prisma.deathRequest.update({
      where: { id: Number(requestId) },
      data: {
        status: 'APPROVED',
        checkedById: adminId,
        checkedAt: new Date(),
        adminNotes: req.body.adminNotes || 'تمت الموافقة'
      }
    });

    res.json({ success: true, message: 'تمت الموافقة على طلب الوفاة' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
  }
};