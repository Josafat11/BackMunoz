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
        const { name, lastname, email, telefono, fechadenacimiento, user, preguntaSecreta, respuestaSecreta, password } = req.body;
        if (!name || !lastname || name.length <  2 || lastname.length < 2) return res.status(400).json({ message: "Datos incompletos o inválidos" });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "El correo ya existe" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, lastname, email, telefono, fechadenacimiento, user, preguntaSecreta, respuestaSecreta, password: hashedPassword, verified: false });
        const token = jwt.sign({ email: newUser.email }, SECRET, { expiresIn: '1h' });

        const verificationUrl = `http://localhost:3000/verify/${token}`;
        await transporter.sendMail({
            from: '"Soporte 👻" <jose1fat@gmail.com>',
            to: newUser.email,
            subject: "Verifica tu cuenta ✔️",
            html: `<p>Hola ${newUser.name},</p><p>Haz clic en el enlace para verificar tu cuenta:</p><a href="${verificationUrl}">Verificar Cuenta</a><p>Este enlace expirará en 1 hora.</p>`
        });

        await newUser.save();
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
        if (!email || !password) return res.status(400).json({ message: "Correo y contraseña son requeridos" });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Usuario no encontrado" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            user.failedLoginAttempts += 1;
            if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) user.lockUntil = Date.now() + LOGIN_TIMEOUT;
            await user.save();
            return res.status(400).json({ message: `Contraseña incorrecta. Intentos fallidos: ${user.failedLoginAttempts}/${MAX_FAILED_ATTEMPTS}` });
        }

        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();

        const token = jwt.sign({ userId: user._id, role: user.role, name: user.name }, SECRET, { expiresIn: '2h' });
        res.status(200).json({
            message: "Inicio de sesión exitoso",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
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
      const blockedUsers = await User.find({
        lockedUntil: { $exists: true, $gt: new Date() },
      })
        .sort({ lockedUntil: -1 })
        .limit(5);
      res.status(200).json(blockedUsers);
    } catch (error) {
      console.error("Error al obtener usuarios bloqueados:", error);
      res.status(500).json({ message: "Error al obtener usuarios bloqueados" });
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
        const resetUrl = `http://localhost:3000/restorepassword/${token}`;
        //const resetUrl = `https://front-munoz.vercel.app/restorepassword/${token}`;

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