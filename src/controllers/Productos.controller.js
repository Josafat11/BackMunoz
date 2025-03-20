import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Crear un nuevo producto con imágenes subidas a Cloudinary
 */ export const crearProducto = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      partNumber,
      category,
      brand,
      discount,
      makes, // Puede llegar como string en JSON
      models, // Puede llegar como string en JSON
      years, // Puede llegar como string en JSON
    } = req.body;

    // 📌 Convertir los datos de JSON string a array si es necesario
    const parsedMakes = typeof makes === "string" ? JSON.parse(makes) : makes;
    const parsedModels =
      typeof models === "string" ? JSON.parse(models) : models;
    const parsedYears = typeof years === "string" ? JSON.parse(years) : years;

    // 📌 Validar que sean arrays reales si hay datos
    if (
      (parsedMakes.length > 0 || parsedModels.length > 0 || parsedYears.length > 0) &&
      (!Array.isArray(parsedMakes) ||
        !Array.isArray(parsedModels) ||
        !Array.isArray(parsedYears))
    ) {
      return res
        .status(400)
        .json({
          message: "Los campos makes, models y years deben ser arrays válidos.",
        });
    }

    // 📌 Validar que los arrays tengan la misma longitud si hay datos
    if (
      parsedMakes.length > 0 &&
      (parsedMakes.length !== parsedModels.length ||
        parsedMakes.length !== parsedYears.length)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Los arrays de compatibilidad deben tener la misma cantidad de elementos.",
        });
    }

    // 📌 Convertir years a números enteros solo si hay datos
    const parsedYearsAsNumbers = parsedYears.map((year) => parseInt(year, 10));

    // 📌 Manejo de imágenes (Cloudinary)
    let imagesURLs = [];
    if (req.files && req.files.length > 0) {
      imagesURLs = req.files.map((file) => file.path);
    }

    // 📌 Crear el producto
    const newProduct = await prisma.productos.create({
      data: {
        name,
        description: description || "",
        price: price ? Number(price) : 0,
        stock: stock ? Number(stock) : 0,
        partNumber,
        category,
        brand: brand || "",
        discount: discount ? Number(discount) : 0,

        images: imagesURLs.length
          ? { create: imagesURLs.map((url) => ({ url })) }
          : undefined,

        // ✅ Solo agregar compatibilidad si hay datos
        compatibilities:
          parsedMakes.length > 0
            ? {
                create: parsedMakes.map((make, index) => ({
                  make,
                  model: parsedModels[index] || null, // Asignar null si no hay modelo
                  year: parsedYearsAsNumbers[index] || null, // Asignar null si no hay año
                  engineType: null, // Puedes agregar este campo si es necesario
                })),
              }
            : undefined, // No intenta crear compatibilidad si no hay datos
      },
      include: {
        images: true,
        compatibilities: true,
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
    if (
      typeof req.body.removeOldImages !== "undefined" &&
      req.body.removeOldImages === "true"
    ) {
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
    if (
      typeof req.body.removeOldCompat !== "undefined" &&
      req.body.removeOldCompat === "true"
    ) {
      await prisma.compatibilidad.deleteMany({
        where: { productId: numericId },
      });
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

// Obtener todos los productos con filtros
export const obtenerTodosLosProductos = async (req, res) => {
  const { search, categoria, minPrecio, maxPrecio, page = 1, pageSize = 10 } = req.query;

  // Validar que page y pageSize sean números válidos
  const pageNumber = parseInt(page, 10);
  const pageSizeNumber = parseInt(pageSize, 10);

  if (isNaN(pageNumber) || isNaN(pageSizeNumber) || pageNumber < 1 || pageSizeNumber < 1) {
    return res.status(400).json({ message: "Parámetros de paginación inválidos." });
  }

  try {
    // Obtener el número total de productos (para paginación)
    const totalProductos = await prisma.productos.count({
      where: {
        OR: [
          {
            name: {
              contains: search || "",
            },
          },
          {
            description: {
              contains: search || "",
            },
          },
          {
            category: {
              contains: search || "",
            },
          },
        ],
        category: categoria ? { equals: categoria } : undefined,
        price: {
          gte: minPrecio ? parseFloat(minPrecio) : undefined,
          lte: maxPrecio ? parseFloat(maxPrecio) : undefined,
        },
      },
    });

    // Obtener los productos paginados
    const productos = await prisma.productos.findMany({
      where: {
        OR: [
          {
            name: {
              contains: search || "",
            },
          },
          {
            description: {
              contains: search || "",
            },
          },
          {
            category: {
              contains: search || "",
            },
          },
        ],
        category: categoria ? { equals: categoria } : undefined,
        price: {
          gte: minPrecio ? parseFloat(minPrecio) : undefined,
          lte: maxPrecio ? parseFloat(maxPrecio) : undefined,
        },
      },
      skip: (pageNumber - 1) * pageSizeNumber,
      take: pageSizeNumber,
      include: {
        images: true,
        compatibilities: true,
      },
    });

    // Respuesta con información de paginación
    res.status(200).json({
      productos,
      paginacion: {
        paginaActual: pageNumber,
        totalPaginas: Math.ceil(totalProductos / pageSizeNumber),
        totalProductos,
      },
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};


export const obtenerProductosAleatorios = async (req, res) => {
  const { cantidad = 5 } = req.query; // Cantidad de productos aleatorios a obtener (por defecto 5)

  try {
    // Obtener el número total de productos
    const totalProductos = await prisma.productos.count();

    // Si hay menos productos que la cantidad solicitada, ajustar la cantidad
    const cantidadFinal = Math.min(cantidad, totalProductos);

    // Obtener todos los IDs de productos
    const todosLosIds = await prisma.productos.findMany({
      select: { id: true },
    });

    // Mezclar los IDs aleatoriamente
    const idsAleatorios = todosLosIds
      .map((producto) => producto.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, cantidadFinal);

    // Obtener los productos con los IDs aleatorios
    const productosAleatorios = await prisma.productos.findMany({
      where: {
        id: { in: idsAleatorios },
      },
      include: {
        images: true, // Incluir imágenes
        compatibilities: true, // Incluir compatibilidades
      },
    });

    res.status(200).json(productosAleatorios);
  } catch (error) {
    console.error("Error al obtener productos aleatorios:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};