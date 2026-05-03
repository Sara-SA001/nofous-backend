import { z } from 'zod';

export const registerUserSchema = z.object({
  nationalId: z.string()
    .length(10, "الرقم الوطني يجب أن يكون 10 أرقام بالضبط")
    .regex(/^\d+$/, "الرقم الوطني يجب أن يحتوي على أرقام فقط"),

  firstName: z.string().min(3, "الاسم الأول يجب أن يكون 3 أحرف على الأقل"),
  fatherName: z.string().min(2, "اسم الأب مطلوب"),
  motherName: z.string().min(2, "اسم الأم مطلوب"),

  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة التاريخ يجب أن تكون YYYY-MM-DD")
    .refine((date: string) => !isNaN(Date.parse(date)), "تاريخ الميلاد غير صالح"),

  placeOfBirth: z.string().min(2, "مكان الولادة مطلوب"),
  nationality: z.string().min(2, "الجنسية مطلوبة"),
  governorate: z.string().min(2, "المحافظة مطلوبة"),

  gender: z.enum(["MALE", "FEMALE"], { 
    message: "الجنس يجب أن يكون MALE أو FEMALE" 
  }),

  religion: z.enum(["MUSLIM", "CHRISTIAN", "OTHER"], { 
    message: "الدين غير صالح" 
  }),

  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).default("SINGLE"),

  password: z.string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .max(100, "كلمة المرور طويلة جداً"),

  // الحقول الاختيارية
  nisba: z.string().optional(),
  grandfatherName: z.string().optional(),
  amanah: z.string().optional(),
  registrationPlace: z.string().optional(),
  registrationNumber: z.string().optional(),
  cardNumber: z.string().optional(),           // مهم: optional بدون default("")
  issueDate: z.union([
    z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة تاريخ الاصدار يجب أن تكون YYYY-MM-DD")
      .refine((date: string) => !isNaN(Date.parse(date)), "تاريخ الاصدار غير صالح"),
    z.undefined()
  ]),
  registrationDate: z.union([
    z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة تاريخ التسجيل يجب أن تكون YYYY-MM-DD")
      .refine((date: string) => !isNaN(Date.parse(date)), "تاريخ التسجيل غير صالح"),
    z.undefined()
  ]),

  fatherId: z.preprocess((value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    return Number(value);
  }, z.number().int().positive().optional()),

  husbandId: z.preprocess((value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    return Number(value);
  }, z.number().int().positive().optional()),

  personalPhoto: z.any().optional(),
  idFrontPhoto: z.any().optional(),
  idBackPhoto: z.any().optional(),
});

export const loginUserSchema = z.object({
  nationalId: z.string().length(10, "الرقم الوطني يجب أن يكون 10 أرقام"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export const registerAdminSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  fullName: z.string().optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});
