const express = require('express');
const router = express.Router();
const moment = require('moment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Ferias = require('../models/feriasModel');
const fs = require('fs');
const path = require('path');
const upload = require('../config/multer');
const fsPromises = fs.promises;

// Função utilitária para cálculo de dias de férias
function calcularDiasFerias(faltas) {
  if (faltas <= 5) return 30;
  if (faltas <= 14) return 24;
  if (faltas <= 23) return 18;
  if (faltas <= 32) return 12;
  return 0;
}

// LISTAGEM COM PAGINAÇÃO
router.get('/servicos', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const { count, rows } = await Ferias.findAndCountAll({
    limit,
    offset,
    order: [['createdAt', 'DESC']]
  });

  const dados = rows.map(reg => {
    const salario = parseFloat(reg.salario);
    const valorFerias = ((salario / 30) * reg.diasFerias * (4 / 3)).toFixed(2);
    return {
      id: reg.id,
      funcionario_rh: reg.funcionario_rh,
      funcionario_ferias: reg.funcionario_ferias,
      salario: salario.toFixed(2),
      faltas: reg.faltas,
      diasFerias: reg.diasFerias,
      valorFerias,
      data: moment(reg.createdAt).format('DD/MM/YYYY HH:mm:ss')
    };
  });

  const totalPages = Math.ceil(count / limit);
  res.render('servicos', { dados, currentPage: page, totalPages });
});

// CADASTRO
router.post('/cadastro', async (req, res) => {
  const { funcionario_rh, funcionario_ferias, salario, faltas } = req.body;

  if (!funcionario_rh || !funcionario_ferias || !salario || faltas === undefined) {
    return res.send(`<script>alert('Preencha todos os campos.'); window.history.back();</script>`);
  }

  const salarioNum = parseFloat(salario);
  const faltasNum = parseInt(faltas);
  if (isNaN(salarioNum) || salarioNum <= 0 || isNaN(faltasNum)) {
    return res.send(`<script>alert('Dados inválidos.'); window.history.back();</script>`);
  }

  const diasFerias = calcularDiasFerias(faltasNum);

  try {
    await Ferias.create({
      funcionario_rh,
      funcionario_ferias,
      salario: salarioNum,
      faltas: faltasNum,
      diasFerias
    });
    res.send(`<script>alert('Cadastro realizado com sucesso!'); window.location.href='/servicos';</script>`);
  } catch (err) {
    res.send(`<script>alert('Erro ao cadastrar.'); window.history.back();</script>`);
  }
});

// EDITAR
router.get('/editar/:id', async (req, res) => {
  try {
    const registro = await Ferias.findByPk(req.params.id);
    if (!registro) return res.send('Registro não encontrado.');
    res.render('editar', { ...registro.dataValues });
  } catch (err) {
    res.send('Erro ao carregar edição: ' + err.message);
  }
});

// ATUALIZAR
router.post('/atualizar/:id', async (req, res) => {
  const { funcionario_rh, funcionario_ferias, salario, faltas } = req.body;
  const salarioNum = parseFloat(salario);
  const faltasNum = parseInt(faltas);
  if (!funcionario_rh || !funcionario_ferias || isNaN(salarioNum) || isNaN(faltasNum)) {
    return res.send(`<script>alert('Preencha os campos corretamente.'); window.history.back();</script>`);
  }
  const diasFerias = calcularDiasFerias(faltasNum);
  try {
    await Ferias.update(
      { funcionario_rh, funcionario_ferias, salario: salarioNum, faltas: faltasNum, diasFerias },
      { where: { id: req.params.id } }
    );
    res.send(`<script>alert('Atualizado com sucesso!'); window.location.href='/servicos';</script>`);
  } catch (err) {
    res.send('Erro ao atualizar: ' + err.message);
  }
});

// EXCLUSÃO INDIVIDUAL
router.get('/deletar/:id', async (req, res) => {
  try {
    await Ferias.destroy({ where: { id: req.params.id } });
    res.redirect('/servicos');
  } catch (err) {
    res.send('Erro ao excluir: ' + err.message);
  }
});

// EXCLUSÃO MÚLTIPLA
router.post('/deletar-varios', async (req, res) => {
  const { ids } = req.body;
  const lista = Array.isArray(ids) ? ids : [ids];
  try {
    await Ferias.destroy({ where: { id: lista } });
    res.send(`<script>alert('Registros excluídos com sucesso!'); window.location.href='/servicos';</script>`);
  } catch (err) {
    res.send('Erro ao excluir registros: ' + err.message);
  }
});

// IMPORTAÇÃO EXCEL
router.post('/upload-excel', upload.single('file'), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.getWorksheet('Férias Legais');
    const registros = [];
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      const [id, rh, funcionario, salario] = row.values.slice(1);
      if (rh && funcionario && salario) {
        registros.push({
          funcionario_rh: rh,
          funcionario_ferias: funcionario,
          salario: parseFloat(salario),
          faltas: 0,
          diasFerias: 30
        });
      }
    });
    for (const reg of registros) {
      await Ferias.create(reg);
    }
    await fsPromises.unlink(req.file.path);
    res.send('<script>alert("Excel importado com sucesso!"); window.location.href="/servicos";</script>');
  } catch (err) {
    res.status(500).send('Erro ao importar Excel: ' + err.message);
  }
});

module.exports = router;

// DOWNLOAD PDF
router.get('/download', async (req, res) => {
  try {
    const registros = await Ferias.findAll({ order: [['createdAt', 'DESC']] });

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader('Content-Disposition', 'attachment; filename="ferias_legais.pdf"');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Relatório de Férias Legais', { align: 'center' });
    doc.moveDown(1);

    registros.forEach((reg, i) => {
      const salario = parseFloat(reg.salario);
      const valorFerias = ((salario / 30) * reg.diasFerias * (4 / 3)).toFixed(2);
      doc
        .fontSize(12)
        .text(`${i + 1}. RH: ${reg.funcionario_rh}`)
        .text(`   Funcionário: ${reg.funcionario_ferias}`)
        .text(`   Salário: R$ ${salario.toFixed(2)}`)
        .text(`   Dias de Férias: ${reg.diasFerias}`)
        .text(`   Valor das Férias: R$ ${valorFerias}`)
        .text(`   Data de Cadastro: ${moment(reg.createdAt).format('DD/MM/YYYY HH:mm:ss')}`)
        .moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).send('Erro ao gerar PDF.');
  }
});

// DOWNLOAD EXCEL
router.get('/download-excel', async (req, res) => {
  try {
    const registros = await Ferias.findAll({ order: [['createdAt', 'DESC']] });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Férias Legais');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 6 },
      { header: 'RH', key: 'rh', width: 20 },
      { header: 'Funcionário', key: 'funcionario', width: 20 },
      { header: 'Salário', key: 'salario', width: 15 },
      { header: 'Faltas', key: 'faltas', width: 10 },
      { header: 'Dias de Férias', key: 'diasFerias', width: 15 },
      { header: 'Valor das Férias', key: 'valorFerias', width: 20 },
      { header: 'Data de Cadastro', key: 'dataCadastro', width: 22 }
    ];

    registros.forEach((reg) => {
      const valorFerias = ((reg.salario / 30) * reg.diasFerias * (4 / 3)).toFixed(2);
      sheet.addRow({
        id: reg.id,
        rh: reg.funcionario_rh,
        funcionario: reg.funcionario_ferias,
        salario: parseFloat(reg.salario),
        faltas: reg.faltas,
        diasFerias: reg.diasFerias,
        valorFerias: parseFloat(valorFerias),
        dataCadastro: moment(reg.createdAt).format('DD/MM/YYYY HH:mm:ss')
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ferias_legais.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).send('Erro ao gerar Excel.');
  }
});