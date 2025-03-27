import { Router } from 'express';
import * as prediccionController from '../controllers/Predicciones.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = Router();

// Endpoint para obtener productos más vendidos por categoría (con autenticación y permisos)
router.get('/top-products', isAuthenticated, isAdmin, prediccionController.getTopProductsByCategory);

// Obtener el producto menos vendido (opcional: por categoría)
router.get('/least-sold', isAuthenticated, isAdmin, prediccionController.getLeastSoldProduct);

// Obtener todas las ventas (con filtros opcionales)
router.get('/ventas', isAuthenticated, isAdmin, prediccionController.getAllSales);

// Obtener producto con bajo stock
router.get('/low-stock', isAuthenticated, isAdmin, prediccionController.getLowStockProduct);

// Detalles completos de un producto + métricas de ventas
router.get('/productos/:productId/details', isAuthenticated, prediccionController.getProductSalesDetails);

// ==============================================
// NUEVAS RUTAS PARA GRÁFICOS Y VISUALIZACIONES
// ==============================================

// 1. Distribución de ventas por categoría (gráfico de torta)
router.get('/charts/sales-distribution', isAuthenticated, prediccionController.getSalesDistributionByCategory);

// 2. Top productos más vendidos (gráfico de barras)
router.get('/charts/top-products', isAuthenticated, prediccionController.getTopSellingProducts);

// 3. Evolución de ventas por mes (gráfico de líneas)
router.get('/charts/monthly-trend', isAuthenticated, prediccionController.getMonthlySalesTrend);

// 4. Comparación stock inicial vs actual (gráfico de comparación)
router.get('/charts/stock-comparison', isAuthenticated, isAdmin, prediccionController.getStockComparison);

// 5. Ventas por categoría y mes (gráfico de barras apiladas)
router.get('/charts/category-monthly', isAuthenticated, isAdmin, prediccionController.getCategorySalesByMonth);

// 6. Endpoint adicional: Ventas por día de la semana (útil para patrones de venta)
router.get('/charts/weekday-sales', isAuthenticated, prediccionController.getWeekdaySalesPattern);

export default router;