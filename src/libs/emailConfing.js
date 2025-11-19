import config from "../config.js";
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: config.MAILHOST,    // smtp-relay.brevo.com
  port: config.MAILPORT,    // 587
  secure: false,            // STARTTLS
  auth: {
    user: config.MAILUSER,  // 9c06cd001@smtp-brevo.com
    pass: config.MAILPASS,  // tu clave SMTP
  },
});
