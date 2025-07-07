import { Router } from 'express';
import * as FavoritosController from '../controllers/Favoritos.controller.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = Router();

router.use(isAuthenticated);

// Agregar producto a favoritos
router.post('/agregar', FavoritosController.agregarAFavoritos);

// Obtener todos los favoritos del usuario actual
router.get('/', FavoritosController.obtenerFavoritos);

// Eliminar producto de favoritos
router.delete('/eliminar/:productId', FavoritosController.eliminarFavorito);

// contador de items de favoritos
router.get('/count', FavoritosController.contarFavoritos);

// routes/Favoritos.routes.js
router.post('/toggle', FavoritosController.toggleFavorito);

export default router;
