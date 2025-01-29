import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3, // Mínimo 3 caracteres para el nombre
    maxlength: 100, // Máximo 100 caracteres para el nombre
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10, // Mínimo 10 caracteres para la descripción
    maxlength: 500, // Máximo 500 caracteres para la descripción
  },
  price: {
    type: Number,
    required: true,
    min: 0, // El precio no puede ser negativo
  },
  image: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (value) {
        // Validar que la imagen sea una URL válida o una ruta relativa
        return /^(http:\/\/|https:\/\/|\/).*$/.test(value);
      },
      message: 'La imagen debe ser una URL válida o una ruta relativa',
    },
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: ['Electrónica', 'Ropa', 'Hogar', 'Juguetes', 'Otros'], // Categorías predefinidas
  },
  stock: {
    type: Number,
    required: true,
    min: 0, // El stock no puede ser negativo
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5, // El rating debe estar entre 0 y 5
  },
  reviews: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Referencia al modelo de User
        required: true,
      },
      comment: {
        type: String,
        required: true,
        trim: true,
        minlength: 5, // Mínimo 5 caracteres para el comentario
        maxlength: 200, // Máximo 200 caracteres para el comentario
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5, // El rating de la reseña debe estar entre 1 y 5
      },
      createdAt: {
        type: Date,
        default: Date.now, // Fecha de creación de la reseña
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now, // Fecha de creación del producto
  },
  updatedAt: {
    type: Date,
    default: Date.now, // Fecha de última actualización del producto
  },
}, {
  timestamps: true, // Habilita createdAt y updatedAt automáticamente
  versionKey: false, // Elimina el campo __v de Mongoose
});

const Product = model('Product', productSchema);

export default Product;