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
        if (!name || !lastname || name.length < 3 || lastname.length < 3) return res.status(400).json({ message: "Datos incompletos o inválidos" });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "El correo ya existe" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, lastname, email, telefono, fechadenacimiento, user, preguntaSecreta, respuestaSecreta, password: hashedPassword, verified: false });
        const token = jwt.sign({ email: newUser.email }, SECRET, { expiresIn: '1h' });

        const verificationUrl = `http://localhost:5173/verify/${token}`;
        await transporter.sendMail({
            from: '"Soporte 👻" <yadi.bta03@gmail.com>',
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
        const decoded = jwt.verify(token, SECRET);
        const user = await User.findOne({ email: decoded.email });

        if (!user) return res.status(404).json({ message: "Usuario no encontrado." });
        if (user.verified) return res.status(400).json({ message: "La cuenta ya está verificada." });

        user.verified = true;
        await user.save();
        res.status(200).json({ message: "Cuenta verificada exitosamente." });
    } catch (error) {
        console.error("Error al verificar la cuenta:", error);
        res.status(400).json({ message: "Token inválido o expirado." });
    }
};

// Función login para autenticación con JWT
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

        const token = jwt.sign({ userId: user._id, role: user.role }, SECRET, { expiresIn: '2h' });
        res.status(200).json({ message: "Inicio de sesión exitoso", token });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
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
    if (req.role !== 'admin') return res.status(403).json({ message: "Acceso denegado" });
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