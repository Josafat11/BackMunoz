import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Esquema para almacenar versiones anteriores
const versionSchema = new Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  effectiveDate: { type: Date, required: true },
}, {
  _id: false  // Deshabilitar la creación de un ID para cada versión
});

// Esquema principal de Términos y Condiciones
const termsConditionsSchema = new Schema({
  title: { type: String, required: true, trim: true },  // Título del documento
  content: { type: String, required: true },  // Contenido del documento
  createdAt: { type: Date, default: Date.now },  // Fecha de creación del documento
  effectiveDate: { type: Date, required: true },  // Fecha de vigencia del documento
  previousVersions: [versionSchema],  // Almacenar versiones anteriores
}, {
  timestamps: true,  // Incluye campos de createdAt y updatedAt automáticamente
  versionKey: false  // Deshabilitar el campo "__v" de versiones en Mongoose
});

// Exportar el modelo de Términos y Condiciones
const TermsConditions = model('TermsConditions', termsConditionsSchema);

export default TermsConditions;
