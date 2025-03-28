// src/rutas/carritoRoutes.js
import { Router } from 'express';
import * as CarritoController from '../controllers/Carrito.controller.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// Agregar producto al carrito
router.post('/agregar', CarritoController.agregarAlCarrito);

// Obtener el carrito del usuario actual
router.get('/', CarritoController.obtenerCarrito);

// Eliminar producto del carrito
router.delete('/eliminar/:productId', CarritoController.eliminarDelCarrito);

// Actualizar cantidad de un producto en el carrito
router.put('/actualizar/:productId', CarritoController.actualizarCantidadCarrito);

// Vaciar todo el carrito
router.delete('/vaciar', CarritoController.vaciarCarrito);

export default router;