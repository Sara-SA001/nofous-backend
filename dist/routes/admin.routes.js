"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// مصادقة
router.post('/register', admin_controller_1.registerAdmin);
router.post('/login', admin_controller_1.loginAdmin);
router.get('/me', auth_middleware_1.protect, admin_controller_1.getCurrentAdmin);
// طلبات التسجيل
router.get('/registration-requests', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), (0, auth_middleware_1.protectAdminPermission)('MANAGE_REGISTRATION_REQUESTS'), admin_controller_1.getRegistrationRequests);
router.put('/registration-requests/:id/approve', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), (0, auth_middleware_1.protectAdminPermission)('MANAGE_REGISTRATION_REQUESTS'), admin_controller_1.approveRegistration);
router.put('/registration-requests/:id/reject', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), (0, auth_middleware_1.protectAdminPermission)('MANAGE_REGISTRATION_REQUESTS'), admin_controller_1.rejectRegistration);
// طلبات الارتباط
router.get('/link-requests', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), (0, auth_middleware_1.protectAdminPermission)('MANAGE_LINK_REQUESTS'), admin_controller_1.getAllLinkRequests);
router.put('/link-requests/:id/approve', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), (0, auth_middleware_1.protectAdminPermission)('MANAGE_LINK_REQUESTS'), admin_controller_1.approveLinkRequest);
router.put('/link-requests/:id/reject', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), (0, auth_middleware_1.protectAdminPermission)('MANAGE_LINK_REQUESTS'), admin_controller_1.rejectLinkRequest);
// طلبات الوفاة
router.get('/death-requests', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), (0, auth_middleware_1.protectAdminPermission)('MANAGE_DEATH_REQUESTS'), admin_controller_1.getDeathRequests);
router.put('/death-requests/:id/approve', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), (0, auth_middleware_1.protectAdminPermission)('MANAGE_DEATH_REQUESTS'), admin_controller_1.approveDeathRequest);
router.put('/death-requests/:id/reject', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), (0, auth_middleware_1.protectAdminPermission)('MANAGE_DEATH_REQUESTS'), admin_controller_1.rejectDeathRequest);
router.get('/dashboard-stats', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), admin_controller_1.getDashboardStats);
// إدارة المستخدمين (للأدمن الرئيسي فقط)
router.get('/users', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), (0, auth_middleware_1.protectAdminPermission)('MANAGE_USERS'), admin_controller_1.getAllUsers);
router.put('/users/:id', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), (0, auth_middleware_1.protectAdminPermission)('MANAGE_USERS'), admin_controller_1.updateUser);
router.delete('/users/:id', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('SUB_ADMIN'), (0, auth_middleware_1.protectAdminPermission)('MANAGE_USERS'), admin_controller_1.deleteUser);
router.post('/create-subadmin', auth_middleware_1.protect, (0, auth_middleware_1.protectAdmin)('ADMIN'), admin_controller_1.createSubAdmin);
exports.default = router;
