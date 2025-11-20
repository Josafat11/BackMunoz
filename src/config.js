export default {
  SECRET: process.env.SECRET || 'petsuper',
  
  // Credenciales SMTP de Brevo desde variables de entorno
  MAILUSER: process.env.MAILUSER,
  MAILPASS: process.env.MAILPASS,
  MAILHOST: process.env.MAILHOST || 'smtp-relay.brevo.com',
  MAILPORT: process.env.MAILPORT || 587
};