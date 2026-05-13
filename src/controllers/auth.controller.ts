import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { generateToken } from '../utils/jwt.utils';
import { registerUserSchema, loginUserSchema } from '../validations/auth.validation';
import upload from '../utils/upload';

const getZodIssues = (error: any) => error.issues || error.errors || [];

export const uploadUserPhotos = upload.fields([
  { name: 'personalPhoto', maxCount: 1 },
  { name: 'idFrontPhoto', maxCount: 1 },
  { name: 'idBackPhoto', maxCount: 1 }
]);

export const registerUser = async (req: Request, res: Response) => {
  try {
    const validatedData = registerUserSchema.parse(req.body);

    const {
      nationalId,
      firstName,
      fatherName,
      grandfatherName,
      motherName,
      dateOfBirth,
      placeOfBirth,
      nationality,
      governorate,
      gender,
      religion,
      maritalStatus,
      password,
      nisba,
      amanah,
      registrationPlace,
      registrationNumber,
      cardNumber,
      issueDate,
      fatherId,
      husbandId,
    } = validatedData;

    // التحقق من الرقم الوطني
    const existingUser = await prisma.user.findUnique({
      where: { nationalId }
    });

    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'الرقم الوطني مسجل مسبقاً' 
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};

    const personalPhoto = files['personalPhoto']?.[0] 
      ? `/uploads/${files['personalPhoto'][0].filename}` 
      : null;

    const idFrontPhoto = files['idFrontPhoto']?.[0] 
      ? `/uploads/${files['idFrontPhoto'][0].filename}` 
      : null;

    const idBackPhoto = files['idBackPhoto']?.[0] 
      ? `/uploads/${files['idBackPhoto'][0].filename}` 
      : null;

    const newUser = await prisma.user.create({
      data: {
        nationalId,
        firstName,
        fatherName,
        grandfatherName,
        motherName,
        dateOfBirth: new Date(dateOfBirth),
        placeOfBirth,
        nationality,
        governorate,
        gender,
        religion,
        maritalStatus,
        password: hashedPassword,
        nisba,
        amanah,
        registrationPlace: registrationPlace || "",
        registrationNumber: registrationNumber || "",
        cardNumber: cardNumber || "",
        issueDate: issueDate ? new Date(issueDate) : undefined,
        fatherId,
        husbandId,
        personalPhoto,
        idFrontPhoto,
        idBackPhoto,
      },
      select: {
        id: true,
        nationalId: true,
        firstName: true,
        nisba: true,
        gender: true,
        maritalStatus: true,
        fatherId: true,
        husbandId: true,
        personalPhoto: true,
        idFrontPhoto: true,
        idBackPhoto: true,
      }
    });

    const token = generateToken({
      userId: newUser.id,
      nationalId: newUser.nationalId,
      role: 'user'
    });

    res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح',
      user: {
        id: newUser.id,
        nationalId: newUser.nationalId,
        firstName: newUser.firstName,
        nisba: newUser.nisba,
        gender: newUser.gender,
        maritalStatus: newUser.maritalStatus,
        fatherId: newUser.fatherId,
        husbandId: newUser.husbandId,
        personalPhoto: newUser.personalPhoto,
        idFrontPhoto: newUser.idFrontPhoto,
        idBackPhoto: newUser.idBackPhoto,
      },
      token
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      const issues = getZodIssues(error) || [];
      return res.status(400).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors: (Array.isArray(issues) ? issues : []).map((err: any) => ({
          field: err.path?.join(' → ') || 'unknown',
          message: err.message
        }))
      });
    }

    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التسجيل',
      error: error.message
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const validatedData = loginUserSchema.parse(req.body);
    const { nationalId, password } = validatedData;

    const user = await prisma.user.findUnique({
      where: { nationalId }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'الرقم الوطني أو كلمة المرور غير صحيحة'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'الرقم الوطني أو كلمة المرور غير صحيحة'
      });
    }

    const token = generateToken({
      userId: user.id,
      nationalId: user.nationalId,
      role: 'user'
    });

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: {
        id: user.id,
        nationalId: user.nationalId,
        firstName: user.firstName,
        nisba: user.nisba,
        gender: user.gender,
        maritalStatus: user.maritalStatus,
        fatherId: user.fatherId,
        husbandId: user.husbandId
      },
      token
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors: getZodIssues(error)
      });
    }

    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول'
    });
  }
};
