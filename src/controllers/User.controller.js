import User from "../models/User.model.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { transporter } from '../libs/emailConfing.js';

// Variables de entorno para SECRET
const SECRET = process.env.SECRET || 'super-secret-key';
const MAX_FAILED_ATTEMPTS = 5;  
const LOGIN_TIMEOUT = 1 * 60 * 1000;

// Registro de usuario y verificación de cuenta
export const signUp = async (req, res) => {
    try {
        const { 
            name, 
            lastname, 
            email, 
            telefono, 
            fechadenacimiento, 
            user, 
            preguntaSecreta, 
            respuestaSecreta, 
            password 
        } = req.body;

        if (!name || !lastname || name.length < 2 || lastname.length < 2) {
            return res.status(400).json({ message: "Datos incompletos o inválidos" });
        }

        // Verificar si el correo ya está registrado
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "El correo ya existe" });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear un nuevo usuario
        const newUser = new User({ 
            name, 
            lastname, 
            email, 
            telefono, 
            fechadenacimiento, 
            user, 
            preguntaSecreta, 
            respuestaSecreta, 
            password: hashedPassword, 
            verified: false 
        });

        // Generar un token de verificación
        const token = jwt.sign({ email: newUser.email }, SECRET, { expiresIn: '1h' });

        // Enlace de verificación
        //const verificationUrl = `http://localhost:3000/verify/${token}`;
        const verificationUrl = `https://frontend-alpha-six-22.vercel.app/verify/${token}`;

        // Enviar correo de verificación
        await transporter.sendMail({
            from: '"Soporte 👻" <jose1fat@gmail.com>',
            to: newUser.email,
            subject: "Verifica tu cuenta ✔️",
            html: `
                <p>Hola ${newUser.name},</p>
                <p>Haz clic en el enlace para verificar tu cuenta:</p>
                <a href="${verificationUrl}">Verificar Cuenta</a>
                <p>Este enlace expirará en 1 hora.</p>
            `
        });

        // Guardar usuario en la base de datos
        await newUser.save();

        // Respuesta exitosa
        res.status(200).json({ message: "Usuario registrado exitosamente. Revisa tu correo para verificar tu cuenta." });
    } catch (error) {
        console.error("Error en signUp:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

export const verifyAccount = async (req, res) => {
    try {
        const { token } = req.params;
        
        // Verificar el token
        const decoded = jwt.verify(token, SECRET);

        // Buscar al usuario con el email decodificado desde el token
        const user = await User.findOne({ email: decoded.email });

        if (!user) return res.status(404).json({ message: "Usuario no encontrado." });
        if (user.verified) return res.status(400).json({ message: "La cuenta ya está verificada." });

        // Marcar al usuario como verificado y guardar los cambios
        user.verified = true;
        await user.save();

        res.status(200).json({ message: "Cuenta verificada exitosamente." });
    } catch (error) {
        console.error("Error al verificar la cuenta:", error.message || error);

        // Verificar si el error es de token expirado
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: "Token expirado." });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({ message: "Token inválido." });
        }

        res.status(500).json({ message: "Error interno del servidor al verificar la cuenta." });
    }
};

// Controlador login para autenticación con JWT en User.controller.js
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) 
            return res.status(400).json({ message: "Correo y contraseña son requeridos" });

        const user = await User.findOne({ email });
        if (!user) 
            return res.status(400).json({ message: "Usuario no encontrado" });

        // Verificar si el usuario está bloqueado
        if (user.lockedUntil && user.lockedUntil > Date.now()) {
            const remainingTime = Math.ceil((user.lockedUntil - Date.now()) / 1000);
            return res.status(403).json({
                message: `Tu cuenta está bloqueada. Inténtalo de nuevo en ${remainingTime} segundos.`,
            });
        }

        // Comparar la contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            user.failedLoginAttempts += 1;

            // Bloqueo después de demasiados intentos fallidos
            if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
                const baseLockTime = 1 * 60 * 1000; // Tiempo base de bloqueo (1 minuto)
                const lockTime = baseLockTime * Math.pow(2, user.lockCount); // Incremento exponencial
                user.lockedUntil = Date.now() + lockTime;
                user.lockCount += 1; // Incrementar el contador de bloqueos
                await user.save();
                return res.status(403).json({
                    message: `Cuenta bloqueada debido a demasiados intentos fallidos. Inténtalo más tarde.`,
                });
            }

            await user.save();
            return res.status(400).json({
                message: `Contraseña incorrecta. Intentos fallidos: ${user.failedLoginAttempts}/${MAX_FAILED_ATTEMPTS}`,
            });
        }

        // Restablecer intentos fallidos y desbloquear si la contraseña es correcta
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        user.lockCount = 0; // Reinicia el contador de bloqueos tras un inicio exitoso
        
        // Registrar el inicio de sesión
        user.lastLogin = new Date(); // Actualizar el último inicio de sesión
        if (user.loginHistory.length >= 10) {
            user.loginHistory.shift(); // Elimina el inicio de sesión más antiguo si hay más de 10
        }
        user.loginHistory.push(new Date()); // Agregar la fecha actual al historial
        
        await user.save();

        // Verificar si la cuenta está verificada
        if (!user.verified) 
            return res.status(403).json({ message: "Tu cuenta aún no ha sido verificada. Revisa tu correo electrónico." });

        // Generar token
        const token = jwt.sign(
            { userId: user._id, role: user.role, name: user.name },
            SECRET,
            { expiresIn: '2h' }
        );

        res.status(200).json({
            message: "Inicio de sesión exitoso",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                lastLogin: user.lastLogin, // Devolver último inicio de sesión
            },
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};



// Controlador checkSession en User.controller.js
export const checkSession = (req, res) => {
    try {
        if (req.session.userId) {
            return res.status(200).json({
                isAuthenticated: true,
                user: {
                    id: req.session.userId,
                    email: req.session.email,
                    name: req.session.name, // Incluye el nombre
                },
            });
        } else {
            return res.status(200).json({ isAuthenticated: false });
        }
    } catch (error) {
        console.error("Error en checkSession:", error);
        return res.status(500).json({ message: "Error en el servidor" });
    }
};

//cerrar sesion
export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: "Error al cerrar sesión" });
        }

        res.clearCookie("connect.sid"); // Borra la cookie de sesión
        return res.status(200).json({ message: "Sesión cerrada con éxito" });
    });
};

// Middleware para verificar token
export const verifyToken = (req, res, next) => {
    const token = req.headers["x-access-token"];
    if (!token) return res.status(403).json({ message: "No token provided" });

    try {
        const decoded = jwt.verify(token, SECRET);
        req.userId = decoded.userId;
        req.role = decoded.role;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};

// Obtener perfil del usuario autenticado
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");
        if (!user) return res.status(404).json({ message: "Usuario no encontrado." });
        res.status(200).json(user);
    } catch (error) {
        console.error("Error obteniendo perfil:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// Obtener todos los usuarios solo para admins
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json(users);
    } catch (error) {
        console.error("Error en getAllUsers:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Resetear contraseña
export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        const decoded = jwt.verify(token, SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();
        res.status(200).json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
        console.error("Error en resetPassword:", error);
        res.status(400).json({ message: "Token inválido o expirado" });
    }
};


//informacion de usuarios
export const getRecentUsers = async (req, res) => {
    try {
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
        res.status(200).json(recentUsers);
    } catch (error) {
        console.error("Error al obtener usuarios recientes:", error);
        res.status(500).json({ message: "Error al obtener usuarios recientes" });
    }
};

//informacion de usuarios bloqueados
export const getRecentBlockedUsers = async (req, res) => {
    try {
        const recentBlockedUsers = await User.find({
            $or: [
                { lockedUntil: { $exists: true, $gt: new Date() } }, // Bloqueados temporalmente
                { blocked: true }, // Bloqueados permanentemente
                { updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Desbloqueados recientemente (últimas 24 horas)
            ],
        })
            .sort({ updatedAt: -1 }) // Ordenar por última actualización
            .limit(10); // Limitar el resultado a 10 usuarios

        // Enriquecer los datos de los usuarios
        const enrichedData = recentBlockedUsers.map(user => ({
            id: user._id,
            name: user.name,
            email: user.email,
            blockedPermanently: user.blocked,
            lockedUntil: user.lockedUntil,
            currentlyBlocked: user.blocked || (user.lockedUntil && user.lockedUntil > new Date()),
            blockedType: user.blocked
                ? "Permanent"
                : user.lockedUntil > new Date()
                ? "Temporary"
                : "None",
            wasRecentlyBlocked: user.updatedAt >= new Date(Date.now() - 24 * 60 * 60 * 1000),
            lastUpdated: user.updatedAt,
        }));

        res.status(200).json(enrichedData);
    } catch (error) {
        console.error("Error al obtener usuarios bloqueados:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

  


  export const sendPasswordResetLink = async (req, res) => {
    const { email } = req.body;

    try {
        // Buscar el usuario por email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Generar un token de restablecimiento de contraseña (expira en 1 hora)
        const token = jwt.sign({ email: user.email, userId: user._id }, SECRET, {
            expiresIn: "1h",
        });

        // Crear el enlace de restablecimiento
        //const resetUrl = `http://localhost:3000/restorepassword/${token}`;
        const resetUrl = `https://frontend-alpha-six-22.vercel.app/restorepassword/${token}`;

        // Enviar el correo con el enlace de restablecimiento de contraseña
        await transporter.sendMail({
            from: '"Soporte 👻" <soporte@tucorreo.com>',  // Cambia el correo de soporte según tu configuración
            to: user.email,
            subject: "Restablece tu contraseña ✔️",
            html: `
                <p>Hola ${user.name},</p>
                <p>Recibimos una solicitud para restablecer tu contraseña. Por favor, haz clic en el siguiente enlace para continuar:</p>
                <a href="${resetUrl}">Restablecer Contraseña</a>
                <p>Este enlace expirará en 1 hora.</p>
            `,
        });

        res.status(200).json({ message: "Correo de restablecimiento enviado con éxito." });
    } catch (error) {
        console.error("Error en sendPasswordResetLink:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};


export const getFailedLoginAttempts = async (req, res) => {
    try {
        const usersWithFailedAttempts = await User.find({ failedLoginAttempts: { $gt: 0 } })
            .sort({ failedLoginAttempts: -1 }) // Ordenar por mayor cantidad de intentos fallidos
            .limit(10) // Límite opcional
            .select('name email failedLoginAttempts lockedUntil updatedAt'); // Selecciona campos relevantes

        const enrichedData = usersWithFailedAttempts.map(user => ({
            id: user._id, // Incluye el _id del usuario
            name: user.name,
            email: user.email,
            failedLoginAttempts: user.failedLoginAttempts,
            lockedUntil: user.lockedUntil,
            lastFailedAttempt: user.updatedAt,
            isLocked: user.lockedUntil && user.lockedUntil > Date.now() ? true : false
        }));

        res.status(200).json(enrichedData);
    } catch (error) {
        console.error("Error al obtener intentos fallidos:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};



export const blockUser = async (req, res) => {
    try {
        const { userId } = req.body;

        // Verifica que se envíe el ID del usuario
        if (!userId) {
            return res.status(400).json({ message: "ID de usuario es requerido." });
        }

        // Buscar al usuario
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // Bloquear al usuario de forma permanente
        user.blocked = true;
        user.lockedUntil = null; // Limpia cualquier bloqueo temporal previo
        await user.save();

        res.status(200).json({ message: "Usuario bloqueado permanentemente." });
    } catch (error) {
        console.error("Error al bloquear al usuario:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};



export const unblockUser = async (req, res) => {
    try {
        const { userId } = req.body;

        // Verifica que se envíe el ID del usuario
        if (!userId) {
            return res.status(400).json({ message: "ID de usuario es requerido." });
        }

        // Buscar al usuario
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // Desbloquear al usuario
        user.lockedUntil = null; // Eliminar bloqueo temporal
        user.blocked = false; // Eliminar bloqueo permanente
        user.failedLoginAttempts = 0; // Restablecer intentos fallidos
        user.lockCount = 0; // Restablecer contador de bloqueos
        await user.save();

        res.status(200).json({ message: "Usuario desbloqueado exitosamente." });
    } catch (error) {
        console.error("Error al desbloquear al usuario:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

export const getRecentLogins = async (req, res) => {
    try {
        const recentLogins = await User.find({ lastLogin: { $exists: true } })
            .sort({ lastLogin: -1 }) // Ordenar por el inicio de sesión más reciente
            .limit(10) // Limitar a los 10 más recientes
            .select('name email lastLogin'); // Seleccionar campos relevantes

        res.status(200).json(recentLogins);
    } catch (error) {
        console.error("Error al obtener inicios de sesión recientes:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};
