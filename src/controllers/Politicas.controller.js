import PrivacyPolicy from '../models/Politicas.model.js';  // Asegúrate de importar correctamente el modelo



export const createOrUpdatePrivacyPolicy = async (req, res) => {
    try {
        const { title, content, effectiveDate } = req.body;

        // Verificar si ya existe una política actual
        const currentPolicy = await PrivacyPolicy.findOne().sort({ createdAt: -1 });

        if (currentPolicy) {
            // Si existe, guardamos la versión actual en previousVersions antes de actualizar
            currentPolicy.previousVersions.push({
                title: currentPolicy.title,
                content: currentPolicy.content,
                createdAt: currentPolicy.createdAt,
                effectiveDate: currentPolicy.effectiveDate
            });

            // Actualizamos la política actual con los nuevos datos
            currentPolicy.title = title;
            currentPolicy.content = content;
            currentPolicy.effectiveDate = effectiveDate;
            currentPolicy.updatedAt = Date.now();

            await currentPolicy.save();
            return res.status(200).json({ message: 'Política de privacidad actualizada exitosamente', policy: currentPolicy });
        }

        // Si no existe, crear una nueva política
        const newPolicy = new PrivacyPolicy({
            title,
            content,
            effectiveDate,
        });

        await newPolicy.save();
        return res.status(201).json({ message: 'Nueva política de privacidad creada exitosamente', policy: newPolicy });
    } catch (error) {
        console.error("Error al crear o actualizar la política de privacidad:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};


// Actualizar la política de privacidad actual (y guardar la versión anterior)
export const updatePrivacyPolicy = async (req, res) => {
    try {
        const { title, content, effectiveDate } = req.body;
        const currentPolicy = await PrivacyPolicy.findOne().sort({ createdAt: -1 });

        if (!currentPolicy) {
            return res.status(404).json({ message: 'No hay ninguna política de privacidad actual para actualizar.' });
        }

        currentPolicy.previousVersions.push({
            title: currentPolicy.title,
            content: currentPolicy.content,
            createdAt: currentPolicy.createdAt,
            effectiveDate: currentPolicy.effectiveDate
        });

        currentPolicy.title = title;
        currentPolicy.content = content;
        currentPolicy.effectiveDate = effectiveDate;
        currentPolicy.createdAt = Date.now();

        await currentPolicy.save();
        res.status(200).json({ message: 'Política de privacidad actualizada exitosamente', policy: currentPolicy });
    } catch (error) {
        console.error("Error al actualizar la política de privacidad:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};


// Obtener la política de privacidad actual
// Obtener la política de privacidad actual
export const getCurrentPrivacyPolicy = async (req, res) => {
    try {
        const currentPolicy = await PrivacyPolicy.findOne().sort({ createdAt: -1 });

        if (!currentPolicy) {
            return res.status(404).json({ message: 'No se encontró una política de privacidad actual' });
        }

        res.status(200).json(currentPolicy);
    } catch (error) {
        console.error("Error al obtener la política de privacidad actual:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};


// Listar todas las versiones anteriores de la política de privacidad
// Obtener las versiones anteriores de una política de privacidad
export const getPreviousVersions = async (req, res) => {
    try {
        const currentPolicy = await PrivacyPolicy.findOne().sort({ createdAt: -1 });

        if (!currentPolicy) {
            return res.status(404).json({ message: 'No se encontraron versiones anteriores de la política de privacidad.' });
        }

        res.status(200).json(currentPolicy.previousVersions);
    } catch (error) {
        console.error("Error al obtener las versiones anteriores:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener la política de privacidad actual junto con sus versiones anteriores
export const getCurrentPolicyWithVersions = async (req, res) => {
    try {
        // Buscar la política más reciente
        const currentPolicy = await PrivacyPolicy.findOne().sort({ createdAt: -1 });

        if (!currentPolicy) {
            return res.status(404).json({ message: 'No se encontró una política de privacidad actual.' });
        }

        // Crear un objeto que contenga la política actual y las versiones anteriores
        const response = {
            currentPolicy: {
                title: currentPolicy.title,
                content: currentPolicy.content,
                effectiveDate: currentPolicy.effectiveDate,
                createdAt: currentPolicy.createdAt,
                updatedAt: currentPolicy.updatedAt,
            },
            previousVersions: currentPolicy.previousVersions,
        };

        res.status(200).json(response);
    } catch (error) {
        console.error("Error al obtener la política de privacidad actual y sus versiones anteriores:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};