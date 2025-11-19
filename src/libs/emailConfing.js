import config from "../config.js";  // Importamos las credenciales
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // ← IMPORTANTE: usar STARTTLS en lugar de SSL
  auth: {
    user: config.MAILUSER,
    pass: config.MAILPASS, // App Password
  },
});

