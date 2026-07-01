"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentAdmin = exports.createSubAdmin = exports.getDashboardStats = exports.rejectDeathRequest = exports.approveDeathRequest = exports.getDeathRequests = exports.rejectLinkRequest = exports.approveLinkRequest = exports.getAllLinkRequests = exports.deleteUser = exports.updateUser = exports.getAllUsers = exports.rejectRegistration = exports.approveRegistration = exports.getRegistrationRequests = exports.loginAdmin = exports.registerAdmin = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const jwt_utils_1 = require("../utils/jwt.utils");
const auth_validation_1 = require("../validations/auth.validation");
const adminPermissions_1 = require("../constants/adminPermissions");
const getZodIssues = (error) => error.issues || error.errors || [];
// ====================== تسجيل وتسجيل دخول الأدمن ======================
const registerAdmin = async (req, res) => {
    try {
        const validatedData = auth_validation_1.registerAdminSchema.parse(req.body);
        const existingAdmin = await prisma_1.default.admin.findFirst({
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
        const salt = await bcryptjs_1.default.genSalt(12);
        const hashedPassword = await bcryptjs_1.default.hash(validatedData.password, salt);
        const role = validatedData.role || 'SUB_ADMIN';
        const permissions = role === 'ADMIN' ? [...adminPermissions_1.ADMIN_PERMISSIONS] : [];
        const admin = await prisma_1.default.admin.create({
            data: {
                username: validatedData.username,
                email: validatedData.email,
                password: hashedPassword,
                fullName: validatedData.fullName || '',
                role,
                permissions,
            }
        });
        res.status(201).json({
            success: true,
            message: 'تم إنشاء حساب الأدمن بنجاح',
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
            }
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'خطأ في البيانات المدخلة',
                errors: getZodIssues(error)
            });
        }
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء التسجيل' });
    }
};
exports.registerAdmin = registerAdmin;
const loginAdmin = async (req, res) => {
    try {
        const validatedData = auth_validation_1.adminLoginSchema.parse(req.body);
        const admin = await prisma_1.default.admin.findUnique({
            where: { email: validatedData.email }
        });
        if (!admin || !(await bcryptjs_1.default.compare(validatedData.password, admin.password))) {
            return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
        }
        const token = (0, jwt_utils_1.generateToken)({
            userId: admin.id,
            nationalId: admin.email,
            role: admin.role,
            permissions: admin.permissions,
            status: 'APPROVED'
        });
        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions
            },
            token
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء تسجيل الدخول' });
    }
};
exports.loginAdmin = loginAdmin;
// ====================== طلبات التسجيل ======================
const getRegistrationRequests = async (req, res) => {
    try {
        const requests = await prisma_1.default.user.findMany({
            where: { status: 'PENDING' },
            select: {
                id: true,
                nationalId: true,
                firstName: true,
                nisba: true,
                fatherName: true,
                grandfatherName: true,
                motherName: true,
                gender: true,
                religion: true,
                maritalStatus: true,
                dateOfBirth: true,
                placeOfBirth: true,
                nationality: true,
                governorate: true,
                amanah: true,
                registrationPlace: true,
                registrationNumber: true,
                cardNumber: true,
                issueDate: true,
                createdAt: true,
                personalPhoto: true,
                idFrontPhoto: true,
                idBackPhoto: true,
                signature: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, requests });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب طلبات التسجيل' });
    }
};
exports.getRegistrationRequests = getRegistrationRequests;
const approveRegistration = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.user.update({
            where: { id: Number(id) },
            data: { status: 'APPROVED' }
        });
        res.json({ success: true, message: 'تمت الموافقة على الحساب بنجاح' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في الموافقة على الحساب' });
    }
};
exports.approveRegistration = approveRegistration;
const rejectRegistration = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.user.update({
            where: { id: Number(id) },
            data: { status: 'REJECTED' }
        });
        res.json({ success: true, message: 'تم رفض الحساب بنجاح' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في رفض الحساب' });
    }
};
exports.rejectRegistration = rejectRegistration;
// ====================== إدارة المستخدمين ======================
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            where: { role: 'USER' },
            select: {
                id: true,
                nationalId: true,
                firstName: true,
                nisba: true,
                fatherName: true,
                grandfatherName: true,
                motherName: true,
                dateOfBirth: true,
                placeOfBirth: true,
                nationality: true,
                governorate: true,
                amanah: true,
                registrationPlace: true,
                registrationNumber: true,
                registrationDate: true,
                issueDate: true,
                gender: true,
                religion: true,
                maritalStatus: true,
                cardNumber: true,
                fatherId: true,
                husbandId: true,
                status: true,
                isAlive: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, users });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب المستخدمين' });
    }
};
exports.getAllUsers = getAllUsers;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = Number(id);
        if (!userId || Number.isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
        }
        const payload = req.body || {};
        const updatableFields = [
            'nationalId',
            'firstName',
            'nisba',
            'fatherName',
            'grandfatherName',
            'motherName',
            'dateOfBirth',
            'placeOfBirth',
            'nationality',
            'governorate',
            'amanah',
            'registrationPlace',
            'registrationNumber',
            'registrationDate',
            'issueDate',
            'gender',
            'religion',
            'maritalStatus',
            'cardNumber',
            'fatherId',
            'husbandId',
            'status',
            'isAlive'
        ];
        const data = {};
        updatableFields.forEach((field) => {
            if (payload[field] !== undefined)
                data[field] = payload[field];
        });
        if (data.dateOfBirth)
            data.dateOfBirth = new Date(data.dateOfBirth);
        if (data.registrationDate)
            data.registrationDate = new Date(data.registrationDate);
        if (data.issueDate)
            data.issueDate = new Date(data.issueDate);
        if (data.fatherId === '' || data.fatherId === null)
            data.fatherId = null;
        if (data.husbandId === '' || data.husbandId === null)
            data.husbandId = null;
        if (data.fatherId !== undefined && data.fatherId !== null)
            data.fatherId = Number(data.fatherId);
        if (data.husbandId !== undefined && data.husbandId !== null)
            data.husbandId = Number(data.husbandId);
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ success: false, message: 'لا توجد حقول للتعديل' });
        }
        const updated = await prisma_1.default.user.update({
            where: { id: userId },
            data
        });
        res.json({ success: true, message: 'تم تحديث البيانات بنجاح', user: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في تحديث البيانات' });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (!userId || Number.isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
        }
        await prisma_1.default.$transaction(async (tx) => {
            await tx.familyLinkRequest.deleteMany({
                where: {
                    OR: [{ requesterId: userId }, { targetId: userId }]
                }
            });
            await tx.deathRequest.deleteMany({
                where: {
                    OR: [{ requesterId: userId }, { userId }]
                }
            });
            await tx.marriageInfo.deleteMany({
                where: {
                    OR: [{ husbandId: userId }, { wifeId: userId }]
                }
            });
            await tx.user.delete({ where: { id: userId } });
        });
        res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في حذف المستخدم' });
    }
};
exports.deleteUser = deleteUser;
// ====================== طلبات الارتباط ======================
const getAllLinkRequests = async (req, res) => {
    try {
        const requests = await prisma_1.default.familyLinkRequest.findMany({
            include: {
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        nisba: true,
                        nationalId: true,
                        gender: true,
                        maritalStatus: true,
                        isAlive: true
                    }
                },
                target: {
                    select: {
                        id: true,
                        firstName: true,
                        nisba: true,
                        nationalId: true,
                        gender: true,
                        maritalStatus: true,
                        isAlive: true
                    }
                },
                checkedBy: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, requests });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب طلبات الارتباط' });
    }
};
exports.getAllLinkRequests = getAllLinkRequests;
const approveLinkRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.userId;
        const linkRequest = await prisma_1.default.familyLinkRequest.findUnique({
            where: { id: Number(id) },
            include: { requester: true, target: true }
        });
        if (!linkRequest)
            return res.status(404).json({ success: false, message: 'طلب الارتباط غير موجود' });
        if (linkRequest.status !== 'PENDING')
            return res.status(400).json({ success: false, message: 'هذا الطلب تمت معالجته مسبقاً' });
        if (linkRequest.type === 'HUSBAND_LINK') {
            let husband = linkRequest.requester;
            let wife = linkRequest.target;
            if (linkRequest.requester.gender === 'FEMALE' && linkRequest.target.gender === 'MALE') {
                husband = linkRequest.target;
                wife = linkRequest.requester;
            }
            await prisma_1.default.marriageInfo.create({
                data: {
                    husbandId: husband.id,
                    wifeId: wife.id,
                    marriageDate: linkRequest.marriageDate,
                    marriagePlace: linkRequest.marriagePlace,
                    status: 'APPROVED',
                }
            });
            await prisma_1.default.user.update({ where: { id: wife.id }, data: { husbandId: husband.id, maritalStatus: 'MARRIED' } });
            await prisma_1.default.user.update({ where: { id: husband.id }, data: { maritalStatus: 'MARRIED' } });
        }
        else if (linkRequest.type === 'FATHER_LINK') {
            await prisma_1.default.user.update({
                where: { id: linkRequest.requester.id },
                data: { fatherId: linkRequest.target.id }
            });
        }
        await prisma_1.default.familyLinkRequest.update({
            where: { id: Number(id) },
            data: { status: 'APPROVED', checkedById: adminId }
        });
        res.json({ success: true, message: 'تمت الموافقة على طلب الارتباط' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء الموافقة' });
    }
};
exports.approveLinkRequest = approveLinkRequest;
const rejectLinkRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.userId;
        await prisma_1.default.familyLinkRequest.update({
            where: { id: Number(id) },
            data: {
                status: 'REJECTED',
                checkedById: adminId,
                checkedAt: new Date()
            }
        });
        res.json({ success: true, message: 'تم رفض الطلب بنجاح' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء رفض الطلب' });
    }
};
exports.rejectLinkRequest = rejectLinkRequest;
// ====================== طلبات الوفاة ======================
const getDeathRequests = async (req, res) => {
    try {
        const requests = await prisma_1.default.deathRequest.findMany({
            include: {
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        nisba: true,
                        nationalId: true,
                        gender: true,
                        maritalStatus: true,
                        isAlive: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        nisba: true,
                        nationalId: true,
                        gender: true,
                        maritalStatus: true,
                        isAlive: true
                    }
                },
                checkedBy: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const formattedRequests = requests.map((r) => ({
            ...r,
            target: r.user,
            document1Url: r.deathAnnouncementUrl,
            document2Url: r.deathReportUrl,
            document3Url: r.familyRecordUrl
        }));
        res.json({ success: true, requests: formattedRequests });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء جلب طلبات الوفاة' });
    }
};
exports.getDeathRequests = getDeathRequests;
const approveDeathRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.userId;
        const deathRequest = await prisma_1.default.deathRequest.findUnique({
            where: { id: Number(id) },
            include: { user: true }
        });
        if (!deathRequest || deathRequest.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'طلب غير صالح' });
        }
        const deceased = deathRequest.user;
        await prisma_1.default.$transaction(async (tx) => {
            await tx.deathRequest.update({
                where: { id: Number(id) },
                data: { status: 'APPROVED', checkedById: adminId, checkedAt: new Date() }
            });
            await tx.user.update({
                where: { id: deceased.id },
                data: { isAlive: false }
            });
            if (deceased.gender === 'FEMALE' && deceased.husbandId && deceased.maritalStatus === 'MARRIED') {
                await tx.user.update({
                    where: { id: deceased.husbandId },
                    data: { maritalStatus: 'WIDOWED' }
                });
            }
            if (deceased.gender === 'MALE') {
                await tx.user.updateMany({
                    where: {
                        husbandId: deceased.id,
                        isAlive: true,
                        maritalStatus: 'MARRIED'
                    },
                    data: {
                        maritalStatus: 'WIDOWED'
                    }
                });
            }
        });
        res.json({ success: true, message: 'تمت الموافقة على طلب الوفاة' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء الموافقة' });
    }
};
exports.approveDeathRequest = approveDeathRequest;
const rejectDeathRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.userId;
        await prisma_1.default.deathRequest.update({
            where: { id: Number(id) },
            data: { status: 'REJECTED', checkedById: adminId, checkedAt: new Date() }
        });
        res.json({ success: true, message: 'تم رفض طلب الوفاة بنجاح' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء الرفض' });
    }
};
exports.rejectDeathRequest = rejectDeathRequest;
// ====================== إنشاء SubAdmin ======================
// ====================== Dashboard Stats ======================
const getDashboardStats = async (req, res) => {
    try {
        const [pendingRegistrationCount, pendingLinkRequestsCount, pendingDeathRequestsCount, totalUsersCount] = await Promise.all([
            prisma_1.default.user.count({
                where: {
                    role: 'USER',
                    status: 'PENDING'
                }
            }),
            prisma_1.default.familyLinkRequest.count({
                where: {
                    status: 'PENDING'
                }
            }),
            prisma_1.default.deathRequest.count({
                where: {
                    status: 'PENDING'
                }
            }),
            prisma_1.default.user.count({
                where: {
                    role: 'USER'
                }
            })
        ]);
        return res.json({
            success: true,
            stats: {
                pendingRegistrationCount,
                pendingLinkRequestsCount,
                pendingDeathRequestsCount,
                totalUsersCount
            }
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'فشل في جلب إحصائيات لوحة التحكم'
        });
    }
};
exports.getDashboardStats = getDashboardStats;
const createSubAdmin = async (req, res) => {
    try {
        const { username, email, password, fullName, permissions } = req.body;
        const normalizedPermissions = (0, adminPermissions_1.normalizeAdminPermissions)(permissions);
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'اسم المستخدم والبريد وكلمة المرور مطلوبة' });
        }
        if (normalizedPermissions.length === 0) {
            return res.status(400).json({ success: false, message: 'يجب تحديد صلاحية واحدة على الأقل للـ SubAdmin' });
        }
        const existing = await prisma_1.default.admin.findFirst({
            where: { OR: [{ email }, { username }] }
        });
        if (existing) {
            return res.status(409).json({ success: false, message: 'البريد أو اسم المستخدم موجود مسبقاً' });
        }
        const salt = await bcryptjs_1.default.genSalt(12);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        const subAdmin = await prisma_1.default.admin.create({
            data: {
                username,
                email,
                password: hashedPassword,
                fullName: fullName || '',
                permissions: normalizedPermissions,
            }
        });
        res.status(201).json({
            success: true,
            message: 'تم إنشاء حساب SubAdmin بنجاح',
            subAdmin: {
                id: subAdmin.id,
                username: subAdmin.username,
                email: subAdmin.email,
                permissions: subAdmin.permissions,
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء إنشاء SubAdmin' });
    }
};
exports.createSubAdmin = createSubAdmin;
// ====================== جلب بيانات الأدمن الحالي (مبسطة) ======================
const getCurrentAdmin = async (req, res) => {
    try {
        const adminId = req.user?.userId;
        if (!adminId) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }
        const admin = await prisma_1.default.admin.findUnique({
            where: { id: adminId },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                permissions: true,
            }
        });
        if (!admin) {
            return res.status(404).json({ success: false, message: 'الأدمن غير موجود' });
        }
        res.json({
            success: true,
            admin
        });
    }
    catch (error) {
        console.error('Get Current Admin Error:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
};
exports.getCurrentAdmin = getCurrentAdmin;
