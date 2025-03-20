import User from "../models/User.model.js";
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { transporter } from '../libs/emailConfing.js';

// 🔒 Mejores prácticas de seguridad en Node.js 
// Variables de entorno para SECRET (Evitar claves por defecto en producción)
const prisma = new PrismaClient();
const SECRET = process.env.SECRET || 'super-secret-key'; // ⚠️ No almacenar secretos en código fuente
const MAX_FAILED_ATTEMPTS = 5;
const LOGIN_TIMEOUT = 1 * 60 * 1000;

// 🔓 Registro de usuario y verificación de cuenta
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
  
      // ✅ Validaciones básicas para evitar datos inválidos o incompletos
      if (!name || !lastname || name.length < 2 || lastname.length < 2) {
        return res.status(400).json({ message: "Datos incompletos o inválidos" });
      }
  
      // 📅 Verificar si el correo ya está registrado para evitar duplicados
      const existingUser = await prisma.usuarios.findUnique({ where: { email } });
      if (existingUser)  {
        return res.status(400).json({ message: "El correo ya existe" });
      }  
      // 🔑 Hashear la contraseña antes de guardarla (bcrypt con salt)
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // 🔒 Generar un token de verificación con expiración segura
      const token = jwt.sign({ email }, SECRET, { expiresIn: '1h' });
  
      // 💌 Enviar correo de verificación con enlace único
      const verificationUrl = `https://frontend-alpha-six-22.vercel.app/verify/${token}`;
      await transporter.sendMail({
        from: '"Soporte 👻" <jose1fat@gmail.com>',
        to: email,
        subject: "Verifica tu cuenta ✔️",
        html: `
          <p>Hola ${name},</p>
          <p>Haz clic en el enlace para verificar tu cuenta:</p>
          <a href="${verificationUrl}">Verificar Cuenta</a>
          <p>Este enlace expirará en 1 hora.</p>
        `
      });
  
      // 📊 Guardar usuario en la base de datos con campo de verificación inicializado en `false`
      await prisma.usuarios.create({
        data: {
          name,
          lastname,
          email,
          telefono,
          fechadenacimiento: new Date(fechadenacimiento),
          user,
          preguntaSecreta,
          respuestaSecreta,
          password: hashedPassword,
          verified: false, // ⚠️ Importante: No marcar usuarios como verificados por defecto
        },
      });
  
      // ✅ Respuesta exitosa asegurando información mínima en la respuesta
      res.status(200).json({
        message: "Usuario registrado exitosamente. Revisa tu correo para verificar tu cuenta."
      });
    } catch (error) {
      console.error("Error en signUp:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };


  export const verifyAccount = async (req, res) => {
    try {
      const { token } = req.params;
      
      // 1. Verificar el token
      const decoded = jwt.verify(token, SECRET);
  
      // 2. Buscar al usuario con el email decodificado desde el token
      const user = await prisma.usuarios.findUnique({
        where: { email: decoded.email },
      });
  
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado." });
      }
  
      if (user.verified) {
        return res.status(400).json({ message: "La cuenta ya está verificada." });
      }
  
      // 3. Marcar al usuario como verificado
      await prisma.usuarios.update({
        where: { email: user.email },
        data: { verified: true },
      });
  
      return res.status(200).json({ message: "Cuenta verificada exitosamente." });
    } catch (error) {
      console.error("Error al verificar la cuenta:", error.message || error);
  
      // Verificar si el error es de token expirado
      if (error.name === 'TokenExpiredError') {
        return res.status(400).json({ message: "Token expirado." });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(400).json({ message: "Token inválido." });
      }
  
      return res.status(500).json({ message: "Error interno del servidor al verificar la cuenta." });
    }
  };


  // Controlador login para autenticación con JWT en User.controller.js
  export const login = async (req, res) => {
      try {
        const { email, password } = req.body;
    
        // Validación mínima
        if (!email || !password) {
          return res.status(400).json({ message: "Correo y contraseña son requeridos" });
        }
    
        // 1. Buscar al usuario en la tabla "Usuarios" por email
        const user = await prisma.usuarios.findUnique({
          where: { email },
        });
    
        if (!user) {
          return res.status(400).json({ message: "Usuario no encontrado" });
        }
    
        // 2. Verificar si el usuario está actualmente bloqueado
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
          return res.status(403).json({
            message: `Tu cuenta está bloqueada. Inténtalo de nuevo en ${remainingTime} segundos.`,
          });
        }
    
        // 3. Comparar contraseñas con bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          // Incrementar los intentos fallidos
          const newFailedAttempts = user.failedLoginAttempts + 1;
    
          if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
            // Bloqueo exponencial
            const lockTime = LOGIN_TIMEOUT * Math.pow(2, user.lockCount);
            await prisma.usuarios.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: newFailedAttempts,
                lockedUntil: new Date(Date.now() + lockTime),
                lockCount: user.lockCount + 1,
              },
            });
            return res.status(403).json({
              message: "Cuenta bloqueada debido a demasiados intentos fallidos. Inténtalo más tarde.",
            });
          }
    
          // Aún no alcanza el máximo: solo incrementa
          await prisma.usuarios.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newFailedAttempts,
            },
          });
    
          return res.status(400).json({
            message: `Contraseña incorrecta. Intentos fallidos: ${newFailedAttempts}/${MAX_FAILED_ATTEMPTS}`,
          });
        }
    
        // 4. Contraseña correcta -> resetear intentos fallidos y desbloquear
        let updatedUser = await prisma.usuarios.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lockCount: 0,
            lastLogin: new Date(), // Registra el último inicio de sesión
          },
        });
    
        // 5. Verificar si el usuario está verificado
        if (!updatedUser.verified) {
          return res.status(403).json({
            message: "Tu cuenta aún no ha sido verificada. Revisa tu correo electrónico.",
          });
        }
    
        // 6.  Registrar el login en la tabla LoginHistory
        // Si quieres limitar a los últimos 10 logins:
        const countHistory = await prisma.loginHistory.count({
          where: { userId: updatedUser.id },
        });
        if (countHistory >= 10) {
          const oldest = await prisma.loginHistory.findMany({
            where: { userId: updatedUser.id },
            orderBy: { loginDate: 'asc' },
            take: 1,
          });
          if (oldest.length > 0) {
            await prisma.loginHistory.delete({ where: { id: oldest[0].id } });
          }
        }
        // Crear un nuevo registro de historial
        await prisma.loginHistory.create({
          data: {
            userId: updatedUser.id,
            loginDate: new Date(), // o se usa el default(now()) de tu schema
          },
        });
    
        // 7. Generar el token JWT
        const token = jwt.sign(
          { userId: updatedUser.id, role: updatedUser.role, name: updatedUser.name },
          SECRET,
          { expiresIn: '2h' }
        );
    
        // 8. Guardar el token en una cookie segura
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',  // false en desarrollo, true en producción
          sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
          path: '/',
          maxAge: 2 * 60 * 60 * 1000,
        });
        
        // 9. Responder sin incluir el token en el body
        return res.status(200).json({
          message: "Inicio de sesión exitoso",
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            lastLogin: updatedUser.lastLogin,
          },
        });
      } catch (error) {
        console.error("Error en login:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
      }
    };


// Controlador checkSession en User.controller.js
export const checkSession = (req, res) => {
    const { token } = req.cookies;
    if (!token) {
      return res.status(200).json({ isAuthenticated: false });
    }
    try {
      const decoded = jwt.verify(token, SECRET);
      return res.status(200).json({
        isAuthenticated: true,
        user: {
          id: decoded.userId,
          role: decoded.role,
          name: decoded.name,
        },
      });
    } catch (err) {
      return res.status(200).json({ isAuthenticated: false });
    }
  };
  

//cerrar sesion
export const logout = (req, res) => {
    // 1. Borrar la cookie que llamaste "token" en el login
    res.clearCookie('token');
  
    // 2. Devolver un mensaje de éxito
    return res.status(200).json({ message: "Sesión cerrada con éxito" });
  };
  

// Middleware para verificar token
export const verifyToken = (req, res, next) => {
  const { token } = req.cookies; // Leer la cookie
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

export const getProfile = async (req, res) => {
    try {
      const userId = Number(req.userId); // <-- ya existe
      const user = await prisma.usuarios.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          lastname: true,
          email: true,
          telefono: true,
          fechadenacimiento: true,
          user: true,
          preguntaSecreta: true,
          respuestaSecreta: true,
          verified: true,
          role: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          blocked: true,
          lockCount: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          // password: false // no se puede excluir así, hay que no listarlo
        },
      });
  
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado." });
      }
  
      return res.status(200).json(user);
    } catch (error) {
      console.error("Error obteniendo perfil:", error);
      return res.status(500).json({ message: "Error interno del servidor." });
    }
  };

  //extraer todos los usuarios

  export const getAllUsers = async (req, res) => {
    try {
      // Encontrar todos los usuarios de la tabla "Usuarios"
      // Omitimos el campo "password" (no lo incluimos en el select).
      const users = await prisma.usuarios.findMany({
        select: {
          id: true,
          name: true,
          lastname: true,
          email: true,
          telefono: true,
          fechadenacimiento: true,
          user: true,
          preguntaSecreta: true,
          respuestaSecreta: true,
          verified: true,
          role: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          blocked: true,
          lockCount: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          // password: false // En Prisma, simplemente no lo incluyes
        },
      });
  
      return res.status(200).json(users);
    } catch (error) {
      console.error("Error en getAllUsers:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
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
    // Ordenamos por createdAt en orden descendente y limitamos a 5 resultados
    const recentUsers = await prisma.usuarios.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      // Seleccionamos explícitamente los campos que queremos devolver
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        telefono: true,
        fechadenacimiento: true,
        user: true,
        preguntaSecreta: true,
        respuestaSecreta: true,
        verified: true,
        role: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        blocked: true,
        lockCount: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        // Omitimos 'password' al no incluirlo en select
      },
    });

    res.status(200).json(recentUsers);
  } catch (error) {
    console.error("Error al obtener usuarios recientes:", error);
    res.status(500).json({ message: "Error al obtener usuarios recientes" });
  }
};


//informacion de usuarios bloqueados
export const getRecentBlockedUsers = async (req, res) => {
  try {
    // 1. Buscar a los usuarios con lockedUntil > hoy, o blocked = true,
    //    o que se hayan actualizado en las últimas 24 horas
    const recentBlockedUsers = await prisma.usuarios.findMany({
      where: {
        OR: [
          { lockedUntil: { gt: new Date() } }, // Bloqueados temporalmente
          { blocked: true },                  // Bloqueados permanentemente
          { updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Actualizados en últimas 24h
        ],
      },
      orderBy: { updatedAt: 'desc' }, // Ordenar por última actualización descendente
      take: 10,                       // Limitar a 10 usuarios
      select: {
        id: true,
        name: true,
        email: true,
        lockedUntil: true,
        blocked: true,
        updatedAt: true,
        // Agrega otros campos si los necesitas, excepto password
      },
    });

    // 2. Enriquecer los datos
    const enrichedData = recentBlockedUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      blockedPermanently: user.blocked,
      lockedUntil: user.lockedUntil,
      currentlyBlocked:
        user.blocked || (user.lockedUntil && user.lockedUntil > new Date()),
      blockedType: user.blocked
        ? "Permanent"
        : user.lockedUntil && user.lockedUntil > new Date()
        ? "Temporary"
        : "None",
      wasRecentlyBlocked:
        user.updatedAt >= new Date(Date.now() - 24 * 60 * 60 * 1000),
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
    // 1. Buscar usuarios con failedLoginAttempts > 0
    //    ordenados por failedLoginAttempts desc y limitar a 10
    const usersWithFailedAttempts = await prisma.usuarios.findMany({
      where: {
        failedLoginAttempts: { gt: 0 },
      },
      orderBy: {
        failedLoginAttempts: 'desc', // Equivale a sort({ failedLoginAttempts: -1 })
      },
      take: 10, // Límite opcional
      select: {
        id: true,
        name: true,
        email: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        updatedAt: true,
        // Omitimos password y otros campos que no quieras exponer
      },
    });

    // 2. Enriquecer los datos de cada usuario
    const enrichedData = usersWithFailedAttempts.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      lastFailedAttempt: user.updatedAt,
      isLocked: user.lockedUntil && user.lockedUntil > new Date(),
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
    const user = await prisma.usuarios.findUnique({
      where: { id: Number(userId) },
    });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Bloquear al usuario de forma permanente
    await prisma.usuarios.update({
      where: { id: user.id },
      data: {
        blocked: true,
        lockedUntil: null, // Limpia cualquier bloqueo temporal previo
      },
    });

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

    // Buscar al usuario por ID
    const user = await prisma.usuarios.findUnique({
      where: { id: Number(userId) },
    });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Desbloquear al usuario
    await prisma.usuarios.update({
      where: { id: user.id },
      data: {
        lockedUntil: null,          // Eliminar bloqueo temporal
        blocked: false,            // Eliminar bloqueo permanente
        failedLoginAttempts: 0,    // Restablecer intentos fallidos
        lockCount: 0,              // Restablecer contador de bloqueos
      },
    });

    res.status(200).json({ message: "Usuario desbloqueado exitosamente." });
  } catch (error) {
    console.error("Error al desbloquear al usuario:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};


export const getRecentLogins = async (req, res) => {
  try {
    // Buscar usuarios con lastLogin no nulo (not: null)
    // Ordenar por lastLogin desc, limitar a 10
    // Seleccionar name, email, lastLogin
    const recentLogins = await prisma.usuarios.findMany({
      where: {
        lastLogin: {
          not: null, // Equivale a { $exists: true } en Mongoose
        },
      },
      orderBy: {
        lastLogin: 'desc',
      },
      take: 10,
      select: {
        name: true,
        email: true,
        lastLogin: true,
      },
    });

    res.status(200).json(recentLogins);
  } catch (error) {
    console.error("Error al obtener inicios de sesión recientes:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const blockUserTemporarily = async (req, res) => {
  try {
    const { email, lockDuration } = req.body;

    // Verifica que se envíen el correo y la duración
    if (!email || !lockDuration) {
      return res
        .status(400)
        .json({ message: "Correo y duración de bloqueo son requeridos." });
    }

    // Buscar al usuario por correo
    const user = await prisma.usuarios.findUnique({
      where: { email },
    });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Convertir duración en minutos a milisegundos y calcular el tiempo de desbloqueo
    const lockTimeInMs = lockDuration * 60 * 1000;
    const newLockedUntil = new Date(Date.now() + lockTimeInMs);

    // Actualizar campos en la base de datos:
    // - lockedUntil con la nueva fecha
    // - blocked a false (no es un bloqueo permanente)
    // - lockCount incrementa en 1
    const updatedUser = await prisma.usuarios.update({
      where: { id: user.id },
      data: {
        lockedUntil: newLockedUntil,
        blocked: false,
        lockCount: { increment: 1 }, // Aumenta lockCount en 1
      },
    });

    return res.status(200).json({
      message: `Usuario bloqueado temporalmente por ${lockDuration} minuto(s).`,
      lockedUntil: updatedUser.lockedUntil,
    });
  } catch (error) {
    console.error("Error al bloquear al usuario temporalmente:", error);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};
