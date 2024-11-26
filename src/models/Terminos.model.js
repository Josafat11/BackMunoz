import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Esquema principal de Términos y Condiciones
const termsSchema = new Schema({
  title: { type: String, required: true, trim: true }, // Título del documento
  content: { type: String, required: true }, // Contenido del documento
  createdAt: { type: Date, default: Date.now }, // Fecha de creación del documento
  effectiveDate: { type: Date, required: true }, // Fecha de vigencia del documento
  isCurrent: { type: Boolean, default: false }, // Indica si es el documento actual
}, {
  timestamps: true, // Incluye createdAt y updatedAt automáticamente
  versionKey: false, // Desactiva el campo "__v"
});

const Terms = model('Terms', termsSchema);

export default Terms;
