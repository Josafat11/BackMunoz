import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Crear un nuevo producto con imágenes subidas a Cloudinary
 */
export const crearProducto = async (req, res) => {
  try {
    // 1. Primero extraemos los campos de req.body
    const {
      name,
      description,
      price,
      stock,
      partNumber,
      category,
      brand,
      discount,
      supplierId,
      compatibilities,
    } = req.body;

    // 2. Validar campos requeridos
    if (!name || !partNumber || !supplierId) {
      return res.status(400).json({
        message: "Faltan campos obligatorios (name, partNumber, supplierId).",
      });
    }

    // 3. Si 'compatibilities' viene como JSON string, parsearlo (opcional)
    let compatArray = [];
    if (compatibilities) {
      try {
        compatArray = JSON.parse(compatibilities); 
        // compatibilities debe ser un string JSON en el body
      } catch {
        // o manejar error
      }
    }

    // 4. 'req.files' son las imágenes subidas por Multer + Cloudinary
    // Cada archivo tiene .path con la URL de Cloudinary
    let imagesURLs = [];
    if (req.files && req.files.length > 0) {
      imagesURLs = req.files.map((file) => file.path);
    }

    // 5. Crear el producto en Prisma
    const newProduct = await prisma.productos.create({
      data: {
        name,
        description: description || "",
        price: price ? Number(price) : 0,
        stock: stock ? Number(stock) : 0,
        partNumber,
        category: category || "",
        brand: brand || "",
        discount: discount ? Number(discount) : 0,
        supplierId: Number(supplierId),

        // Crear registros en Imagenes con createMany
        images: imagesURLs.length
          ? {
              create: imagesURLs.map((url) => ({ url })),
            }
          : undefined,

        // Crear compatibilidades si las recibiste en el body
        compatibilities: compatArray.length
          ? {
              create: compatArray.map((c) => ({
                make: c.make,
                model: c.model,
                year: c.year,
                engineType: c.engineType || null,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        compatibilities: true,
        supplier: true,
      },
    });

    return res.status(201).json({
      message: "Producto creado exitosamente",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error al crear el producto:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};





/**
 * Actualizar un producto (incluyendo subida de imágenes a Cloudinary)
 */
export const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);

    // Extraer campos del body
    const {
      name,
      description,
      price,
      stock,
      partNumber,
      category,
      brand,
      discount,
      supplierId,
      compatibilities,
    } = req.body;

    // Parsear compatibilities si viene como JSON
    let compatArray = [];
    if (compatibilities) {
      try {
        compatArray = JSON.parse(compatibilities);
      } catch {
        // Manejar error de parseo
      }
    }

    // req.files son las nuevas imágenes subidas
    let newImagesURLs = [];
    if (req.files && req.files.length > 0) {
      newImagesURLs = req.files.map((file) => file.path);
    }

    // 1. Actualizar los campos básicos del producto
    const updatedProduct = await prisma.productos.update({
      where: { id: numericId },
      data: {
        name,
        description,
        price: price ? Number(price) : undefined,
        stock: stock ? Number(stock) : undefined,
        partNumber,
        category,
        brand,
        discount: discount ? Number(discount) : undefined,
        supplierId: supplierId ? Number(supplierId) : undefined,
      },
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    // 2. Manejo de imágenes
    // Ejemplo: borrar las anteriores y crear las nuevas
    if (typeof req.body.removeOldImages !== "undefined" && req.body.removeOldImages === "true") {
      // Borrar imágenes anteriores
      await prisma.imagenes.deleteMany({ where: { productId: numericId } });
    }

    // Crear las nuevas
    if (newImagesURLs.length > 0) {
      await prisma.imagenes.createMany({
        data: newImagesURLs.map((url) => ({
          url,
          productId: numericId,
        })),
      });
    }

    // 3. Manejo de compatibilidades
    // Si deseas sobrescribirlas completamente:
    if (typeof req.body.removeOldCompat !== "undefined" && req.body.removeOldCompat === "true") {
      await prisma.compatibilidad.deleteMany({ where: { productId: numericId } });
    }

    if (compatArray.length > 0) {
      await prisma.compatibilidad.createMany({
        data: compatArray.map((c) => ({
          make: c.make,
          model: c.model,
          year: c.year,
          engineType: c.engineType || null,
          productId: numericId,
        })),
      });
    }

    // 4. Retornar el producto con sus relaciones actualizadas
    const productWithRelations = await prisma.productos.findUnique({
      where: { id: numericId },
      include: { images: true, compatibilities: true, supplier: true },
    });

    res.status(200).json({
      message: "Producto actualizado exitosamente",
      product: productWithRelations,
    });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Producto no encontrado." });
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
};




/**
 * Eliminar un producto
 */
export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);

    // Verificar si existe
    const existingProduct = await prisma.productos.findUnique({
      where: { id: numericId },
    });
    if (!existingProduct) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    // Borrar el producto (y en cascada, las imágenes y compatibilidades si tienes ON DELETE CASCADE
    // De lo contrario, hay que eliminar manualmente primero imágenes y compatibilidades)
    // Ejemplo: eliminar manualmente
    await prisma.imagenes.deleteMany({ where: { productId: numericId } });
    await prisma.compatibilidad.deleteMany({ where: { productId: numericId } });

    // Luego eliminar el producto
    await prisma.productos.delete({ where: { id: numericId } });

    res.status(200).json({ message: "Producto eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};


/**
 * Obtener un producto por ID
 */
export const obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);

    const producto = await prisma.productos.findUnique({
      where: { id: numericId },
      include: {
        images: true,
        compatibilities: true,
        supplier: true,
      },
    });

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    res.status(200).json(producto);
  } catch (error) {
    console.error("Error al obtener producto por ID:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};



/**
 * Obtener todos los productos
 */
export const obtenerTodosLosProductos = async (req, res) => {
  try {
    // Podrías incluir relaciones si lo deseas
    const productos = await prisma.productos.findMany({
      include: {
        images: true,
        compatibilities: true,
        supplier: true,
      },
    });
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error en obtenerTodosLosProductos:", error);
    res.status(500).json({
      message: "Error interno del servidor al obtener los productos.",
    });
  }
};