import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Obtener todos los pedidos del usuario autenticado
 */
export const obtenerPedidosUsuario = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Agregar paginación
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [pedidos, total] = await Promise.all([
      prisma.pedido.findMany({
        where: { clienteId: userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
        include: {
          items: {
            select: {
              cantidad: true,
              precioUnitario: true,
              subtotal: true,
              producto: {
                select: {
                  name: true,
                  partNumber: true,
                  brand: true,
                  images: { take: 1 } // Solo la primera imagen para listado
                }
              }
            }
          },
          direccion: {
            select: {
              ciudad: true,
              estado: true
            }
          }
        }
      }),
      prisma.pedido.count({ where: { clienteId: userId } })
    ]);

    res.status(200).json({
      pedidos,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    res.status(500).json({ 
      message: "Error al obtener los pedidos",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener detalle de un pedido específico
 */
export const obtenerPedidoPorId = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const pedido = await prisma.pedido.findUnique({
      where: {
        id: Number(id),
        clienteId: userId
      },
      include: {
        items: {
          select: {
            cantidad: true,
            precioUnitario: true,
            subtotal: true,
            producto: {
              select: {
                name: true,
                description: true,
                price: true,
                partNumber: true,
                brand: true,
                images: true,
                category: true
              }
            }
          }
        },
        direccion: {
          select: {
            calle: true,
            numero: true,
            ciudad: true,
            estado: true,
            pais: true,
            cp: true
          }
        },
        cliente: {
          select: {
            name: true,
            lastname: true,
            email: true,
            telefono: true
          }
        }
      }
    });

    if (!pedido) {
      return res.status(404).json({ 
        message: "Pedido no encontrado o no pertenece al usuario" 
      });
    }

    // Calcular total general por si hay discrepancia
    const totalCalculado = pedido.items.reduce(
      (sum, item) => sum + item.subtotal, 0
    );

    res.status(200).json({ 
      ...pedido,
      totalCalculado,
      diferencia: pedido.total - totalCalculado // Para verificar consistencia
    });
  } catch (error) {
    console.error("Error al obtener pedido:", error);
    res.status(500).json({ 
      message: "Error al obtener el pedido",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


/**
 * (Opcional) Actualizar estado del pedido (solo para admins)
 */
export const actualizarEstadoPedido = async (req, res) => {
  try {
    // Verificar rol de admin
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ message: "No autorizado" });
    }

    const { id } = req.params;
    const { nuevoEstado, comentario } = req.body;

    const estadosValidos = ["EN_PROCESO", "EN_CAMINO", "ENTREGADO", "CANCELADO"];
    if (!estadosValidos.includes(nuevoEstado)) {
      return res.status(400).json({ 
        message: "Estado inválido",
        estadosValidos 
      });
    }

    const pedido = await prisma.$transaction(async (tx) => {
      const updatedPedido = await tx.pedido.update({
        where: { id: Number(id) },
        data: { estado: nuevoEstado },
      });

      // Registrar el cambio de estado
      await tx.historialEstadoPedido.create({
        data: {
          pedidoId: Number(id),
          estadoAnterior: updatedPedido.estado,
          estadoNuevo: nuevoEstado,
          comentario,
          cambiadoPor: req.userId
        }
      });

      return updatedPedido;
    });

    // Aquí podrías agregar notificación al cliente (email, websocket, etc.)

    res.status(200).json({ 
      message: "Estado actualizado correctamente",
      pedido 
    });
  } catch (error) {
    console.error("Error al actualizar estado del pedido:", error);
    res.status(500).json({ 
      message: "Error al actualizar el estado del pedido",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};