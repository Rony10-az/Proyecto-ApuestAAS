const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});
