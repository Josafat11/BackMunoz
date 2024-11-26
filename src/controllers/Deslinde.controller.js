import Deslinde from '../models/Deslinde.model.js';
import sanitizeHtml from 'sanitize-html';

// Crear un nuevo deslinde
export const createDeslinde = async (req, res) => {
    try {
        let { title, content, effectiveDate } = req.body;

        // Sanitizar los campos para prevenir scripts maliciosos
        title = sanitizeHtml(title, {
            allowedTags: [],
            allowedAttributes: {},
        });

        content = sanitizeHtml(content, {
            allowedTags: ["b", "i", "u"],
            allowedAttributes: {},
        });

        // Validar campos requeridos
        if (!title || !content || !effectiveDate) {
            return res.status(400).json({
                message: "Todos los campos son requeridos, revise su solicitud.",
            });
        }

        // Validar que la fecha de vigencia no sea anterior a la fecha actual
        if (new Date(effectiveDate) < new Date()) {
            return res.status(400).json({
                message: "La fecha de vigencia no puede ser anterior a la fecha actual.",
            });
        }

        // Crear un nuevo deslinde
        const newDeslinde = new Deslinde({
            title,
            content,
            effectiveDate,
            isCurrent: false, // Por defecto, no es actual
        });

        await newDeslinde.save();
        return res.status(201).json({
            message: "Deslinde creado exitosamente",
            deslinde: newDeslinde,
        });
    } catch (error) {
        console.error("Error al crear el deslinde:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Obtener el deslinde actual
export const getCurrentDeslinde = async (req, res) => {
    try {
        const currentDeslinde = await Deslinde.findOne({ isCurrent: true });

        if (!currentDeslinde) {
            return res.status(404).json({ message: 'No se encontró un deslinde actual' });
        }

        res.status(200).json(currentDeslinde);
    } catch (error) {
        console.error("Error al obtener el deslinde actual:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener todos los deslindes
export const getAllDeslindes = async (req, res) => {
    try {
        const deslindes = await Deslinde.find().sort({ createdAt: -1 });

        res.status(200).json(deslindes);
    } catch (error) {
        console.error("Error al obtener todos los deslindes:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Actualizar un deslinde existente
export const updateDeslinde = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, effectiveDate } = req.body;

        const updatedDeslinde = await Deslinde.findByIdAndUpdate(
            id,
            { title, content, effectiveDate },
            { new: true }
        );

        if (!updatedDeslinde) {
            return res.status(404).json({ message: 'No se encontró el deslinde a actualizar' });
        }

        res.status(200).json({ message: 'Deslinde actualizado exitosamente', deslinde: updatedDeslinde });
    } catch (error) {
        console.error("Error al actualizar el deslinde:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Eliminar un deslinde
export const deleteDeslinde = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "El ID del deslinde es requerido." });
        }

        const deslindeToDelete = await Deslinde.findById(id);
        if (!deslindeToDelete) {
            return res.status(404).json({ message: "Deslinde no encontrado." });
        }

        await Deslinde.findByIdAndDelete(id);

        if (deslindeToDelete.isCurrent) {
            const latestDeslinde = await Deslinde.findOne().sort({ createdAt: -1 });
            if (latestDeslinde) {
                latestDeslinde.isCurrent = true;
                await latestDeslinde.save();
                return res.status(200).json({
                    message: "Deslinde eliminado y el más reciente establecido como actual.",
                    latestDeslinde,
                });
            } else {
                return res.status(200).json({
                    message: "Deslinde eliminado. No hay más deslindes disponibles.",
                });
            }
        }

        return res.status(200).json({ message: "Deslinde eliminado exitosamente." });
    } catch (error) {
        console.error("Error al eliminar el deslinde:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// Establecer un deslinde como el actual
export const setAsCurrentDeslinde = async (req, res) => {
    try {
        const { id } = req.params;

        await Deslinde.updateMany({ isCurrent: true }, { isCurrent: false });

        const currentDeslinde = await Deslinde.findByIdAndUpdate(
            id,
            { isCurrent: true },
            { new: true }
        );

        if (!currentDeslinde) {
            return res.status(404).json({ message: 'No se encontró el deslinde a establecer como actual' });
        }

        res.status(200).json({ message: 'Deslinde marcado como actual exitosamente', deslinde: currentDeslinde });
    } catch (error) {
        console.error("Error al establecer el deslinde como actual:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
