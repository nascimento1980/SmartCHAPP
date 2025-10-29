const express = require('express');
const axios = require('axios');

const router = express.Router();

// GET /api/external-data/cep/:cep - Buscar dados por CEP usando ViaCEP
router.get('/cep/:cep', async (req, res) => {
  try {
    const { cep } = req.params;
    
    // Limpar CEP (remover traços e espaços)
    const cleanCep = cep.replace(/\D/g, '');
    
    // Validar CEP
    if (cleanCep.length !== 8) {
      return res.status(400).json({ 
        error: 'CEP inválido. Deve conter 8 dígitos.' 
      });
    }
    
    // Buscar dados no ViaCEP
    const response = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      timeout: 5000
    });
    
    if (response.data.erro) {
      return res.status(404).json({ 
        error: 'CEP não encontrado' 
      });
    }
    
    // Retornar dados formatados
    res.json({
      cep: response.data.cep,
      address: response.data.logradouro,
      complement: response.data.complemento,
      neighborhood: response.data.bairro,
      city: response.data.localidade,
      state: response.data.uf,
      ibge: response.data.ibge,
      gia: response.data.gia,
      ddd: response.data.ddd,
      siafi: response.data.siafi
    });
    
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ 
        error: 'Timeout ao buscar CEP. Tente novamente.' 
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'CEP não encontrado' 
      });
    }
    
    res.status(500).json({ 
      error: 'Erro ao buscar dados do CEP',
      details: error.message 
    });
  }
});

// GET /api/external-data/cnpj/:cnpj - Buscar dados por CNPJ usando ReceitaWS
router.get('/cnpj/:cnpj', async (req, res) => {
  try {
    const { cnpj } = req.params;
    
    // Limpar CNPJ (remover pontos, traços e barras)
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    // Validar CNPJ
    if (cleanCnpj.length !== 14) {
      return res.status(400).json({ 
        error: 'CNPJ inválido. Deve conter 14 dígitos.' 
      });
    }
    
    // Buscar dados na ReceitaWS
    const response = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}`, {
      timeout: 10000
    });
    
    if (response.data.status === 'ERROR') {
      return res.status(404).json({ 
        error: response.data.message || 'CNPJ não encontrado' 
      });
    }
    
    // Retornar dados formatados
    res.json({
      cnpj: response.data.cnpj,
      company_name: response.data.nome || response.data.fantasia,
      fantasy_name: response.data.fantasia,
      legal_name: response.data.nome,
      email: response.data.email,
      phone: response.data.telefone,
      situation: response.data.situacao,
      opening_date: response.data.abertura,
      legal_nature: response.data.natureza_juridica,
      address: response.data.logradouro,
      number: response.data.numero,
      complement: response.data.complemento,
      neighborhood: response.data.bairro,
      city: response.data.municipio,
      state: response.data.uf,
      zipcode: response.data.cep,
      main_activity: response.data.atividade_principal?.[0]?.text,
      activities: response.data.atividades_secundarias?.map(a => a.text),
      capital_social: response.data.capital_social,
      qsa: response.data.qsa // Quadro de Sócios e Administradores
    });
    
  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ 
        error: 'Timeout ao buscar CNPJ. Tente novamente.' 
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'Limite de requisições excedido. Aguarde alguns minutos e tente novamente.' 
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'CNPJ não encontrado' 
      });
    }
    
    res.status(500).json({ 
      error: 'Erro ao buscar dados do CNPJ',
      details: error.message 
    });
  }
});

module.exports = router;

