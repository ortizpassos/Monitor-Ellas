const express = require("express");
const router = express.Router();
const Dispositivo = require("../models/Dispositivo");
const { autenticar } = require('./authRoutes');

// Criar novo dispositivo
router.post("/", autenticar, async (req, res) => {
  console.log('REQ.BODY:', req.body); // LOG PARA DEBUG
  try {
    // Associa o dispositivo ao usuário autenticado
    const usuarioId = req.usuario.id;
    const novoDispositivo = new Dispositivo({ ...req.body, usuario: usuarioId });
    await novoDispositivo.save();
    res.status(201).json(novoDispositivo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Obter todos os dispositivos
router.get("/", autenticar, async (req, res) => {
  try {
    // Filtra dispositivos pelo usuário autenticado
    const usuarioId = req.usuario.id;
    const dispositivos = await Dispositivo.find({ usuario: usuarioId })
      .populate('funcionarioLogado')
      .populate('operacao');
    res.json(dispositivos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Obter dispositivo por ID
router.get("/:id", autenticar, async (req, res) => {
  try {
    const dispositivo = await Dispositivo.findById(req.params.id)
      .populate('funcionarioLogado')
      .populate('operacao');
    if (!dispositivo) return res.status(404).json({ message: "Dispositivo não encontrado" });
    res.json(dispositivo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Atualizar dispositivo
router.patch("/:id", autenticar, async (req, res) => {
  try {
    const dispositivo = await Dispositivo.findById(req.params.id);
    if (!dispositivo) return res.status(404).json({ message: "Dispositivo não encontrado" });

    Object.assign(dispositivo, req.body);
    await dispositivo.save();
    res.json(dispositivo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Deletar dispositivo
router.delete("/:id", autenticar, async (req, res) => {
  try {
    const dispositivo = await Dispositivo.findById(req.params.id);
    if (!dispositivo) return res.status(404).json({ message: "Dispositivo não encontrado" });

    await Dispositivo.deleteOne({ _id: req.params.id });
    res.json({ message: "Dispositivo deletado" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

