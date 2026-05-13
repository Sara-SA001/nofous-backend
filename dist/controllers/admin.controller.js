"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectDeathRequest = exports.approveDeathRequest = exports.getDeathRequests = exports.rejectLinkRequest = exports.approveLinkRequest = exports.getAllUsers = exports.getAllLinkRequests = exports.loginAdmin = exports.registerAdmin = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const jwt_utils_1 = require("../utils/jwt.utils");
const auth_validation_1 = require("../validations/auth.validation");
const getZodIssues = (error) => error.issues || error.errors || [];
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
        const admin = await prisma_1.default.admin.create({
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
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'خطأ في البيانات المدخلة',
                errors: getZodIssues(error).map((err) => ({
                    field: err.path.join(' → '),
                    message: err.message
                }))
            });
        }
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء إنشاء حساب الأدمن', error: error.message });
    }
};
exports.registerAdmin = registerAdmin;
const loginAdmin = async (req, res) => {
    try {
        const validatedData = auth_validation_1.adminLoginSchema.parse(req.body);
        const admin = await prisma_1.default.admin.findUnique({
            where: { email: validatedData.email }
        });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(validatedData.password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }
        const token = (0, jwt_utils_1.generateToken)({
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
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'خطأ في البيانات المدخلة',
                errors: getZodIssues(error).map((err) => ({
                    field: err.path.join(' → '),
                    message: err.message
                }))
            });
        }
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء تسجيل دخول الأدمن', error: error.message });
    }
};
exports.loginAdmin = loginAdmin;
const getAllLinkRequests = async (req, res) => {
    try {
        console.log('Fetching all link requests...');
        // First, check all requests regardless of status
        const allRequests = await prisma_1.default.familyLinkRequest.findMany({
            include: {
                requester: { select: { id: true, firstName: true, nationalId: true } },
                target: { select: { id: true, firstName: true, nationalId: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log('All requests in database:', allRequests.length, allRequests.map(r => ({ id: r.id, status: r.status, type: r.type })));
        // Then get only pending ones
        const requests = await prisma_1.default.familyLinkRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                requester: { select: { id: true, firstName: true, nationalId: true } },
                target: { select: { id: true, firstName: true, nationalId: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log('Pending requests:', requests.length);
        res.json({
            success: true,
            count: requests.length,
            requests
        });
    }
    catch (error) {
        console.error('Error fetching link requests:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
    }
};
exports.getAllLinkRequests = getAllLinkRequests;
// ====================== جلب المستخدمين للأدمن ======================
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            select: {
                id: true,
                nationalId: true,
                firstName: true,
                nisba: true,
                fatherName: true,
                gender: true,
                maritalStatus: true,
                isAlive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({
            success: true,
            count: users.length,
            users,
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب قائمة المستخدمين',
            error: error.message,
        });
    }
};
exports.getAllUsers = getAllUsers;
// ====================== الموافقة على طلب الارتباط ======================
const approveLinkRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.userId;
        const linkRequest = await prisma_1.default.familyLinkRequest.findUnique({
            where: { id: Number(id) },
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
            await prisma_1.default.marriageInfo.create({
                data: {
                    husbandId: husband.id,
                    wifeId: wife.id,
                    marriageDate: linkRequest.marriageDate,
                    marriagePlace: linkRequest.marriagePlace,
                    status: 'APPROVED',
                }
            });
            // تحديث علاقة الزوجة وحالة الزوجين الاجتماعية
            await prisma_1.default.user.update({
                where: { id: wife.id },
                data: { husbandId: husband.id, maritalStatus: 'MARRIED' }
            });
            await prisma_1.default.user.update({
                where: { id: husband.id },
                data: { maritalStatus: 'MARRIED' }
            });
        }
        // ====================== حالة أب ======================
        else if (linkRequest.type === 'FATHER_LINK') {
            const child = linkRequest.requester;
            const father = linkRequest.target;
            await prisma_1.default.user.update({
                where: { id: child.id },
                data: { fatherId: father.id }
            });
        }
        // تحديث حالة الطلب
        await prisma_1.default.familyLinkRequest.update({
            where: { id: Number(id) },
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
    }
    catch (error) {
        console.error('Approve Link Request Error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء الموافقة على الطلب',
            error: error.message
        });
    }
};
exports.approveLinkRequest = approveLinkRequest;
const rejectLinkRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.userId;
        if (!adminId) {
            return res.status(403).json({ success: false, message: 'يجب أن تكون مسؤولاً لتنفيذ هذه العملية' });
        }
        const linkRequest = await prisma_1.default.familyLinkRequest.findUnique({
            where: { id: Number(id) }
        });
        if (!linkRequest) {
            return res.status(404).json({ success: false, message: 'طلب الارتباط غير موجود' });
        }
        if (linkRequest.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'هذا الطلب تمت معالجته مسبقاً' });
        }
        const admin = await prisma_1.default.admin.findUnique({ where: { id: adminId } });
        const updatedRequest = await prisma_1.default.familyLinkRequest.update({
            where: { id: Number(id) },
            data: {
                status: 'REJECTED',
                ...(admin ? { checkedById: admin.id } : {}),
                checkedAt: new Date(),
                adminNotes: req.body?.adminNotes || 'تم الرفض'
            }
        });
        res.json({
            success: true,
            message: 'تم رفض الطلب بنجاح',
            request: updatedRequest
        });
    }
    catch (error) {
        console.error('Reject Link Request Error:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء الرفض', error: error.message });
    }
};
exports.rejectLinkRequest = rejectLinkRequest;
// ====================== جلب طلبات الوفاة للأدمن ======================
const getDeathRequests = async (req, res) => {
    try {
        console.log('Fetching death requests...');
        const requests = await prisma_1.default.deathRequest.findMany({
            include: {
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        nationalId: true,
                    }
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        nationalId: true,
                        maritalStatus: true,
                        isAlive: true,
                        gender: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log('Found death requests:', requests.length, requests.map(r => ({ id: r.id, status: r.status })));
        const formattedRequests = requests.map((request) => ({
            ...request,
            target: request.user,
            document1Url: request.deathAnnouncementUrl,
            document2Url: request.deathReportUrl,
            document3Url: request.familyRecordUrl,
        }));
        res.json({
            success: true,
            requests: formattedRequests
        });
    }
    catch (error) {
        console.error('Error fetching death requests:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب طلبات الوفاة'
        });
    }
};
exports.getDeathRequests = getDeathRequests;
// ====================== الموافقة على طلب الوفاة ======================
const approveDeathRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.userId;
        const deathRequest = await prisma_1.default.deathRequest.findUnique({
            where: { id: Number(id) },
            include: { user: true }
        });
        if (!deathRequest) {
            return res.status(404).json({ success: false, message: 'طلب الوفاة غير موجود' });
        }
        if (deathRequest.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'تمت معالجة هذا الطلب مسبقاً' });
        }
        const deceased = deathRequest.user;
        // تحديث حالة الوفاة + تغيير الوضع العائلي إذا كان متزوجاً
        await prisma_1.default.$transaction(async (tx) => {
            // 1. تحديث طلب الوفاة
            await tx.deathRequest.update({
                where: { id: Number(id) },
                data: {
                    status: 'APPROVED',
                    checkedById: adminId,
                    checkedAt: new Date(),
                }
            });
            // 2. تحديث بيانات المتوفى
            let newMaritalStatus = deceased.maritalStatus;
            if (deceased.maritalStatus === 'MARRIED') {
                newMaritalStatus = 'WIDOWED'; // أرمل / أرملة
            }
            await tx.user.update({
                where: { id: deceased.id },
                data: {
                    isAlive: false,
                    maritalStatus: newMaritalStatus,
                    updatedAt: new Date()
                }
            });
            // 3. (اختياري) تحديث الزوج/الزوجة الباقي إلى أرمل/أرملة
            if (deceased.husbandId) {
                await tx.user.update({
                    where: { id: deceased.husbandId },
                    data: { maritalStatus: 'WIDOWED' }
                });
            }
            if (deceased.fatherId) {
                // يمكن إضافة منطق إضافي إذا لزم الأمر
            }
        });
        res.json({
            success: true,
            message: 'تمت الموافقة على طلب الوفاة وتحديث الحالة العائلية بنجاح'
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء معالجة طلب الوفاة',
            error: error.message
        });
    }
};
exports.approveDeathRequest = approveDeathRequest;
// ====================== رفض طلب الوفاة ======================
const rejectDeathRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user?.userId; // ← هذا هو مصدر المشكلة
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: 'غير مصرح لك بهذا الإجراء - يجب تسجيل الدخول'
            });
        }
        const deathRequest = await prisma_1.default.deathRequest.findUnique({
            where: { id: Number(id) }
        });
        if (!deathRequest) {
            return res.status(404).json({ success: false, message: 'طلب الوفاة غير موجود' });
        }
        if (deathRequest.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن رفض الطلب، حالته ليست قيد المراجعة'
            });
        }
        await prisma_1.default.deathRequest.update({
            where: { id: Number(id) },
            data: {
                status: 'REJECTED',
                checkedById: adminId,
                checkedAt: new Date(),
            }
        });
        res.json({
            success: true,
            message: 'تم رفض طلب الوفاة بنجاح'
        });
    }
    catch (error) {
        console.error('Reject Death Request Error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء رفض الطلب'
        });
    }
};
exports.rejectDeathRequest = rejectDeathRequest;
