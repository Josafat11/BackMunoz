import { Router } from 'express';
import * as PedidosController from '../controllers/Pedidos.controller.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = Router();

// Proteger todas las rutas
router.use(isAuthenticated);

// GET /api/pedidos - Obtener todos los pedidos del usuario
router.get('/', PedidosController.obtenerPedidosUsuario);

// GET /api/pedidos/:id - Obtener detalles de un pedido
router.get('/:id', PedidosController.obtenerPedidoPorId);

// PUT /api/pedidos/estado/:id - (opcional) Actualizar estado del pedido (solo admin)
router.put('/estado/:id', PedidosController.actualizarEstadoPedido); // Asegúrate de proteger esta con un middleware de rol

export default router;
