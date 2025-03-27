import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getTopProductsByCategory = async (req, res) => {
    try {
      // 1. Primero obtener todas las categorías únicas
      const categories = await prisma.productos.findMany({
        distinct: ['category'],
        select: { category: true }
      });
  
      if (categories.length === 0) {
        return res.status(200).json([]);
      }
  
      // 2. Para cada categoría, encontrar el producto más vendido
      const topProductsByCategory = await Promise.all(
        categories.map(async ({ category }) => {
          const topProduct = await prisma.sales.groupBy({
            by: ['productId'],
            where: {
              product: { category }
            },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 1
          });
  
          if (topProduct.length === 0) {
            return {
              category,
              product: null,
              totalSold: 0
            };
          }
  
          const productDetails = await prisma.productos.findUnique({
            where: { id: topProduct[0].productId },
            select: { name: true, partNumber: true, price: true }
          });
  
          return {
            category,
            product: productDetails,
            totalSold: topProduct[0]._sum.quantity || 0
          };
        })
      );
  
      res.status(200).json(topProductsByCategory.filter(item => item.product !== null));
    } catch (error) {
      console.error("Error en getTopProductsByCategory:", error);
      res.status(500).json({ 
        error: 'Error al obtener productos más vendidos',
        details: error.message 
      });
    }
  };

// Función para obtener el producto menos vendido (global o por categoría)
export const getLeastSoldProduct = async (req, res) => {
    try {
      const { byCategory } = req.query; // Opcional: filtrar por categoría
  
      // 1. Agrupar ventas por producto
      const salesByProduct = await prisma.sales.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'asc' } }, // Ordenar de MENOR a mayor
        where: byCategory ? { 
          product: { category: byCategory } // Filtro por categoría si existe
        } : {},
      });
  
      if (salesByProduct.length === 0) {
        return res.status(404).json({ message: 'No hay datos de ventas' });
      }
  
      // 2. Obtener el primer resultado (el menos vendido)
      const leastSold = salesByProduct[0];
  
      // 3. Buscar detalles del producto
      const product = await prisma.productos.findUnique({
        where: { id: leastSold.productId },
        select: { name: true, category: true, stock: true, partNumber: true },
      });
  
      res.status(200).json({
        product,
        totalSold: leastSold._sum.quantity || 0,
      });
    } catch (error) {
      res.status(500).json({ error: 'Error al calcular el producto menos vendido', details: error.message });
    }
  };




// Función para obtener todas las ventas con filtros opcionales por fecha
export const getAllSales = async (req, res) => {
    try {
      const { 
        startDate, 
        endDate, 
        todayOnly, 
        page = 1, 
        limit = 20,
        includeStockRisk = 'false' 
      } = req.query;
  
      // --- 1. Validación de Fechas ---
      if (startDate && isNaN(new Date(startDate).getTime())) {
        return res.status(400).json({ error: 'Formato de startDate inválido. Usa YYYY-MM-DD' });
      }
      if (endDate && isNaN(new Date(endDate).getTime())) {
        return res.status(400).json({ error: 'Formato de endDate inválido. Usa YYYY-MM-DD' });
      }
  
      // --- 2. Configurar Filtros ---
      const where = {};
      
      // Filtrar por día actual
      if (todayOnly === 'true') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        where.saleDate = {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        };
      } 
      // Filtrar por rango de fechas
      else if (startDate || endDate) {
        where.saleDate = {};
        if (startDate) where.saleDate.gte = new Date(startDate);
        if (endDate) where.saleDate.lte = new Date(endDate);
      }
  
      // --- 3. Consulta Principal ---
      const sales = await prisma.sales.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              partNumber: true,
              stock: includeStockRisk === 'true', // Solo si se pide riesgo de stock
            },
          },
        },
        orderBy: { saleDate: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      });
  
      // --- 4. Cálculo de Totales ---
      const totalUnitsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
      const totalTransactions = await prisma.sales.count({ where });
  
      // --- 5. Cálculo de Riesgo de Stock (Opcional) ---
      let salesWithStockRisk = sales;
      if (includeStockRisk === 'true') {
        salesWithStockRisk = sales.map((sale) => {
          const salesLastMonth = 10; // Ejemplo: Obtener de una consulta real
          const daysUntilOut = Math.floor(sale.product.stock / (salesLastMonth / 30)); // Estimación
          
          return {
            ...sale,
            stockRisk: {
              remainingStock: sale.product.stock - sale.quantity,
              daysUntilOut,
              estimatedOutDate: new Date(
                new Date().getTime() + daysUntilOut * 24 * 60 * 60 * 1000
              ).toISOString().split('T')[0],
            },
          };
        });
      }
  
      // --- 6. Respuesta Final ---
      res.status(200).json({
        success: true,
        data: includeStockRisk === 'true' ? salesWithStockRisk : sales,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalTransactions,
          totalPages: Math.ceil(totalTransactions / limit),
        },
        summary: {
          totalUnitsSold,
          totalTransactions,
        },
      });
  
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error al obtener ventas',
        details: error.message,
      });
    }
  };


// Función para obtener información detallada de un producto + métricas de ventas
export const getProductSalesDetails = async (req, res) => {
  try {
    const { productId } = req.params;

    // 1. Obtener información base del producto
    const product = await prisma.productos.findUnique({
      where: { id: parseInt(productId) },
      include: {
        images: true,
        compatibilities: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // 2. Calcular ventas del mes actual
    const currentDate = new Date();
    const firstDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const currentMonthSales = await prisma.sales.aggregate({
      where: {
        productId: parseInt(productId),
        saleDate: { gte: firstDayOfCurrentMonth },
      },
      _sum: { quantity: true },
    });

    // 3. Calcular ventas del mes anterior
    const firstDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

    const lastMonthSales = await prisma.sales.aggregate({
      where: {
        productId: parseInt(productId),
        saleDate: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth },
      },
      _sum: { quantity: true },
    });

    // 4. Calcular stock restante
    const totalSold = await prisma.sales.aggregate({
      where: { productId: parseInt(productId) },
      _sum: { quantity: true },
    });

    const remainingStock = product.stock - (totalSold._sum.quantity || 0);

    // 5. Formatear respuesta
    const response = {
      product: {
        ...product,
        stock: remainingStock, // Stock actualizado
      },
      metrics: {
        soldCurrentMonth: currentMonthSales._sum.quantity || 0,
        soldLastMonth: lastMonthSales._sum.quantity || 0,
        totalSold: totalSold._sum.quantity || 0,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener detalles del producto',
      details: error.message,
    });
  }
};


export const getLowStockProduct = async (req, res) => {
    try {
      const products = await prisma.productos.findMany({
        orderBy: { stock: 'asc' },
        take: 1
      });
  
      if (products.length === 0) {
        return res.status(404).json({ error: 'No hay productos' });
      }
  
      const product = products[0];
      const sales = await prisma.sales.aggregate({
        where: { productId: product.id },
        _sum: { quantity: true }
      });
  
      const totalSold = sales._sum.quantity || 0;
      const avgDailySales = totalSold / 30; // Promedio mensual
      
      res.status(200).json({
        product,
        remainingStock: product.stock,
        daysUntilOut: avgDailySales > 0 ? Math.floor(product.stock / avgDailySales) : Infinity
      });
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener producto con bajo stock' });
    }
  };




  export const getSalesDistributionByCategory = async (req, res) => {
    try {
        // Obtener ventas agrupadas por categoría
        const salesByCategory = await prisma.sales.groupBy({
            by: ['productId'],
            _sum: { quantity: true },
        });

        if (salesByCategory.length === 0) {
            return res.status(200).json([]);
        }

        // Obtener detalles de categoría para cada producto
        const categoriesData = await Promise.all(
            salesByCategory.map(async (sale) => {
                const product = await prisma.productos.findUnique({
                    where: { id: sale.productId },
                    select: { category: true }
                });
                return {
                    category: product?.category || 'Sin categoría',
                    quantity: sale._sum.quantity || 0
                };
            })
        );

        // Agrupar por categoría
        const categorySummary = categoriesData.reduce((acc, item) => {
            const existing = acc.find(c => c.category === item.category);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                acc.push({ category: item.category, quantity: item.quantity });
            }
            return acc;
        }, []);

        // Calcular porcentajes
        const totalSales = categorySummary.reduce((sum, item) => sum + item.quantity, 0);
        const result = categorySummary.map(item => ({
            category: item.category,
            quantity: item.quantity,
            percentage: totalSales > 0 ? (item.quantity / totalSales * 100).toFixed(2) : 0
        }));

        // Ordenar por cantidad descendente
        result.sort((a, b) => b.quantity - a.quantity);

        res.status(200).json(result);
    } catch (error) {
        console.error("Error en getSalesDistributionByCategory:", error);
        res.status(500).json({ 
            error: 'Error al obtener distribución de ventas por categoría',
            details: error.message 
        });
    }
};



export const getTopSellingProducts = async (req, res) => {
    try {
        const { limit = 10, timeRange = 'all' } = req.query;
        let dateFilter = {};

        // Configurar filtro de tiempo si es necesario
        if (timeRange === 'month') {
            const firstDayOfMonth = new Date();
            firstDayOfMonth.setDate(1);
            firstDayOfMonth.setHours(0, 0, 0, 0);
            dateFilter = { saleDate: { gte: firstDayOfMonth } };
        } else if (timeRange === 'week') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            dateFilter = { saleDate: { gte: oneWeekAgo } };
        }

        // Obtener productos más vendidos
        const topProducts = await prisma.sales.groupBy({
            by: ['productId'],
            where: dateFilter,
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: parseInt(limit)
        });

        if (topProducts.length === 0) {
            return res.status(200).json([]);
        }

        // Obtener detalles de los productos
        const result = await Promise.all(
            topProducts.map(async (item) => {
                const product = await prisma.productos.findUnique({
                    where: { id: item.productId },
                    select: { name: true, category: true, partNumber: true }
                });
                return {
                    productId: item.productId,
                    productName: product?.name || 'Producto desconocido',
                    category: product?.category || 'Sin categoría',
                    partNumber: product?.partNumber || 'N/A',
                    totalSold: item._sum.quantity || 0
                };
            })
        );

        res.status(200).json(result);
    } catch (error) {
        console.error("Error en getTopSellingProducts:", error);
        res.status(500).json({ 
            error: 'Error al obtener productos más vendidos',
            details: error.message 
        });
    }
};



export const getMonthlySalesTrend = async (req, res) => {
    try {
        // Usar FORMAT para SQL Server
        const salesByMonth = await prisma.$queryRaw`
            SELECT 
                FORMAT(saleDate, 'yyyy-MM') as month,
                SUM(quantity) as totalSold
            FROM Sales
            GROUP BY FORMAT(saleDate, 'yyyy-MM')
            ORDER BY month ASC
        `;

        if (!salesByMonth || salesByMonth.length === 0) {
            return res.status(200).json([]);
        }

        res.status(200).json(salesByMonth);
    } catch (error) {
        console.error("Error en getMonthlySalesTrend:", error);
        res.status(500).json({ 
            error: 'Error al obtener tendencia de ventas mensuales',
            details: error.message 
        });
    }
};

export const getStockComparison = async (req, res) => {
    try {
        // Obtener todos los productos con su stock
        const products = await prisma.productos.findMany({
            select: {
                id: true,
                name: true,
                category: true,
                stock: true
            }
        });

        if (products.length === 0) {
            return res.status(200).json([]);
        }

        // Obtener ventas por producto
        const salesByProduct = await prisma.sales.groupBy({
            by: ['productId'],
            _sum: { quantity: true }
        });

        // Crear mapa de ventas para fácil acceso
        const salesMap = new Map();
        salesByProduct.forEach(item => {
            salesMap.set(item.productId, item._sum.quantity || 0);
        });

        // Preparar datos para el gráfico
        const result = products.map(product => {
            const sold = salesMap.get(product.id) || 0;
            const currentStock = product.stock;
            // Asumimos que el stock inicial es el actual más lo vendido
            const initialStock = currentStock + sold;
            
            return {
                productId: product.id,
                productName: product.name,
                category: product.category,
                initialStock,
                currentStock,
                sold,
                percentageSold: initialStock > 0 ? (sold / initialStock * 100).toFixed(2) : 0
            };
        });

        // Ordenar por porcentaje vendido descendente
        result.sort((a, b) => b.percentageSold - a.percentageSold);

        res.status(200).json(result);
    } catch (error) {
        console.error("Error en getStockComparison:", error);
        res.status(500).json({ 
            error: 'Error al obtener comparación de stocks',
            details: error.message 
        });
    }
};



export const getCategorySalesByMonth = async (req, res) => {
    try {
        // Obtener ventas agrupadas por producto y mes
        const salesData = await prisma.$queryRaw`
            SELECT 
                p.category,
                FORMAT(s.saleDate, 'yyyy-MM') as month,
                SUM(s.quantity) as totalSold
            FROM Sales s
            JOIN Productos p ON s.productId = p.id
            GROUP BY p.category, FORMAT(s.saleDate, 'yyyy-MM')
            ORDER BY month ASC, p.category ASC
        `;

        if (!salesData || salesData.length === 0) {
            return res.status(200).json([]);
        }

        // Formatear datos para gráfico apilado
        const result = salesData.reduce((acc, item) => {
            const existingMonth = acc.find(m => m.month === item.month);
            if (existingMonth) {
                existingMonth.categories.push({
                    category: item.category,
                    totalSold: item.totalSold
                });
            } else {
                acc.push({
                    month: item.month,
                    categories: [{
                        category: item.category,
                        totalSold: item.totalSold
                    }]
                });
            }
            return acc;
        }, []);

        res.status(200).json(result);
    } catch (error) {
        console.error("Error en getCategorySalesByMonth:", error);
        res.status(500).json({ 
            error: 'Error al obtener ventas por categoría y mes',
            details: error.message 
        });
    }
};



// Agrega esto a tu archivo de controladores (Predicciones.controller.js)
export const getWeekdaySalesPattern = async (req, res) => {
    try {
        const salesByWeekday = await prisma.$queryRaw`
            SELECT 
                DATENAME(WEEKDAY, saleDate) as weekday,
                DATEPART(WEEKDAY, saleDate) as weekdayNum,
                SUM(quantity) as totalSold,
                COUNT(DISTINCT id) as transactionsCount
            FROM Sales
            GROUP BY DATENAME(WEEKDAY, saleDate), DATEPART(WEEKDAY, saleDate)
            ORDER BY DATEPART(WEEKDAY, saleDate)
        `;

        if (!salesByWeekday || salesByWeekday.length === 0) {
            return res.status(200).json([]);
        }

        res.status(200).json(salesByWeekday);
    } catch (error) {
        console.error("Error en getWeekdaySalesPattern:", error);
        res.status(500).json({ 
            error: 'Error al obtener patrón de ventas por día de la semana',
            details: error.message 
        });
    }
};