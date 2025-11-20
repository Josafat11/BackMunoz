// middleware/auth.js
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'super-secret-key';

export const isAuthenticated = (req, res, next) => {
    let token = null;

    console.log("\n=======================================");
    console.log("🔵 HEADERS RECIBIDOS:", req.headers);
    console.log("=======================================\n");

    // Token por cookie
    if (req.cookies?.token) {
        console.log("🍪 Token desde cookie:", req.cookies.token);
        token = req.cookies.token;
    }

    // Token por header
    if (!token && req.headers.authorization) {
        console.log("🔶 Header Authorization recibido:", req.headers.authorization);

        const [type, rawToken] = req.headers.authorization.split(" ");
        console.log("🔸 Tipo:", type, " | Token extraído:", rawToken);

        if (type === "Bearer") token = rawToken;
    }

    console.log("🔑 Token FINAL usado en verificación:", token);

    if (!token) {
        return res.status(401).json({ message: "Acceso denegado: falta token de autenticación" });
    }

    try {
        const decoded = jwt.verify(token, SECRET);
        console.log("🟩 TOKEN DECODIFICADO OK:", decoded);

        req.userId = decoded.userId;
        req.role = decoded.role;

        return next();
    } catch (error) {
        console.log("🟥 ERROR AL VERIFICAR JWT:", error.message);
        return res.status(401).json({ message: "Token inválido o expirado" });
    }
};


export const isAdmin = (req, res, next) => {
    // Ahora req.role viene de la línea anterior
    if (req.role === "admin") {
        next();
    } else {
        return res.status(403).json({ message: "Acceso denegado: requiere rol de administrador" });
    }
};
