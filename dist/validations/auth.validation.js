"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLoginSchema = exports.registerAdminSchema = exports.loginUserSchema = exports.registerUserSchema = void 0;
const zod_1 = require("zod");
exports.registerUserSchema = zod_1.z.object({
    nationalId: zod_1.z.string()
        .length(10, "الرقم الوطني يجب أن يكون 10 أرقام بالضبط")
        .regex(/^\d+$/, "الرقم الوطني يجب أن يحتوي على أرقام فقط"),
    firstName: zod_1.z.string().min(3, "الاسم الأول يجب أن يكون 3 أحرف على الأقل"),
    fatherName: zod_1.z.string().min(2, "اسم الأب مطلوب"),
    motherName: zod_1.z.string().min(2, "اسم الأم مطلوب"),
    dateOfBirth: zod_1.z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة التاريخ يجب أن تكون YYYY-MM-DD")
        .refine((date) => !isNaN(Date.parse(date)), "تاريخ الميلاد غير صالح"),
    placeOfBirth: zod_1.z.string().min(2, "مكان الولادة مطلوب"),
    nationality: zod_1.z.string().min(2, "الجنسية مطلوبة"),
    governorate: zod_1.z.string().min(2, "المحافظة مطلوبة"),
    gender: zod_1.z.enum(["MALE", "FEMALE"], {
        message: "الجنس يجب أن يكون MALE أو FEMALE"
    }),
    religion: zod_1.z.enum(["MUSLIM", "CHRISTIAN", "OTHER"], {
        message: "الدين غير صالح"
    }),
    maritalStatus: zod_1.z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).default("SINGLE"),
    password: zod_1.z.string()
        .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
        .max(100, "كلمة المرور طويلة جداً"),
    // الحقول الاختيارية
    nisba: zod_1.z.string().optional(),
    grandfatherName: zod_1.z.string().optional(),
    amanah: zod_1.z.string().optional(),
    registrationPlace: zod_1.z.string().optional(),
    registrationNumber: zod_1.z.string().optional(),
    cardNumber: zod_1.z.string().optional(), // مهم: optional بدون default("")
    issueDate: zod_1.z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة تاريخ الاصدار يجب أن تكون YYYY-MM-DD")
        .refine((date) => !isNaN(Date.parse(date)), "تاريخ الاصدار غير صالح")
        .optional(),
    registrationDate: zod_1.z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "صيغة تاريخ التسجيل يجب أن تكون YYYY-MM-DD")
        .refine((date) => !isNaN(Date.parse(date)), "تاريخ التسجيل غير صالح")
        .optional(),
    fatherId: zod_1.z.preprocess((value) => {
        if (value === undefined || value === null || value === "")
            return undefined;
        return Number(value);
    }, zod_1.z.number().int().positive().optional()),
    husbandId: zod_1.z.preprocess((value) => {
        if (value === undefined || value === null || value === "")
            return undefined;
        return Number(value);
    }, zod_1.z.number().int().positive().optional()),
    personalPhoto: zod_1.z.any().optional(),
    idFrontPhoto: zod_1.z.any().optional(),
    idBackPhoto: zod_1.z.any().optional(),
});
exports.loginUserSchema = zod_1.z.object({
    nationalId: zod_1.z.string().length(10, "الرقم الوطني يجب أن يكون 10 أرقام"),
    password: zod_1.z.string().min(1, "كلمة المرور مطلوبة"),
});
exports.registerAdminSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
    email: zod_1.z.string().email("بريد إلكتروني غير صالح"),
    password: zod_1.z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    fullName: zod_1.z.string().optional(),
    role: zod_1.z.enum(["ADMIN", "SUB_ADMIN"]).optional(),
});
exports.adminLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email("بريد إلكتروني غير صالح"),
    password: zod_1.z.string().min(1, "كلمة المرور مطلوبة"),
});
