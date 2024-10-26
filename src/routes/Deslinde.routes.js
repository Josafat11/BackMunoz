import { Router } from 'express';
import * as deslindeLegalController from '../controllers/Deslinde.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';  // Middleware de autenticación y permisos

const router = Router();

// Ruta para crear un nuevo deslinde legal (requiere ser administrador)
router.post('/deslinde-legal', isAuthenticated, isAdmin, deslindeLegalController.createDeslindeLegal);

// Ruta para actualizar el deslinde legal actual (requiere ser administrador)
router.put('/deslinde-legal/:id', isAuthenticated, isAdmin, deslindeLegalController.updateDeslindeLegal);

// Ruta para obtener el deslinde legal actual (disponible para todos los usuarios autenticados)
router.get('/deslinde-legal/current', isAuthenticated, deslindeLegalController.getCurrentDeslindeLegal);

// Ruta para listar todas las versiones anteriores de un deslinde legal (requiere ser administrador)
router.get('/deslinde-legal/:id/previous-versions', isAuthenticated, isAdmin, deslindeLegalController.getPreviousVersions);

export default router;
