import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const agregarAFavoritos = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.userId;

    if (!productId) return res.status(400).json({ message: "Falta el ID del producto" });

    // Validar que el producto exista
    const producto = await prisma.productos.findUnique({ where: { id: Number(productId) } });
    if (!producto) return res.status(404).json({ message: "Producto no encontrado" });

    // Agregar a favoritos
    await prisma.favorito.upsert({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      },
      update: {},
      create: {
        userId,
        productId: Number(productId)
      }
    });

    res.status(200).json({ message: "Producto agregado a favoritos" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno al agregar a favoritos" });
  }
};

export const obtenerFavoritos = async (req, res) => {
  try {
    const userId = req.userId;

    const favoritos = await prisma.favorito.findMany({
      where: { userId },
      include: {
        product: {
          include: { images: true }
        }
      }
    });

    res.status(200).json(favoritos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener favoritos" });
  }
};

export const eliminarFavorito = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId } = req.params;

    await prisma.favorito.delete({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });

    res.status(200).json({ message: "Producto eliminado de favoritos" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar favorito" });
  }
};


export const contarFavoritos = async (req, res) => {
  try {
    const userId = req.userId;
    
    const count = await prisma.favorito.count({
      where: { userId }
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al contar favoritos" });
  }
};

// controllers/Favoritos.controller.js
export const toggleFavorito = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.userId;

    if (!userId) return res.status(401).json({ message: "No autorizado" });

    const existing = await prisma.favorito.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: Number(productId)
        }
      }
    });

    let isFavorite;
    
    if (existing) {
      await prisma.favorito.delete({
        where: {
          userId_productId: {
            userId,
            productId: Number(productId)
          }
        }
      });
      isFavorite = false;
    } else {
      await prisma.favorito.create({
        data: {
          userId,
          productId: Number(productId)
        }
      });
      isFavorite = true;
    }

    res.status(200).json({ isFavorite });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar favorito" });
  }
};