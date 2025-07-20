// src/routes/paypal.routes.js
import { Router } from 'express';
import { crearOrdenPaypal, capturarOrdenPaypal } from '../controllers/Paypal.controller.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// Crear orden de PayPal
router.post('/create-order', crearOrdenPaypal);

// Capturar orden de PayPal
router.post('/capture-order', capturarOrdenPaypal);

export default router;
