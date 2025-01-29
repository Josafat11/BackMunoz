import { Router } from 'express';
import * as productoController from '../controllers/Productos.controller.js';

const router = Router();

router.get('/productos', productoController.obtenerTodosLosProductos);

export default router;