"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
router.post('/register', auth_controller_1.uploadUserPhotos, auth_controller_1.registerUser);
router.post('/login', auth_controller_1.loginUser);
exports.default = router;
