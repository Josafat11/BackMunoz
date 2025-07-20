// src/routes/direccion.routes.js
import { Router } from 'express';
import { crearDireccion, obtenerDirecciones } from '../controllers/Direccion.controller.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(isAuthenticated);
// Obtener direcciones del usuario
router.get('/direcciones', obtenerDirecciones);
// Crear nueva dirección
router.post('/nueva', crearDireccion);


export default router;
