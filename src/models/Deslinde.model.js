import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Esquema para versiones anteriores del deslinde legal
const versionSchema = new Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  effectiveDate: { type: Date, required: true },
}, {
  _id: false  // Deshabilitar el _id en las versiones anteriores
});

// Esquema principal para Deslinde Legal
const deslindeLegalSchema = new Schema({
  title: { type: String, required: true, trim: true },  // Título del documento
  content: { type: String, required: true },  // Contenido del documento
  createdAt: { type: Date, default: Date.now },  // Fecha de creación del documento
  effectiveDate: { type: Date, required: true },  // Fecha de vigencia del documento
  previousVersions: [versionSchema],  // Lista de versiones anteriores del deslinde legal
}, {
  timestamps: true,  // Incluye createdAt y updatedAt automáticamente
  versionKey: false  // Desactiva el campo "__v" en los documentos de MongoDB
});

// Exportar el modelo
const DeslindeLegal = model('DeslindeLegal', deslindeLegalSchema);

export default DeslindeLegal;
