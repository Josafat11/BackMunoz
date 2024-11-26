import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  lastname: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  telefono: {
    type: String,
    required: true,
    validate: {
      validator: function (value) {
        return /^\d{10}$/.test(value);  // Valida que el teléfono tenga 10 dígitos
      },
      message: 'El teléfono debe tener exactamente 10 dígitos'
    }
  },
  fechadenacimiento: { type: Date, required: true },
  user: { type: String, required: true, trim: true },
  preguntaSecreta: { type: String, required: true },
  respuestaSecreta: { type: String, required: true },
  password: { type: String, required: true },  // Campo de contraseña encriptada
  verified: { type: Boolean, default: false },  // Usuario verificado o no
  role: { 
    type: String, 
    default: 'normal', 
    enum: ['normal', 'admin']  // Enum para restringir los roles válidos
  },
  failedLoginAttempts: { type: Number, default: 0 },  // Intentos fallidos de inicio de sesión
  lockedUntil: { type: Date, default: null },  // Fecha y hora hasta que el usuario está bloqueado
  blocked: { type: Boolean, default: false },  // Si el usuario está bloqueado manualmente
  lockCount: { type: Number, default: 0 }, // Contador de bloqueos progresivos
  lastLogin: { type: Date, default: null }, // Último inicio de sesión
  loginHistory: [{ type: Date }], // Historial de inicios de sesión
}, {
  timestamps: true,  // Habilita createdAt y updatedAt automáticamente
  versionKey: false  // Elimina el campo __v de Mongoose
});

const User = model('User', userSchema);

export default User;
