import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Esquema para almacenar información de logos subidos
const logoSchema = new Schema({
  url: { 
    type: String, 
    required: true, 
    trim: true 
  },  // URL de la imagen en Cloudinary
  fechaSubida: { 
    type: Date, 
    default: Date.now 
  },  // Fecha en la que se subió el logo
  autor: { 
    type: String, 
    required: true, 
    trim: true 
  },  // Autor que subió el logo
}, {
  timestamps: true,      // Añade automáticamente createdAt y updatedAt
  versionKey: false      // Elimina el campo "__v" de versiones
});

// Exportar el modelo de Logo
const Logo = model('Logo', logoSchema);

export default Logo;
