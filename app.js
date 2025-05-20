const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const exphbs = require('express-handlebars');
const fs = require('fs');
const multer = require('multer');

const app = express();

// Configuração do Handlebars
app.engine('handlebars', exphbs.engine({
  helpers: {
    range: function(start, end) {
      let arr = [];
      for (let i = start; i <= end; i++) arr.push(i);
      return arr;
    },
    eq: function(a, b) { return a === b; },
    json: function (context) {
      return JSON.stringify(context, null, 2);
    }
  }
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));

// Rota de páginas
app.get('/', (req, res) => res.render('home'));
app.get('/sobre', (req, res) => res.render('sobre'));
app.get('/cadastro', (req, res) => res.render('cadastro'));
app.get('/importar', (req, res) => res.render('importar'));

// Importa e usa o módulo de rotas de funcionalidades
const feriasRoutes = require('./routes/feriasRoutes'); // Rotas relacionadas ao CRUD de férias
app.use('/', feriasRoutes);

// Início do servidor
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
