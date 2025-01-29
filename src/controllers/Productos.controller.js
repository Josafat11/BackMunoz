import Producto from '../models/Producto.model.js';

// Obtener todos los productos
export const obtenerTodosLosProductos = async (req, res) => {
  try {
    // Buscar todos los productos en la base de datos
    const productos = await Producto.find();

    // Respuesta exitosa
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error en obtenerTodosLosProductos:", error);
    res.status(500).json({ message: "Error interno del servidor al obtener los productos." });
  }
};