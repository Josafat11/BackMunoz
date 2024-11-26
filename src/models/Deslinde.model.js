import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Esquema principal de Deslinde de Responsabilidad
const deslindeSchema = new Schema({
  title: { type: String, required: true, trim: true }, // Título del documento
  content: { type: String, required: true }, // Contenido del documento
  createdAt: { type: Date, default: Date.now }, // Fecha de creación del documento
  effectiveDate: { type: Date, required: true }, // Fecha de vigencia del documento
  isCurrent: { type: Boolean, default: false }, // Indica si es el deslinde actual
}, {
  timestamps: true, // Incluye createdAt y updatedAt automáticamente
  versionKey: false, // Desactiva el campo "__v"
});

// Exportar el modelo de Deslinde de Responsabilidad
const Deslinde = model('Deslinde', deslindeSchema);

export default Deslinde;
