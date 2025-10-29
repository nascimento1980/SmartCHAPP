# CheckList Mestre de Diagnóstico e Viabilidade (Hotelaria) - Modelo PDF

## 📄 Descrição

Modelo de exportação PDF profissional e detalhado para o CheckList Mestre de Diagnóstico e Viabilidade do setor de Hotelaria.

---

## 🎯 Características do Novo Modelo

### ✅ Estrutura Profissional
- **Cabeçalho corporativo** com título destacado
- **Seções organizadas** por cor e hierarquia
- **Layout limpo e legível** em formato A4
- **Múltiplas páginas** (uma por setor + página de conclusão)

### 📋 Seções Incluídas

#### 1. **Informações do Estabelecimento**
- Nome do Hotel
- Categoria (estrelas)
- Endereço completo
- Contato principal
- Telefone e E-mail

#### 2. **Informações da Visita Técnica**
- Data e horário da visita
- Consultor responsável
- Responsável pela higienização
- Cargo do responsável

#### 3. **Estrutura do Hotel**
- Total de quartos
- Taxa de ocupação média
- Equipe de limpeza
- Turnos de trabalho

#### 4. **Fornecedor Atual**
- Nome do fornecedor
- Tempo de parceria
- Valor mensal aproximado
- Nível de satisfação (1-10)
- Principais problemas

#### 5. **10 Setores Detalhados** (uma página por setor)
Cada setor contém:

**A) Diagnóstico da Situação Atual:**
- Produtos utilizados atualmente
- Diluições praticadas
- Superfícies predominantes
- Frequência de limpeza
- Problemas identificados
- Manchas persistentes
- Odores residuais
- Uso de produtos agressivos

**B) Teste de Produtos SMART:**
- Produto(s) testado(s)
- Diluição aplicada
- Superfície testada
- Resultado do teste
- Comparativo (Antes x Depois)

**C) Avaliação e Viabilidade:**
- Eficácia do produto SMART
- Redução de custos estimada
- Melhoria de produtividade
- Segurança e sustentabilidade
- Viabilidade de implementação
- Prioridade (Baixa/Média/Alta)

**D) Observações Adicionais**

#### 6. **Setores Analisados:**
1. 🏢 Recepção e Lobby
2. 🛏️ Apartamentos/Quartos
3. 🚿 Banheiros (Quartos)
4. 🍽️ Restaurante e Área de Alimentação
5. 👨‍🍳 Cozinha Industrial
6. 🧺 Lavanderia
7. 🏊 Piscina e Área Externa
8. 💆‍♂️ SPA e Academia
9. 🌳 Áreas Comuns
10. 🔧 Áreas de Serviço

#### 7. **Análise Consolidada e Recomendações**
- Oportunidades identificadas
- Proposta de valor SMART
- Investimento mensal estimado
- Economia mensal estimada
- ROI esperado (meses)
- Benefícios adicionais
- Próximos passos
- Observações finais do consultor

#### 8. **Classificação de Viabilidade Geral**
- Visual com cores:
  - 🟢 Verde: Alta viabilidade
  - 🟡 Laranja: Média viabilidade
  - 🔴 Vermelho: Baixa viabilidade

#### 9. **Assinaturas**
- Assinatura do Consultor SMART
- Assinatura do Responsável do Hotel

---

## 🔧 Como Usar

### 1. **Criar/Editar Formulário de Hotelaria**

O título do formulário deve conter a palavra **"hotelaria"** (case-insensitive) para ativar o modelo especial.

Exemplo:
```
CheckList Mestre de Diagnóstico e Viabilidade - Hotelaria
```

### 2. **Campos Necessários no Formulário**

#### **Campos do Cabeçalho:**
```javascript
{
  "hotel_nome": "Nome do Hotel",
  "hotel_categoria": "5 Estrelas",
  "hotel_endereco": "Endereço completo",
  "hotel_contato": "Nome do contato",
  "hotel_telefone": "(11) 1234-5678",
  "hotel_email": "contato@hotel.com",
  "data_visita": "2025-10-29",
  "horario_visita": "14:00",
  "consultor_nome": "João Silva",
  "responsavel_hig": "Maria Santos",
  "responsavel_cargo": "Governanta",
  "total_quartos": "150",
  "taxa_ocupacao": "75%",
  "equipe_limpeza": "25 pessoas",
  "turnos_trabalho": "3 turnos",
  "fornecedor_atual": "Fornecedor XYZ",
  "tempo_parceria": "3 anos",
  "valor_mensal": "R$ 15.000",
  "satisfacao_fornecedor": "6/10",
  "problemas_fornecedor": "Alto custo, produtos agressivos"
}
```

#### **Campos por Setor** (exemplo para "recepcao"):
```javascript
{
  "recepcao_produtos_atuais": "Multiuso genérico",
  "recepcao_diluicao_atual": "1:10",
  "recepcao_superficies": "Madeira, vidro, mármore",
  "recepcao_frequencia": "3x ao dia",
  "recepcao_problemas": "Manchas em vidros",
  "recepcao_manchas": "Gordura, impressões digitais",
  "recepcao_odores": "Odor químico forte",
  "recepcao_produtos_agressivos": "Sim",
  "recepcao_produto_smart": "SMART Glass & Surface",
  "recepcao_diluicao_smart": "1:50",
  "recepcao_superficie_teste": "Vidro da recepção",
  "recepcao_resultado_teste": "Excelente",
  "recepcao_comparativo": "Remoção 100% das manchas sem resíduos",
  "recepcao_eficacia": "9/10",
  "recepcao_reducao_custos": "40%",
  "recepcao_produtividade": "Tempo reduzido em 50%",
  "recepcao_sustentabilidade": "Biodegradável, pH neutro",
  "recepcao_viabilidade": "Alta",
  "recepcao_prioridade": "Alta",
  "recepcao_observacoes": "Setor prioritário para implementação"
}
```

Repita para cada setor: `quartos`, `banheiros`, `restaurante`, `cozinha`, `lavanderia`, `piscina`, `spa`, `areas_comuns`, `areas_servico`

#### **Campos da Conclusão:**
```javascript
{
  "setores_prioritarios": "Recepção, Quartos, Banheiros",
  "economia_estimada": "R$ 6.000/mês",
  "investimento_mensal": "R$ 12.000",
  "economia_mensal": "R$ 6.000",
  "roi_meses": "6 meses",
  "beneficios_adicionais": "Segurança, sustentabilidade, produtividade",
  "proximos_passos": "1) Aprovação da diretoria\n2) Teste piloto em 3 setores\n3) Treinamento da equipe",
  "observacoes_finais": "Hotel demonstrou grande interesse. Oportunidade de implementação em Q1/2026.",
  "viabilidade_geral": "Alta Viabilidade",
  "assinatura_consultor": "data:image/png;base64,...",
  "assinatura_hotel": "data:image/png;base64,..."
}
```

### 3. **Exportar PDF**

**Endpoint:**
```
GET /api/forms-export/submissions/:submission_id/pdf
```

**Exemplo:**
```bash
curl http://localhost:5001/api/forms-export/submissions/abc-123-def/pdf \
  -H "Authorization: Bearer SEU_TOKEN" \
  > checklist-hotelaria.pdf
```

**Ou no frontend:**
```javascript
const response = await api.get(`/forms-export/submissions/${submissionId}/pdf`, {
  responseType: 'blob'
});

const blob = new Blob([response.data], { type: 'application/pdf' });
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `checklist-hotelaria-${Date.now()}.pdf`;
link.click();
```

---

## 🎨 Personalização

### Cores Usadas:
- **Azul Escuro (#003366)**: Títulos principais
- **Verde (#006633)**: Subtítulos e seções
- **Cinza (#666)**: Rodapé
- **Verde (#00AA00)**: Alta viabilidade
- **Laranja (#FF8800)**: Média viabilidade
- **Vermelho (#CC0000)**: Baixa viabilidade

### Fontes:
- **Helvetica-Bold**: Títulos
- **Helvetica**: Texto normal

---

## 📊 Exemplo de Estrutura de Dados Completa

Arquivo: `exemplo-dados-hotelaria.json`

```json
{
  "hotel_nome": "Grand Hotel Atlântico",
  "hotel_categoria": "5 Estrelas",
  "hotel_endereco": "Av. Beira Mar, 1000 - Copacabana, Rio de Janeiro - RJ",
  "hotel_contato": "Carlos Mendes",
  "hotel_telefone": "(21) 3456-7890",
  "hotel_email": "operacoes@grandhotelantlantico.com.br",
  "data_visita": "2025-10-29",
  "horario_visita": "14:30",
  "consultor_nome": "Ana Paula Costa",
  "responsavel_hig": "Fernanda Lima",
  "responsavel_cargo": "Gerente de Governança",
  "total_quartos": "250",
  "taxa_ocupacao": "85%",
  "equipe_limpeza": "40 pessoas",
  "turnos_trabalho": "3 turnos (24h)",
  "fornecedor_atual": "Higienizadora Pro Ltda",
  "tempo_parceria": "5 anos",
  "valor_mensal": "R$ 25.000",
  "satisfacao_fornecedor": "7/10",
  "problemas_fornecedor": "Custo elevado, produtos não biodegradáveis",
  
  "recepcao_produtos_atuais": "Multiuso genérico + limpa-vidros",
  "recepcao_diluicao_atual": "1:10 (multiuso), puro (vidros)",
  "recepcao_superficies": "Mármore, vidro, aço inox, madeira nobre",
  "recepcao_frequencia": "4x ao dia",
  "recepcao_problemas": "Manchas em vidros, ranhuras no mármore",
  "recepcao_manchas": "Impressões digitais, gordura, calcário",
  "recepcao_odores": "Odor químico forte nas manhãs",
  "recepcao_produtos_agressivos": "Sim, hidróxido de sódio 5%",
  "recepcao_produto_smart": "SMART Glass & Marble Cleaner",
  "recepcao_diluicao_smart": "1:100",
  "recepcao_superficie_teste": "Balcão de mármore e porta de vidro principal",
  "recepcao_resultado_teste": "Excelente - Brilho superior",
  "recepcao_comparativo": "Antes: manchas visíveis, odor forte. Depois: superfície impecável, sem odor, brilho natural.",
  "recepcao_eficacia": "9.5/10",
  "recepcao_reducao_custos": "45% (maior diluição)",
  "recepcao_produtividade": "Tempo de limpeza reduzido em 60%",
  "recepcao_sustentabilidade": "100% biodegradável, pH 7, certificação ABNT",
  "recepcao_viabilidade": "Muito Alta",
  "recepcao_prioridade": "Alta",
  "recepcao_observacoes": "Setor de maior visibilidade. Implementação imediata recomendada.",
  
  "setores_prioritarios": "1. Recepção, 2. Quartos, 3. Banheiros",
  "economia_estimada": "R$ 8.500/mês",
  "investimento_mensal": "R$ 18.000",
  "economia_mensal": "R$ 8.500",
  "roi_meses": "4.7 meses",
  "beneficios_adicionais": "Redução de 70% no tempo de limpeza, Segurança para hóspedes (produtos não-tóxicos), Sustentabilidade (certificação LEED)",
  "proximos_passos": "1. Apresentação da proposta formal à diretoria (semana de 04/11)\n2. Teste piloto em 50 quartos durante 15 dias\n3. Treinamento intensivo da equipe de governança\n4. Implementação gradual em todos os setores (90 dias)",
  "observacoes_finais": "Hotel demonstrou excelente receptividade. Gerente de Governança muito entusiasmada com os resultados dos testes. Oportunidade confirmada de implementação em Q4/2025. Follow-up agendado para 05/11.",
  "viabilidade_geral": "Alta Viabilidade - Implementação Recomendada",
  "assinatura_consultor": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  "assinatura_hotel": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
}
```

---

## 🚀 Testando

### 1. Reiniciar o backend:
```bash
cd backend
npm start
```

### 2. Criar uma submissão de teste via API ou frontend

### 3. Exportar o PDF:
```bash
curl http://localhost:5001/api/forms-export/submissions/SEU_SUBMISSION_ID/pdf \
  -H "Authorization: Bearer SEU_TOKEN" \
  > teste-hotelaria.pdf
```

### 4. Abrir o PDF gerado e verificar:
- ✅ Cabeçalho profissional
- ✅ Todas as seções presentes
- ✅ Uma página por setor (10 setores)
- ✅ Página de conclusão
- ✅ Assinaturas
- ✅ Rodapé com data

---

## 📝 Notas

1. **Assinaturas**: Suportam Data URLs (base64) ou URLs de imagens
2. **Ícones**: Emojis são usados para facilitar identificação visual
3. **Cores**: Sistema de cores indica prioridade/viabilidade
4. **Paginação**: Automática, cada setor em uma página própria
5. **Normalização**: Valores vazios aparecem como "—"

---

## 🐛 Troubleshooting

### PDF não gera:
- Verificar se o título do formulário contém "hotelaria"
- Verificar se a submissão existe
- Verificar logs do backend

### Campos vazios no PDF:
- Verificar nomenclatura dos campos na submissão
- Seguir exatamente os nomes de campo especificados acima

### Assinaturas não aparecem:
- Verificar formato da assinatura (Data URL base64 ou URL válida)
- Verificar se o campo `assinatura_consultor` e `assinatura_hotel` estão preenchidos

---

**Desenvolvido para Clean & Health Soluções**  
**Data:** 29/10/2025

