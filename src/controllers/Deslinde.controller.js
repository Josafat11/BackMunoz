import DeslindeLegal from '../models/Deslinde.model.js';

// Crear un nuevo deslinde legal
export const createDeslindeLegal = async (req, res) => {
  try {
    const { title, content, effectiveDate } = req.body;

    // Crear un nuevo deslinde legal
    const newDeslinde = new DeslindeLegal({
      title,
      content,
      effectiveDate,
    });

    // Guardar el deslinde legal en la base de datos
    await newDeslinde.save();

    res.status(201).json({ message: 'Deslinde legal creado exitosamente', deslinde: newDeslinde });
  } catch (error) {
    console.error("Error al crear el deslinde legal:", error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar el deslinde legal actual y archivar la versión anterior
export const updateDeslindeLegal = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, effectiveDate } = req.body;

    // Buscar el deslinde legal actual por ID
    const currentDeslinde = await DeslindeLegal.findById(id);
    if (!currentDeslinde) {
      return res.status(404).json({ message: 'Deslinde legal no encontrado' });
    }

    // Mover la versión actual a la lista de versiones anteriores
    currentDeslinde.previousVersions.push({
      title: currentDeslinde.title,
      content: currentDeslinde.content,
      createdAt: currentDeslinde.createdAt,
      effectiveDate: currentDeslinde.effectiveDate
    });

    // Actualizar el deslinde legal con los nuevos datos
    currentDeslinde.title = title;
    currentDeslinde.content = content;
    currentDeslinde.effectiveDate = effectiveDate;
    currentDeslinde.createdAt = Date.now();

    // Guardar los cambios en la base de datos
    await currentDeslinde.save();

    res.status(200).json({ message: 'Deslinde legal actualizado exitosamente', deslinde: currentDeslinde });
  } catch (error) {
    console.error("Error al actualizar el deslinde legal:", error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener el deslinde legal actual
export const getCurrentDeslindeLegal = async (req, res) => {
  try {
    // Obtener el deslinde legal más reciente
    const currentDeslinde = await DeslindeLegal.findOne().sort({ createdAt: -1 });

    if (!currentDeslinde) {
      return res.status(404).json({ message: 'No se encontró un deslinde legal actual' });
    }

    res.status(200).json(currentDeslinde);
  } catch (error) {
    console.error("Error al obtener el deslinde legal actual:", error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Listar todas las versiones anteriores de un deslinde legal
export const getPreviousVersions = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar el deslinde legal por su ID
    const deslinde = await DeslindeLegal.findById(id);
    if (!deslinde) {
      return res.status(404).json({ message: 'Deslinde legal no encontrado' });
    }

    // Devolver las versiones anteriores
    res.status(200).json(deslinde.previousVersions);
  } catch (error) {
    console.error("Error al obtener las versiones anteriores del deslinde legal:", error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
