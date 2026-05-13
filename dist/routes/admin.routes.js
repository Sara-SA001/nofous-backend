"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// ====================== مصادقة الأدمن ======================
router.post('/register', admin_controller_1.registerAdmin);
router.post('/login', admin_controller_1.loginAdmin);
// ====================== المستخدمين ======================
router.get('/users', auth_middleware_1.protectAdmin, admin_controller_1.getAllUsers);
// ====================== طلبات الارتباط ======================
router.get('/link-requests', (req, res, next) => {
    console.log('Route /link-requests hit, headers:', req.headers);
    next();
}, auth_middleware_1.protectAdmin, admin_controller_1.getAllLinkRequests);
router.put('/link-requests/:id/approve', auth_middleware_1.protectAdmin, admin_controller_1.approveLinkRequest);
router.put('/link-requests/:id/reject', auth_middleware_1.protectAdmin, admin_controller_1.rejectLinkRequest);
// ====================== طلبات الوفاة ======================
router.get('/death-requests', auth_middleware_1.protectAdmin, admin_controller_1.getDeathRequests);
router.put('/death-requests/:id/approve', auth_middleware_1.protectAdmin, admin_controller_1.approveDeathRequest);
router.put('/death-requests/:id/reject', auth_middleware_1.protectAdmin, admin_controller_1.rejectDeathRequest);
exports.default = router;
