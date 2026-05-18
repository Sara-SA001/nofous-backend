"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const link_controller_1 = require("../controllers/link.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/request', auth_middleware_1.protect, link_controller_1.uploadLinkDocuments, link_controller_1.requestFamilyLink);
router.get('/my-requests', auth_middleware_1.protect, link_controller_1.getMyLinkRequests);
exports.default = router;
