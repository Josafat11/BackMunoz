import Terms from '../models/Terminos.model.js';
import sanitizeHtml from 'sanitize-html';

// Crear un nuevo documento de términos y condiciones
export const createTerms = async (req, res) => {
    try {
        let { title, content, effectiveDate } = req.body;

        // Sanitizar campos
        title = sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} });
        content = sanitizeHtml(content, { allowedTags: ["b", "i", "u"], allowedAttributes: {} });

        // Validar campos requeridos
        if (!title || !content || !effectiveDate) {
            return res.status(400).json({ message: "Todos los campos son requeridos." });
        }

        // Validar fecha de vigencia
        if (new Date(effectiveDate) < new Date()) {
            return res.status(400).json({ message: "La fecha de vigencia no puede ser anterior a la fecha actual." });
        }

        // Crear el documento
        const newTerms = new Terms({ title, content, effectiveDate, isCurrent: false });
        await newTerms.save();

        return res.status(201).json({ message: "Términos creados exitosamente", terms: newTerms });
    } catch (error) {
        console.error("Error al crear términos y condiciones:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Obtener los términos actuales
export const getCurrentTerms = async (req, res) => {
    try {
        const currentTerms = await Terms.findOne({ isCurrent: true });

        if (!currentTerms) {
            return res.status(404).json({ message: "No se encontraron términos actuales" });
        }

        res.status(200).json(currentTerms);
    } catch (error) {
        console.error("Error al obtener los términos actuales:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Obtener todos los términos
export const getAllTerms = async (req, res) => {
    try {
        const terms = await Terms.find().sort({ createdAt: -1 });
        res.status(200).json(terms);
    } catch (error) {
        console.error("Error al obtener todos los términos:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Actualizar términos
export const updateTerms = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, effectiveDate } = req.body;

        const updatedTerms = await Terms.findByIdAndUpdate(
            id,
            { title, content, effectiveDate },
            { new: true }
        );

        if (!updatedTerms) {
            return res.status(404).json({ message: "No se encontraron términos para actualizar" });
        }

        res.status(200).json({ message: "Términos actualizados exitosamente", terms: updatedTerms });
    } catch (error) {
        console.error("Error al actualizar términos:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Eliminar términos
export const deleteTerms = async (req, res) => {
    try {
        const { id } = req.params;

        const termsToDelete = await Terms.findById(id);
        if (!termsToDelete) {
            return res.status(404).json({ message: "Términos no encontrados." });
        }

        await Terms.findByIdAndDelete(id);

        // Si los términos eliminados eran los actuales, establecer otro como actual
        if (termsToDelete.isCurrent) {
            const latestTerms = await Terms.findOne().sort({ createdAt: -1 });
            if (latestTerms) {
                latestTerms.isCurrent = true;
                await latestTerms.save();
                return res.status(200).json({
                    message: "Términos eliminados y el más reciente establecido como actual.",
                    latestTerms,
                });
            }
        }

        res.status(200).json({ message: "Términos eliminados exitosamente." });
    } catch (error) {
        console.error("Error al eliminar términos:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Establecer términos como actuales
export const setAsCurrentTerms = async (req, res) => {
    try {
        const { id } = req.params;

        // Desmarcar términos actuales
        await Terms.updateMany({ isCurrent: true }, { isCurrent: false });

        // Marcar el nuevo término como actual
        const currentTerms = await Terms.findByIdAndUpdate(
            id,
            { isCurrent: true },
            { new: true }
        );

        if (!currentTerms) {
            return res.status(404).json({ message: "No se encontraron términos para establecer como actuales" });
        }

        res.status(200).json({ message: "Términos establecidos como actuales exitosamente", terms: currentTerms });
    } catch (error) {
        console.error("Error al establecer términos como actuales:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};
