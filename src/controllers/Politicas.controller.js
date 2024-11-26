import PrivacyPolicy from '../models/Politicas.model.js';
import sanitizeHtml from 'sanitize-html';
// Crear una nueva política de privacidad
export const createPrivacyPolicy = async (req, res) => {
    try {
        let { title, content, effectiveDate } = req.body;

        // Sanitizar los campos para prevenir scripts maliciosos
        title = sanitizeHtml(title, {
            allowedTags: [], // No se permiten etiquetas HTML
            allowedAttributes: {}, // No se permiten atributos
        });

        content = sanitizeHtml(content, {
            allowedTags: ["b", "i", "u"], // Permite solo etiquetas básicas si es necesario
            allowedAttributes: {}, // No se permiten atributos
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

        // Crear una nueva política
        const newPolicy = new PrivacyPolicy({
            title,
            content,
            effectiveDate,
            isCurrent: false, // Por defecto, no es actual
        });

        await newPolicy.save();
        return res.status(201).json({
            message: "Política de privacidad creada exitosamente",
            policy: newPolicy,
        });
    } catch (error) {
        console.error("Error al crear la política de privacidad:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Obtener la política de privacidad actual
export const getCurrentPrivacyPolicy = async (req, res) => {
    try {
      const currentPolicy = await PrivacyPolicy.findOne({ isCurrent: true });
  
      if (!currentPolicy) {
        return res.status(404).json({ message: 'No se encontró una política de privacidad actual' });
      }
  
      res.status(200).json(currentPolicy);
    } catch (error) {
      console.error("Error al obtener la política de privacidad actual:", error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  };

  
  // Obtener todas las políticas de privacidad
export const getAllPrivacyPolicies = async (req, res) => {
    try {
      const policies = await PrivacyPolicy.find().sort({ createdAt: -1 });
  
      res.status(200).json(policies);
    } catch (error) {
      console.error("Error al obtener todas las políticas de privacidad:", error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  };

  

  // Actualizar una política de privacidad existente
export const updatePrivacyPolicy = async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, effectiveDate } = req.body;
  
      const updatedPolicy = await PrivacyPolicy.findByIdAndUpdate(
        id,
        { title, content, effectiveDate },
        { new: true }
      );
  
      if (!updatedPolicy) {
        return res.status(404).json({ message: 'No se encontró la política de privacidad a actualizar' });
      }
  
      res.status(200).json({ message: 'Política de privacidad actualizada exitosamente', policy: updatedPolicy });
    } catch (error) {
      console.error("Error al actualizar la política de privacidad:", error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  };

  
  // Eliminar una política de privacidad
  export const deletePrivacyPolicy = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que el ID exista
        if (!id) {
            return res.status(400).json({ message: "El ID de la política es requerido." });
        }

        // Buscar la política a eliminar
        const policyToDelete = await PrivacyPolicy.findById(id);
        if (!policyToDelete) {
            return res.status(404).json({ message: "Política no encontrada." });
        }

        // Eliminar la política
        await PrivacyPolicy.findByIdAndDelete(id);

        // Verificar si la política eliminada era la actual
        if (policyToDelete.isCurrent) {
            // Establecer la política más reciente como actual
            const latestPolicy = await PrivacyPolicy.findOne().sort({ createdAt: -1 });
            if (latestPolicy) {
                latestPolicy.isCurrent = true;
                await latestPolicy.save();
                return res.status(200).json({
                    message: "Política eliminada y la más reciente establecida como actual.",
                    latestPolicy,
                });
            } else {
                return res.status(200).json({
                    message: "Política eliminada. No hay más políticas disponibles.",
                });
            }
        }

        return res.status(200).json({ message: "Política eliminada exitosamente." });
    } catch (error) {
        console.error("Error al eliminar la política de privacidad:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};


  

  // Establecer una política como la actual
export const setAsCurrentPrivacyPolicy = async (req, res) => {
    try {
      const { id } = req.params;
  
      // Desmarcar cualquier política que esté como actual
      await PrivacyPolicy.updateMany({ isCurrent: true }, { isCurrent: false });
  
      // Marcar la nueva política como actual
      const currentPolicy = await PrivacyPolicy.findByIdAndUpdate(
        id,
        { isCurrent: true },
        { new: true }
      );
  
      if (!currentPolicy) {
        return res.status(404).json({ message: 'No se encontró la política de privacidad a establecer como actual' });
      }
  
      res.status(200).json({ message: 'Política de privacidad marcada como actual exitosamente', policy: currentPolicy });
    } catch (error) {
      console.error("Error al establecer la política de privacidad como actual:", error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  };
  