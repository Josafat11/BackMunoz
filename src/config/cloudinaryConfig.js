import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v4 as uuidv4 } from 'uuid';
import cloudinary from 'cloudinary';

// Configuración de Cloudinary
cloudinary.v2.config({
  cloud_name: 'dbs5gym0w',
  api_key: '657559134622854',
  api_secret: '2YUTrqWplQCVd3oa8b6fzxiomz4',
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: 'logo', // Carpeta en Cloudinary
    format: async () => 'png', // Cambia el formato según necesites
    public_id: () => uuidv4(), // Generar un ID único para cada imagen
  },
});

// Filtro para validar el tipo de archivo
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true); // Aceptar el archivo
  } else {
    cb(new Error('El archivo debe ser una imagen válida (JPG, PNG, etc.)'), false); // Rechazar el archivo
  }
};

// Configuración de Multer con almacenamiento y filtro
const upload = multer({ storage: storage, fileFilter });

export { upload };
