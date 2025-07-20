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
    const { items, total, direccionId } = req.body;

    // Validar datos recibidos
    if (!items || !total || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Datos de orden incompletos o inválidos"
      });
    }

    if (!direccionId) {
      return res.status(400).json({
        success: false,
        message: "direccionId es requerido para continuar con la orden"
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

    // Buscar la dirección en la base de datos y verificar que pertenezca al usuario
    const direccion = await prisma.direccion.findUnique({
      where: { id: direccionId },
      include: { user: true }
    });

    if (!direccion || direccion.userId !== userId) {
      return res.status(400).json({
        success: false,
        message: "La dirección no existe o no pertenece al usuario."
      });
    }

    // Crear orden en PayPal con dirección de envío
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
        shipping: {
          name: {
            full_name: `${direccion.user.name} ${direccion.user.lastname}`// Si quieres usar el nombre del usuario, necesitas hacer include de Usuarios
          },
          address: {
            address_line_1: `${direccion.calle} ${direccion.numero}`,
            address_line_2: "", // puedes agregar referencia si luego la agregas a la DB
            admin_area_2: direccion.ciudad,
            admin_area_1: direccion.estado,
            postal_code: direccion.cp,
            country_code: "MX"
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
        shipping_preference: "SET_PROVIDED_ADDRESS",
        user_action: "PAY_NOW",
        return_url: `${process.env.FRONTEND_URL}/pago-exitoso`,
        cancel_url: `${process.env.FRONTEND_URL}/carrito`
      }
    });

    const order = await client.execute(request);

    res.status(200).json({
      success: true,
      orderId: order.result.id,
      direccionId // lo devuelves para que el frontend lo conserve y lo envíe en /capture-order
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
    const { orderId, direccionId } = req.body;
    const userId = req.userId;

    if (!orderId || !direccionId) {
      return res.status(400).json({
        success: false,
        message: "Order ID y direccionId son requeridos"
      });
    }

    // Verificar que la dirección sea válida y pertenezca al usuario
    const direccion = await prisma.direccion.findUnique({
      where: { id: direccionId }
    });

    if (!direccion || direccion.userId !== userId) {
      return res.status(400).json({
        success: false,
        message: "La dirección no existe o no pertenece al usuario."
      });
    }

    // Capturar la orden en PayPal
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    const capture = await client.execute(request);

    // Obtener el monto capturado
    let amountValue;
    try {
      const captureData = capture.result.purchase_units?.[0]?.payments?.captures?.[0];
      amountValue = captureData?.amount?.value
        ? parseFloat(captureData.amount.value)
        : parseFloat(capture.result.purchase_units?.[0]?.amount?.value || 0);

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

    // Obtener el carrito del usuario
    const carrito = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!carrito || carrito.items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Carrito no encontrado o vacío"
      });
    }

    // Crear el pedido
    const pedido = await prisma.pedido.create({
      data: {
        clienteId: userId,
        direccionId: direccionId,
        total: amountValue,
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

    // Registrar ventas individuales
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

    // Vaciar el carrito
    await prisma.cartItem.deleteMany({ where: { cartId: carrito.id } });

    // Actualizar stock
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
