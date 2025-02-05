import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    images: [{
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          return /^(http:\/\/|https:\/\/|\/).*$/.test(value);
        },
        message: 'La imagen debe ser una URL válida o una ruta relativa',
      },
    }],
    category: {
      type: String,
      required: true,
      trim: true,
      enum: [
        'Motor',
        'Frenos',
        'Suspensión',
        'Transmisión',
        'Eléctrico',
        'Accesorios',
        'Lubricantes',
        'Filtros',
        'Otros',
      ],
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    partNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    compatibility: [
      {
        make: { type: String, required: true },
        model: { type: String, required: true },
        year: { type: Number, required: true, min: 1900, max: new Date().getFullYear() },
        engineType: { type: String, enum: ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico'] },
      },
    ],
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    discount: {
      type: Number,
      min: 0,
      max: 100,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Product = model('Product', productSchema);

export default Product;