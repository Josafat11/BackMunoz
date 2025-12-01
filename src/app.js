import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Rutas
import user from './routes/User.routes.js';
import politicas from './routes/Politicas.routes.js';
import terminos from './routes/Terminos.routes.js';
import deslinde from './routes/Deslinde.routes.js';
import logoRoutes from './routes/Logo.routes.js';
import producto from './routes/Producto.route.js';
import predicciones from './routes/Predicciones.routes.js';
import carrito from './routes/Carrito.routes.js';
import relojRoutes from './routes/Reloj.routes.js';
import favoritosRoutes from './routes/Favoritos.routes.js';
import pedidos from './routes/Pedidos.routes.js';
import paypalRoutes from './routes/paypal.routes.js';
import direccionRoutes from './routes/direccion.routes.js';

// 🔐 CORS LIMPIO - solo para web
const corsOptions = {
  origin: (origin, callback) => {
    // Apps móviles, Postman, axios, cURL NO tienen origin → permitirlos
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "https://frontend-alpha-six-22.vercel.app",
      "https://munoz.vercel.app"
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS no permitido: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();

// 🚫 Oculta stack interno
app.disable('x-powered-by');

// 🛡 Helmet básico (compatible con apps móviles)
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Evitar sniffing
app.use(helmet.noSniff());

// ❌ Evitar cache sensible
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Middlewares base
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Rutas
app.use('/api/auth', user);
app.use('/api/docs', politicas);
app.use('/api/docs', terminos);
app.use('/api/docs', deslinde);
app.use('/api/logo', logoRoutes);
app.use('/api/productos', producto);
app.use('/api/predicciones', predicciones);
app.use('/api/carrito', carrito);
app.use('/api/reloj', relojRoutes);
app.use('/api/favoritos', favoritosRoutes);
app.use('/api/pedidos', pedidos);
app.use('/api/paypal', paypalRoutes);
app.use('/api/direccion', direccionRoutes);

app.get('/', (req, res) => {
  res.json({ msg: "Bienvenido a la API de tu proyecto" });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta incorrecta' });
});

export default app;
