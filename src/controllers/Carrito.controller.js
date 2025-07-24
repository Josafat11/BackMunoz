// src/controllers/Carrito.controller.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import axios from "axios"; // Asegúrate de instalar axios: npm install axios


// Función para obtener recomendaciones desde el microservicio
const obtenerRecomendaciones = async (partNumber) => {
  try {
    const response = await axios.get(
      `https://munoz-db-micro-python.eyjlaq.easypanel.host/recommend/${partNumber}`,
      { timeout: 3000 }
    );

    console.log("Respuesta cruda del microservicio:", response.data);

    const recomendaciones = response.data.recomendations;

    if (!Array.isArray(recomendaciones)) {
      console.error("Estructura inesperada:", response.data);
      throw new Error("Formato de respuesta inválido");
    }

    const partNumbersRecomendados = recomendaciones.slice(0, 5);

const productos = await prisma.productos.findMany({
      where: {
        partNumber: { in: partNumbersRecomendados },
      },
      select: {
        id: true,
        name: true,
        description: true,
        compatibilities: true,
        price: true,
        stock: true,
        partNumber: true,
        category: true,
        brand: true,
        discount: true,
        images: {
          select: {
            url: true,
          },
          take: 1,
        },
      },
      take: 10,
    });

    return productos;
  } catch (error) {
    console.error("Error al obtener recomendaciones:", error.message);
    return [];
  }
};



/**
 * Agrega un producto al carrito del usuario y devuelve recomendaciones
 */
export const agregarAlCarrito = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.userId;

    // Validaciones básicas
    if (!productId) {
      return res.status(400).json({ message: "El ID del producto es requerido" });
    }

    if (isNaN(quantity) || quantity < 1) {
      return res.status(400).json({ message: "La cantidad debe ser un número positivo" });
    }

    // Verificar que el producto existe y tiene stock
    const producto = await prisma.productos.findUnique({
      where: { id: Number(productId) },
    });

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    if (producto.stock < quantity) {
      return res.status(400).json({ 
        message: "No hay suficiente stock disponible",
        stockDisponible: producto.stock
      });
    }

    // Buscar el carrito del usuario o crear uno si no existe
    let carrito = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!carrito) {
      carrito = await prisma.cart.create({
        data: {
          userId,
          usuarios: {
            connect: { id: userId }
          }
        },
        include: { items: true }
      });
    }

    // Verificar si el producto ya está en el carrito
    const itemExistente = carrito.items.find(item => item.productId === Number(productId));
    let carritoActualizado;

    if (itemExistente) {
      // Actualizar la cantidad si el producto ya está en el carrito
      const nuevaCantidad = itemExistente.quantity + Number(quantity);
      
      if (producto.stock < nuevaCantidad) {
        return res.status(400).json({ 
          message: "No hay suficiente stock disponible para la cantidad solicitada",
          stockDisponible: producto.stock,
          cantidadActualEnCarrito: itemExistente.quantity
        });
      }

      await prisma.cartItem.update({
        where: { id: itemExistente.id },
        data: { quantity: nuevaCantidad }
      });
    } else {
      // Agregar nuevo item al carrito
      await prisma.cartItem.create({
        data: {
          cartId: carrito.id,
          productId: Number(productId),
          quantity: Number(quantity)
        }
      });
    }

    // Obtener el carrito actualizado para devolverlo
    carritoActualizado = await prisma.cart.findUnique({
      where: { id: carrito.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  take: 1 // Solo la primera imagen
                }
              }
            }
          }
        }
      }
    });

    // OBTENER RECOMENDACIONES BASADAS EN EL PRODUCTO AÑADIDO
    const recomendaciones = await obtenerRecomendaciones(producto.partNumber);
    console.log(recomendaciones);

    return res.status(200).json({
      message: "Producto agregado al carrito exitosamente",
      carrito: carritoActualizado,
      recomendados: recomendaciones // Nuevo campo con productos recomendados
    });

  } catch (error) {
    console.error("Error al agregar al carrito:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Obtener el carrito del usuario actual
 */
export const obtenerCarrito = async (req, res) => {
  try {
    const userId = req.userId;

    const carrito = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true
              }
            }
          }
        }
      }
    });

    if (!carrito) {
      return res.status(200).json({ 
        message: "El usuario no tiene un carrito activo",
        carrito: null
      });
    }

    return res.status(200).json({
      message: "Carrito obtenido exitosamente",
      carrito
    });

  } catch (error) {
    console.error("Error al obtener el carrito:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Eliminar un producto del carrito
 */
export const eliminarDelCarrito = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.userId;

    if (!productId) {
      return res.status(400).json({ message: "El ID del producto es requerido" });
    }

    // Buscar el carrito del usuario
    const carrito = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!carrito) {
      return res.status(404).json({ message: "Carrito no encontrado" });
    }

    // Verificar si el producto está en el carrito
    const itemExistente = carrito.items.find(item => item.productId === Number(productId));

    if (!itemExistente) {
      return res.status(404).json({ message: "El producto no está en el carrito" });
    }

    // Eliminar el item del carrito
    await prisma.cartItem.delete({
      where: { id: itemExistente.id }
    });

    return res.status(200).json({
      message: "Producto eliminado del carrito exitosamente"
    });

  } catch (error) {
    console.error("Error al eliminar del carrito:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Actualizar la cantidad de un producto en el carrito
 */
export const actualizarCantidadCarrito = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.userId;

    // Validaciones
    if (!productId || !quantity) {
      return res.status(400).json({ 
        message: "El ID del producto y la cantidad son requeridos" 
      });
    }

    if (isNaN(quantity) || quantity < 1) {
      return res.status(400).json({ 
        message: "La cantidad debe ser un número positivo" 
      });
    }

    // Verificar que el producto existe y tiene stock
    const producto = await prisma.productos.findUnique({
      where: { id: Number(productId) },
    });

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    if (producto.stock < quantity) {
      return res.status(400).json({ 
        message: "No hay suficiente stock disponible",
        stockDisponible: producto.stock
      });
    }

    // Buscar el carrito del usuario
    const carrito = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!carrito) {
      return res.status(404).json({ message: "Carrito no encontrado" });
    }

    // Verificar si el producto está en el carrito
    const itemExistente = carrito.items.find(item => item.productId === Number(productId));

    if (!itemExistente) {
      return res.status(404).json({ message: "El producto no está en el carrito" });
    }

    // Actualizar la cantidad
    await prisma.cartItem.update({
      where: { id: itemExistente.id },
      data: { quantity: Number(quantity) }
    });

    return res.status(200).json({
      message: "Cantidad actualizada exitosamente"
    });

  } catch (error) {
    console.error("Error al actualizar cantidad en carrito:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Vaciar todo el carrito
 */
export const vaciarCarrito = async (req, res) => {
  try {
    const userId = req.userId;

    // Buscar el carrito del usuario
    const carrito = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!carrito) {
      return res.status(404).json({ message: "Carrito no encontrado" });
    }

    // Eliminar todos los items del carrito
    await prisma.cartItem.deleteMany({
      where: { cartId: carrito.id }
    });

    return res.status(200).json({
      message: "Carrito vaciado exitosamente"
    });

  } catch (error) {
    console.error("Error al vaciar el carrito:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};