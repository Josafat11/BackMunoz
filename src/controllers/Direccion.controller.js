// src/controllers/Direccion.controller.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
// Función para obtener todas las direcciones del usuario
export const obtenerDirecciones = async (req, res) => {
  try {
    const userId = req.userId;

    // Obtener direcciones sin ordenar por createdAt (ya que parece no existir)
    const direcciones = await prisma.direccion.findMany({
      where: {
        userId: userId
      }
      // Si quieres ordenar por algún campo, usa uno que exista en tu modelo
      // Por ejemplo, podrías ordenar por id si existe:
      // orderBy: {
      //   id: 'desc'
      // }
    });

    res.status(200).json({
      success: true,
      data: direcciones
    });

  } catch (error) {
    console.error("Error al obtener direcciones:", error);
    res.status(500).json({
      success: false,
      message: "Error del servidor al obtener direcciones",
      error: error.message
    });
  }
};


export const crearDireccion = async (req, res) => {
  try {
    const userId = req.userId; // debe venir del middleware de autenticación
    const { calle, numero, ciudad, estado, pais, cp } = req.body;

    // Validar campos requeridos
    if (!calle || !numero || !ciudad || !estado || !pais || !cp) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son obligatorios"
      });
    }

    // Crear la dirección
    const direccion = await prisma.direccion.create({
      data: {
        calle,
        numero,
        ciudad,
        estado,
        pais,
        cp,
        userId
      }
    });

    res.status(201).json({
      success: true,
      message: "Dirección registrada correctamente",
      direccion
    });

  } catch (error) {
    console.error("Error al crear dirección:", error);
    res.status(500).json({
      success: false,
      message: "Error del servidor al registrar la dirección",
      error: error.message
    });
  }
};


