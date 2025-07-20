// src/controllers/Paypal.controller.js
import { PrismaClient } from "@prisma/client";
import paypal from "@paypal/checkout-server-sdk";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();

// Configurar cliente de PayPal
const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const client = new paypal.core.PayPalHttpClient(environment);

export const crearOrdenPaypal = async (req, res) => {
  try {
    const userId = req.userId;
    const { items, total } = req.body;

    // Validar datos recibidos
    if (!items || !total || !Array.isArray(items)) {
      return res.status(400).json({ 
        success: false,
        message: "Datos de orden incompletos o inválidos" 
      });
    }

    // Verificar que el total coincida con la suma de los items
    const calculatedTotal = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    if (Math.abs(calculatedTotal - total) > 0.01) {
      return res.status(400).json({
        success: false,
        message: "El total no coincide con la suma de los productos"
      });
    }

    // Crear orden en PayPal
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: "USD",
          value: total.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: total.toFixed(2)
            }
          }
        },
        items: items.map(item => ({
          name: item.name,
          unit_amount: {
            currency_code: "USD",
            value: item.price.toFixed(2)
          },
          quantity: item.quantity.toString(),
          sku: item.id.toString()
        }))
      }],
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: `${process.env.FRONTEND_URL}/pago-exitoso`,
        cancel_url: `${process.env.FRONTEND_URL}/carrito`
      }
    });

    const order = await client.execute(request);

    res.status(200).json({
      success: true,
      orderId: order.result.id
    });

  } catch (error) {
    console.error("Error al crear orden PayPal:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al crear orden de pago",
      error: error.message 
    });
  }
};

export const capturarOrdenPaypal = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.userId;

    if (!orderId) {
      return res.status(400).json({ 
        success: false,
        message: "Order ID es requerido" 
      });
    }

    // 1. Capturar la orden en PayPal
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    const capture = await client.execute(request);

    // Validar y obtener el monto de forma robusta
    let amountValue;
    try {
      // Primera opción: buscar en captures (para pagos capturados)
      if (capture.result.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value) {
        amountValue = parseFloat(capture.result.purchase_units[0].payments.captures[0].amount.value);
      } 
      // Segunda opción: buscar en amount directamente (para órdenes creadas)
      else if (capture.result.purchase_units?.[0]?.amount?.value) {
        amountValue = parseFloat(capture.result.purchase_units[0].amount.value);
      } else {
        throw new Error('No se encontró el monto en la respuesta de PayPal');
      }

      if (isNaN(amountValue)) {
        throw new Error('El valor del monto no es un número válido');
      }
    } catch (error) {
      console.error('Error al obtener el monto:', error);
      return res.status(500).json({
        success: false,
        message: "Error al procesar el monto del pago",
        error: error.message
      });
    }

    // 2. Obtener el carrito del usuario
    const carrito = await prisma.cart.findUnique({
      where: { userId },
      include: { 
        items: { 
          include: { 
            product: true 
          } 
        } 
      }
    });

    if (!carrito || carrito.items.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Carrito no encontrado o vacío" 
      });
    }

    // 3. Crear el pedido en la base de datos
    const pedido = await prisma.pedido.create({
      data: {
        clienteId: userId,
        total: amountValue, // Usamos el valor ya parseado
        estado: "EN_PROCESO",
        items: {
          create: carrito.items.map(item => ({
            productoId: item.productId,
            cantidad: item.quantity,
            precioUnitario: item.product.price,
            subtotal: item.product.price * item.quantity
          }))
        }
      },
      include: {
        items: true
      }
    });

    // 4. Registrar la venta en la tabla Sales para cada producto
    for (const item of carrito.items) {
      await prisma.sales.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          salePrice: item.product.price,
          total: item.product.price * item.quantity,
          customerId: userId
        }
      });
    }

    // 5. Vaciar el carrito
    await prisma.cartItem.deleteMany({
      where: { cartId: carrito.id }
    });

    // 6. Actualizar stock de productos
    for (const item of carrito.items) {
      await prisma.productos.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      orderId: capture.result.id,
      pedidoId: pedido.id,
      total: pedido.total,
      items: pedido.items
    });

  } catch (error) {
    console.error("Error al capturar orden PayPal:", error);
    res.status(500).json({ 
      success: false,
      message: "Error al procesar el pago",
      error: error.message
    });
  }
};