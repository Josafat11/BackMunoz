import { Router } from 'express';
import * as termsConditionsController from '../controllers/Terminos.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js'; // Importa los middlewares de autenticación y autorización

const router = Router();

// Ruta para crear nuevos términos y condiciones (requiere ser administrador)
router.post('/terms-conditions', isAuthenticated, isAdmin, termsConditionsController.createTermsConditions);

// Ruta para actualizar los términos y condiciones actuales (requiere ser administrador)
router.put('/terms-conditions/:id', isAuthenticated, isAdmin, termsConditionsController.updateTermsConditions);

// Ruta para obtener los términos y condiciones actuales (disponible para todos los usuarios autenticados)
router.get('/terms-conditions/current', isAuthenticated, termsConditionsController.getCurrentTermsConditions);

// Ruta para listar todas las versiones anteriores de los términos y condiciones (requiere ser administrador)
router.get('/terms-conditions/:id/previous-versions', isAuthenticated, isAdmin, termsConditionsController.getPreviousVersions);

export default router;
