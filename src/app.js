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

// Lista blanca para CORS
const listWhite = [
    'http://localhost:3000',  // Frontend en desarrollo
    'https://frontend-alpha-six-22.vercel.app', // Frontend en producción
    'http://192.168.1.77:5000', // linux en desarrollo
    'http://192.168.101.20:5000', // linux yamil
    'http://10.0.2.16' // Emulador de Android
];

const corsOptions = {
    origin: listWhite,  // Permitir orígenes definidos
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,  // Importante para enviar cookies
    allowedHeaders: ['Content-Type', 'Authorization',  'expires', 'Cache-Control', 'Pragma'],
};

const app = express();

// --- Seguridad: Evitar divulgación de información interna ---
// Desactiva el header X-Powered-By
app.disable('x-powered-by');

// Anti-Clickjacking: impide que la app se cargue en iframes de otros dominios
app.use(helmet.frameguard({ action: 'deny' }));

app.use(
    helmet.contentSecurityPolicy({
      directives: {
        // defaultSrc: Establece la fuente por defecto para todo tipo de recursos
        // a 'self', es decir, el mismo dominio/origen de la aplicación.
        defaultSrc: ["'self'"],
  
        // scriptSrc: Permite la carga de scripts únicamente desde:
        scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
  
        // styleSrc: Permite la carga de hojas de estilo desde:
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
  
        // imgSrc: Permite cargar imágenes únicamente desde:
        imgSrc: ["'self'", "data:"],
  
        // connectSrc: Controla los orígenes a los que se puede conectar (fetch, websockets, etc.).
        connectSrc: ["'self'", "https:", "http://localhost:4000", "http://localhost:3000"],
  
        // fontSrc: Restringe las fuentes que se pueden cargar a:
        fontSrc: ["'self'", "https:"],
  
        // objectSrc: Bloquea la carga de contenido tipo <object>, <embed> o <applet>.
        // Al usar 'none', no se permiten objetos externos en absoluto.
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
