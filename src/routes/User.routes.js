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
router.get('/profile', isAuthenticated, userController.getProfile); // Perfil del usuario 
router.get('/check-session', isAuthenticated, userController.checkSession); // Verificar la sesión
router.post('/logout', isAuthenticated, userController.logout); // Cerrar sesión


// Ruta protegida para obtener todos los usuarios (solo admin)
router.get('/users', isAuthenticated, isAdmin, userController.getAllUsers);

// Rutas del admin para ver usuarios recientes y bloqueados
router.get('/admin/recent-users', isAuthenticated, isAdmin, userController.getRecentUsers);
router.get('/admin/recent-blocked', isAuthenticated, isAdmin, userController.getRecentBlockedUsers);
export default router;
