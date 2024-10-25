import app from './src/app.js'; // Importación de app.js desde src/
import './src/database.js';      // Importación de database.js desde src/

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
