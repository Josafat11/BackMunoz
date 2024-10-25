import { Router } from "express";
import * as userController from "../controllers/User.controller.js";
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = Router();

// Rutas públicas
router.post('/signup', userController.signUp); // Registro de usuario
router.post('/login', userController.login); // Inicio de sesión y entrega de token
router.get('/verify/:token', userController.verifyAccount); // Verificar cuenta por token

router.post('/reset-password/:token', userController.resetPassword); // Restablecer la contraseña

// Rutas protegidas (requieren token de autenticación)
router.get('/profile', isAuthenticated, userController.getProfile); // Perfil del usuario autenticado

// Rutas protegidas para CRUD de usuarios (requiere token y rol de administrador)
router.get('/users', isAuthenticated, isAdmin, userController.getAllUsers); // Obtener todos los usuarios

export default router;
