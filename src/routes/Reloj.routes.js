import { Router } from "express";
import {
  obtenerProductosConPocoStock,
  obtenerPedidosPorEstado
} from "../controllers/Reloj.controller.js";

const router = Router();

// Rutas para el reloj

// 📦 Obtener productos con poco stock
router.get("/inventario/poco-stock", obtenerProductosConPocoStock);

// 📬 Obtener pedidos filtrados por estado (query param ?estado=EN_PROCESO)
router.get("/pedidos", obtenerPedidosPorEstado);

export default router;
