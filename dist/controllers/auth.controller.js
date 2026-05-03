"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = exports.uploadUserPhotos = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const jwt_utils_1 = require("../utils/jwt.utils");
const auth_validation_1 = require("../validations/auth.validation");
const upload_1 = __importDefault(require("../utils/upload"));
exports.uploadUserPhotos = upload_1.default.fields([
    { name: 'personalPhoto', maxCount: 1 },
    { name: 'idFrontPhoto', maxCount: 1 },
    { name: 'idBackPhoto', maxCount: 1 }
]);
const registerUser = async (req, res) => {
    try {
        const validatedData = auth_validation_1.registerUserSchema.parse(req.body);
        const { nationalId, firstName, fatherName, grandfatherName, motherName, dateOfBirth, placeOfBirth, nationality, governorate, gender, religion, maritalStatus, password, nisba, amanah, registrationPlace, registrationNumber, cardNumber, issueDate, fatherId, husbandId, } = validatedData;
        // التحقق من الرقم الوطني
        const existingUser = await prisma_1.default.user.findUnique({
            where: { nationalId }
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'الرقم الوطني مسجل مسبقاً'
            });
        }
        const salt = await bcryptjs_1.default.genSalt(12);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        const files = req.files || {};
        const personalPhoto = files['personalPhoto']?.[0]
            ? `/uploads/${files['personalPhoto'][0].filename}`
            : null;
        const idFrontPhoto = files['idFrontPhoto']?.[0]
            ? `/uploads/${files['idFrontPhoto'][0].filename}`
            : null;
        const idBackPhoto = files['idBackPhoto']?.[0]
            ? `/uploads/${files['idBackPhoto'][0].filename}`
            : null;
        const newUser = await prisma_1.default.user.create({
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
        const token = (0, jwt_utils_1.generateToken)({
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
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'خطأ في البيانات المدخلة',
                errors: error.errors.map((err) => ({
                    field: err.path.join(' → '),
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
exports.registerUser = registerUser;
const loginUser = async (req, res) => {
    try {
        const validatedData = auth_validation_1.loginUserSchema.parse(req.body);
        const { nationalId, password } = validatedData;
        const user = await prisma_1.default.user.findUnique({
            where: { nationalId }
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'الرقم الوطني أو كلمة المرور غير صحيحة'
            });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'الرقم الوطني أو كلمة المرور غير صحيحة'
            });
        }
        const token = (0, jwt_utils_1.generateToken)({
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
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'خطأ في البيانات المدخلة',
                errors: error.errors
            });
        }
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تسجيل الدخول'
        });
    }
};
exports.loginUser = loginUser;
