const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('feriaslegais', 'feriaslegais', '564321', {
  host: 'localhost',
  dialect: 'mysql'
});

module.exports = sequelize;