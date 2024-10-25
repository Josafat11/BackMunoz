import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'super-secret-key'; // Mejor usar variables de entorno

export const isAuthenticated = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Espera formato 'Bearer TOKEN'
    if (!token) {
        return res.status(401).json({ message: "Acceso denegado: falta el token de autenticación" });
    }

    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded; // Añadimos el usuario decodificado para uso posterior en la solicitud
        next();
    } catch (error) {
        console.error("Token inválido:", error);
        res.status(401).json({ message: "Token inválido o expirado" });
    }
};

// Middleware adicional para verificar si el usuario tiene rol de administrador
export const isAdmin = (req, res, next) => {
    if (req.user?.role === "admin") {
        next();
    } else {
        return res.status(403).json({ message: "Acceso denegado: requiere rol de administrador" });
    }
};
