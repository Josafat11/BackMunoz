import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Obtener todos los pedidos del usuario autenticado
 */
export const obtenerPedidosUsuario = async (req, res) => {
  try {
    const userId = req.userId;

    const pedidos = await prisma.pedido.findMany({
      where: { clienteId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          select: {
            id: true,
            cantidad: true,
            precioUnitario: true,
            subtotal: true,
            producto: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                partNumber: true,
                brand: true,
                images: true
              }
            }
          }
        }
      }
    });

    res.status(200).json({ pedidos });
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    res.status(500).json({ message: "Error al obtener los pedidos" });
  }
};


/**
 * Obtener detalle de un pedido específico
 */
export const obtenerPedidoPorId = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const pedido = await prisma.pedido.findFirst({
      where: {
        id: Number(id),
        clienteId: userId
      },
      include: {
        items: {
          select: {
            id: true,
            cantidad: true,
            precioUnitario: true,
            subtotal: true,
            producto: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                partNumber: true,
                brand: true,
                images: true
              }
            }
          }
        }
      }
    });

    if (!pedido) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    res.status(200).json({ pedido });
  } catch (error) {
    console.error("Error al obtener pedido:", error);
    res.status(500).json({ message: "Error al obtener el pedido" });
  }
};


/**
 * (Opcional) Actualizar estado del pedido (solo para admins)
 */
export const actualizarEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body;

    const estadosValidos = ["EN_PROCESO", "EN_CAMINO", "ENTREGADO"];
    if (!estadosValidos.includes(nuevoEstado)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    const pedido = await prisma.pedido.update({
      where: { id: Number(id) },
      data: { estado: nuevoEstado },
    });

    res.status(200).json({ message: "Estado actualizado", pedido });
  } catch (error) {
    console.error("Error al actualizar estado del pedido:", error);
    res.status(500).json({ message: "Error interno" });
  }
};
