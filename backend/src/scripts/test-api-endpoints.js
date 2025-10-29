const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

console.log('🧪 Testando endpoints da API de configurações...');

const testEndpoints = async () => {
  try {
    // Testar GET /settings/company
    console.log('\n📖 Testando GET /settings/company...');
    try {
      const response = await axios.get(`${BASE_URL}/settings/company`);
      console.log('✅ GET /settings/company - Status:', response.status);
      console.log('📊 Dados retornados:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  GET /settings/company - Status: 401 (Token não fornecido - esperado)');
      } else {
        console.log('❌ GET /settings/company - Erro:', error.message);
      }
    }
    
    // Testar PUT /settings/company
    console.log('\n📝 Testando PUT /settings/company...');
    try {
      const testData = {
        companyName: 'Empresa Teste API',
        companyAddress: 'Rua Teste API, 456',
        companyCity: 'Rio de Janeiro',
        companyState: 'RJ'
      };
      
      const response = await axios.put(`${BASE_URL}/settings/company`, testData);
      console.log('✅ PUT /settings/company - Status:', response.status);
      console.log('📊 Resposta:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  PUT /settings/company - Status: 401 (Token não fornecido - esperado)');
      } else {
        console.log('❌ PUT /settings/company - Erro:', error.message);
      }
    }
    
    // Testar GET novamente para ver se os dados foram salvos
    console.log('\n📖 Testando GET /settings/company novamente...');
    try {
      const response = await axios.get(`${BASE_URL}/settings/company`);
      console.log('✅ GET /settings/company - Status:', response.status);
      console.log('📊 Dados após salvamento:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  GET /settings/company - Status: 401 (Token não fornecido - esperado)');
      } else {
        console.log('❌ GET /settings/company - Erro:', error.message);
      }
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error.message);
  }
};

const main = async () => {
  try {
    await testEndpoints();
    console.log('\n✅ Teste dos endpoints concluído!');
  } catch (error) {
    console.error('💥 Erro durante o teste:', error.message);
  }
};

main();
