const express = require('express');
const router = express.Router();
const Producao = require('../models/Producao');
const Dispositivo = require('../models/Dispositivo');
const Funcionario = require('../models/Funcionario');
const { autenticar } = require('./authRoutes');

// GET /api/relatorios - busca relatórios filtrados e agrupados por funcionário e dia
router.get('/', autenticar, async (req, res) => {
  try {
    const { dataInicio, dataFim, funcionario, dispositivo } = req.query;
    const dispositivos = await Dispositivo.find({ usuario: req.usuario.id });
    const filtro = {
      dispositivo: { $in: dispositivos.map(d => d._id) }
    };
    if (dataInicio) {
      filtro.dataHora = { ...filtro.dataHora, $gte: new Date(dataInicio) };
    }
    if (dataFim) {
      filtro.dataHora = { ...filtro.dataHora, $lte: new Date(dataFim) };
    }
    if (funcionario) {
      const funcionarios = await Funcionario.find({ nome: { $regex: funcionario, $options: 'i' } });
      filtro.funcionario = { $in: funcionarios.map(f => f._id) };
    }
    if (dispositivo) {
      const dispositivosFiltro = await Dispositivo.find({
        usuario: req.usuario.id,
        $or: [
          { nome: { $regex: dispositivo, $options: 'i' } },
          { deviceToken: { $regex: dispositivo, $options: 'i' } }
        ]
      });
      filtro.dispositivo = { $in: dispositivosFiltro.map(d => d._id) };
    }
    
    // Agregação para agrupar por funcionário e dia
    const relatorios = await Producao.aggregate([
      { $match: filtro },
      {
        $lookup: {
          from: 'funcionarios',
          localField: 'funcionario',
          foreignField: '_id',
          as: 'funcionarioData'
        }
      },
      {
        $lookup: {
          from: 'dispositivos',
          localField: 'dispositivo',
          foreignField: '_id',
          as: 'dispositivoData'
        }
      },
      { $unwind: { path: '$funcionarioData', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$dispositivoData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          dia: { $dateToString: { format: '%Y-%m-%d', date: '$dataHora' } },
          funcionario: '$funcionarioData.nome',
          funcionarioId: '$funcionario',
          dispositivo: '$dispositivoData.nome',
          quantidade: 1,
          tempoProducao: 1
        }
      },
      {
        $group: {
          _id: {
            dia: '$dia',
            funcionarioId: '$funcionarioId',
            funcionario: '$funcionario'
          },
          totalProducao: { $sum: '$quantidade' },
          totalTempo: { $sum: '$tempoProducao' },
          dispositivos: { $addToSet: '$dispositivo' }
        }
      },
      {
        $project: {
          _id: 0,
          dia: '$_id.dia',
          funcionario: '$_id.funcionario',
          totalProducao: 1,
          totalTempo: 1,
          dispositivos: 1
        }
      },
      { $sort: { dia: -1, funcionario: 1 } }
    ]);
    
    console.log('Relatórios agrupados por funcionário e dia:', relatorios.length);
    res.json(relatorios);
  } catch (err) {
    console.error('Erro ao buscar relatórios:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
