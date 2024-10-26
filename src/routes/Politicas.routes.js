import { Router } from 'express';
import * as privacyPolicyController from '../controllers/Politicas.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js'; // Importa los middlewares de autenticación y autorización

const router = Router();

// Ruta para crear una nueva política de privacidad (requiere ser administrador)
router.post('/privacy-policy', isAuthenticated, isAdmin, privacyPolicyController.createOrUpdatePrivacyPolicy);

// Ruta para actualizar la política de privacidad (requiere ser administrador)
router.put('/privacy-policy/:id', isAuthenticated, isAdmin, privacyPolicyController.updatePrivacyPolicy);

// Ruta para obtener la política de privacidad actual (disponible para todos los usuarios)
router.get('/privacy-policy/current', privacyPolicyController.getCurrentPrivacyPolicy);


// Ruta para listar todas las versiones anteriores de una política de privacidad (requiere ser administrador)
router.get('/privacy-policy/:id/previous-versions', isAuthenticated, isAdmin, privacyPolicyController.getPreviousVersions);
// Ruta para obtener la política de privacidad actual y sus versiones anteriores
router.get('/privacy-policy/current-with-versions', privacyPolicyController.getCurrentPolicyWithVersions);


export default router;
