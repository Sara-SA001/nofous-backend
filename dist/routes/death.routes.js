"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const death_controller_1 = require("../controllers/death.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/request', auth_middleware_1.protect, death_controller_1.uploadDeathDocuments, death_controller_1.requestDeath);
router.get('/my-requests', auth_middleware_1.protect, death_controller_1.getMyDeathRequests);
exports.default = router;
