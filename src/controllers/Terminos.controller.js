import TermsConditions from '../models/Terminos.model.js';  // Asegúrate de importar correctamente el modelo

// Crear nuevos términos y condiciones
export const createTermsConditions = async (req, res) => {
    try {
        const { title, content, effectiveDate } = req.body;

        // Crear nuevos términos y condiciones
        const newTerms = new TermsConditions({
            title,
            content,
            effectiveDate
        });

        // Guardar en la base de datos
        await newTerms.save();

        res.status(201).json({ message: 'Nuevos términos y condiciones creados exitosamente', terms: newTerms });
    } catch (error) {
        console.error("Error al crear los términos y condiciones:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Actualizar los términos y condiciones actuales (y guardar la versión anterior)
export const updateTermsConditions = async (req, res) => {
    try {
        const { id } = req.params;  // ID de los términos actuales
        const { title, content, effectiveDate } = req.body;

        // Buscar los términos actuales
        const currentTerms = await TermsConditions.findById(id);
        if (!currentTerms) {
            return res.status(404).json({ message: 'Términos y condiciones no encontrados' });
        }

        // Mover los términos actuales a la lista de versiones anteriores
        currentTerms.previousVersions.push({
            title: currentTerms.title,
            content: currentTerms.content,
            createdAt: currentTerms.createdAt,
            effectiveDate: currentTerms.effectiveDate
        });

        // Actualizar los términos actuales con los nuevos datos
        currentTerms.title = title;
        currentTerms.content = content;
        currentTerms.effectiveDate = effectiveDate;
        currentTerms.createdAt = Date.now();  // Actualizar la fecha de creación

        // Guardar los cambios en la base de datos
        await currentTerms.save();

        res.status(200).json({ message: 'Términos y condiciones actualizados exitosamente', terms: currentTerms });
    } catch (error) {
        console.error("Error al actualizar los términos y condiciones:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener los términos y condiciones actuales
export const getCurrentTermsConditions = async (req, res) => {
    try {
        // Obtener los términos más recientes (ordenados por fecha de creación descendente)
        const currentTerms = await TermsConditions.findOne().sort({ createdAt: -1 });

        if (!currentTerms) {
            return res.status(404).json({ message: 'No se encontraron términos y condiciones actuales' });
        }

        res.status(200).json(currentTerms);
    } catch (error) {
        console.error("Error al obtener los términos y condiciones actuales:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Listar todas las versiones anteriores de los términos y condiciones
export const getPreviousVersions = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar los términos por su ID
        const terms = await TermsConditions.findById(id);
        if (!terms) {
            return res.status(404).json({ message: 'Términos y condiciones no encontrados' });
        }

        // Devolver las versiones anteriores
        res.status(200).json(terms.previousVersions);
    } catch (error) {
        console.error("Error al obtener las versiones anteriores de los términos y condiciones:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
