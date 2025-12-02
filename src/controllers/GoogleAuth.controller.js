import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Falta idToken" });
    }

    // 1. Validar token con Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const email = payload.email;
    const name = payload.name;
    const googleId = payload.sub;

    if (!email) {
      return res.status(400).json({ message: "Google no devolvió email." });
    }

    // 2. Verificar si el usuario ya existe
    let user = await prisma.usuarios.findUnique({
      where: { email }
    });

    // 3. Si no existe lo creamos
    if (!user) {
      user = await prisma.usuarios.create({
        data: {
          email,
          name,
          password: null, // No usará contraseña
          verified: true, // Ya verificado
          googleId,
          role: "cliente",
          failedLoginAttempts: 0,
          lockCount: 0,
        },
      });
    }

    // 4. Crear token JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      SECRET,
      { expiresIn: "24h" }
    );

    // 5. Respuesta (sin cookie porque es móvil)
    return res.json({
      message: "Login con Google exitoso",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Error en Google Login:", err);
    return res.status(500).json({ message: "Error en Google Login", error: err.message });
  }
};
