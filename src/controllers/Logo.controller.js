// src/controlador/logoController.js
import Logo from '../models/Logo.model.js'; // Importa el modelo
import { upload } from '../config/cloudinaryConfig.js'; // Importa la configuración de Cloudinary

// Controlador para subir un nuevo logo
export const subirLogo = async (req, res) => {
    try {
        // Usa multer con Cloudinary para procesar la subida
        upload.single('file')(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error al subir la imagen' });
            }

            // Crear un nuevo documento en la colección de logos
            const newLogo = new Logo({
                url: req.file.path, // URL generada por Cloudinary
                autor: req.body.autor, // Autor pasado en el cuerpo de la solicitud
            });

            await newLogo.save();

            res.status(201).json({
                message: 'Logo subido y guardado exitosamente',
                logo: newLogo,
            });
        });
    } catch (error) {
        console.error("Error al subir el logo:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener el logo más reciente
export const obtenerUltimoLogo = async (req, res) => {
    try {
        const ultimoLogo = await Logo.findOne().sort({ fechaSubida: -1 });

        if (!ultimoLogo) {
            return res.status(404).json({ message: 'No se encontró un logo subido' });
        }

        res.status(200).json(ultimoLogo);
    } catch (error) {
        console.error("Error al obtener el último logo:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener todos los logos subidos
export const obtenerTodosLosLogos = async (req, res) => {
    try {
        const logos = await Logo.find().sort({ fechaSubida: -1 });
        res.status(200).json(logos);
    } catch (error) {
        console.error("Error al obtener los logos:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
