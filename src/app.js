import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Importación de rutas
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

// Lista blanca para CORS - ACTUALIZADA
const listWhite = [
  'http://localhost:3000',
  'https://frontend-alpha-six-22.vercel.app',
  'https://munoz.vercel.app',
  'http://192.168.1.77:5000',
  'http://192.168.101.20:5000',
  'http://10.0.2.16',
  'http://10.35.217.98:8081',    // 👈 NUEVA IP DE EXPO
  'exp://10.35.217.98:8081',     // 👈 NUEVO PROTOCOLO EXPO
  'http://10.35.217.98:19000',   // 👈 PUERTO ALTERNATIVO
  'exp://10.35.217.98:19000'     // 👈 PROTOCOLO ALTERNATIVO
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (listWhite.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS no permitido ❌ " + origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'expires', 'Cache-Control', 'Pragma'],
};

const app = express();

// --- Seguridad: Evitar divulgación de información interna ---
app.disable('x-powered-by');
app.use(helmet.frameguard({ action: 'deny' }));

app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        imgSrc: ["'self'", "data:"],
        connectSrc: [
          "'self'",
          "https:",
          "http://localhost:4000",
          "http://localhost:3000",
          "https://backmunoz.onrender.com",
          "http://10.35.217.98:8081",    // 👈 AÑADE ESTO TAMBIÉN
          "exp://10.35.217.98:8081"     // 👈 Y ESTO
        ],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
      },
    })
);


// Agrega el header X-Content-Type-Options para evitar sniffing
app.use(helmet.noSniff());

// --- Control de Caché: evitar almacenamiento de información sensible ---
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Otros middlewares
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
app.use('/api/pedidos', pedidos)
app.use('/api/paypal', paypalRoutes);
app.use('/api/direccion', direccionRoutes);

app.get('/', (req, res) => {
  res.json({ msg: "Bienvenido a la API de tu proyecto" });
});

// Manejo de rutas no encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Ruta incorrecta' });
});

export default app;
