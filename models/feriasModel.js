// Model Sequelize para a tabela de Férias
// Define os campos da tabela e suas validações

const { DataTypes } = require('sequelize');
const db = require('../config/db');

// Define o modelo da tabela Ferias com Sequelize
const Ferias = db.define('Ferias', {
  funcionario_rh: {
    type: DataTypes.STRING,
    allowNull: false // Campo obrigatório
  },
  funcionario_ferias: {
    type: DataTypes.STRING,
    allowNull: false // Campo obrigatório
  },
  salario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0.01 // Salário deve ser positivo
    }
  },
  faltas: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  diasFerias: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30
  }
});

// Sincroniza a tabela com o banco de dados
// Usar { force: true } apenas para recriar tabelas em desenvolvimento
db.sync({ /* force: true */ })
  .then(() => console.log('Banco sincronizado'))
  .catch((err) => console.error('Erro ao sincronizar banco:', err));

module.exports = Ferias;
