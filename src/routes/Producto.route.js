// src/rutas/productoRoutes.js
import { Router } from 'express';
import { upload } from '../config/cloudinaryConfig.js';
import * as ProductosController from '../controllers/Productos.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = Router();

// Crear producto con varias imágenes (campo "images")
// Se requiere que el usuario esté autenticado y sea administrador
router.post('/crear', isAuthenticated, isAdmin, upload.array('images'), ProductosController.crearProducto);


//obtendremos todos los productos que tengan ofertas
router.get('/ofertas', ProductosController.obtenerProductosConDescuento);

// Actualizar producto y subir nuevas imágenes
// Se requiere autenticación y privilegios de administrador
router.put('/:id', isAuthenticated, isAdmin, upload.array('images'), ProductosController.actualizarProducto);

// src/rutas/productoRoutes.js
// Obtener todos los productos (público)
router.get('/', ProductosController.obtenerTodosLosProductos);


// Obtener producto por ID (público)
router.get('/:id', ProductosController.obtenerProductoPorId);
// Obtener productos aleatorios
router.get("/productos/aleatorios", ProductosController.obtenerProductosAleatorios);

// "Eliminar" producto (o inactivarlo)
// Se requiere autenticación y privilegios de administrador
router.delete('/:id', isAuthenticated, isAdmin, ProductosController.eliminarProducto);


export default router;
