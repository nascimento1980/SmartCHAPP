# Sistema de M\u00faltiplas Logos - SmartCHAPP

## Vis\u00e3o Geral

O SmartCHAPP agora suporta m\u00faltiplas vers\u00f5es da logo da empresa para uso em diferentes fundos. Isso garante que a logo sempre seja vis\u00edvel e profissional, independentemente da cor de fundo utilizada nos PDFs.

## Tipos de Logo

O sistema suporta 5 tipos de logo:

1. **Logo Principal (Legado)** - `logoData` / `logoMime`
   - Logo antiga, mantida por compatibilidade
   - Usado como fallback se nenhuma logo espec\u00edfica for encontrada

2. **Logo para Fundo Branco** - `logoWhiteBgData` / `logoWhiteBgMime`
   - Logo colorida principal
   - Usa as cores da marca
   - Ideal para documentos com fundo branco

3. **Logo para Fundo Azul** - `logoBlueBgData` / `logoBlueBgMime`
   - Logo negativa (geralmente branca)
   - Otimizada para fundos azuis
   - Usa `companySecondaryColor`

4. **Logo para Fundo Verde** - `logoGreenBgData` / `logoGreenBgData`
   - Logo negativa (geralmente branca)
   - Otimizada para fundos verdes
   - Usa `companyPrimaryColor`

5. **Logo para Fundo Preto** - `logoBlackBgData` / `logoBlackBgMime`
   - Logo negativa (geralmente branca)
   - Otimizada para fundos pretos/escuros

## Estrutura do Banco de Dados

### Modelo CompanySetting

```javascript
// Campos adicionados ao modelo CompanySetting.js
logoWhiteBgMime: DataTypes.STRING
logoWhiteBgData: DataTypes.BLOB

logoBlueBgMime: DataTypes.STRING
logoBlueBgData: DataTypes.BLOB

logoGreenBgMime: DataTypes.STRING
logoGreenBgData: DataTypes.BLOB

logoBlackBgMime: DataTypes.STRING
logoBlackBgData: DataTypes.BLOB
```

## Endpoints da API

### Upload de Logos

- `POST /api/settings/company/logo` - Logo principal (legado)
- `POST /api/settings/company/logo/white-bg` - Logo para fundo branco
- `POST /api/settings/company/logo/blue-bg` - Logo para fundo azul
- `POST /api/settings/company/logo/green-bg` - Logo para fundo verde
- `POST /api/settings/company/logo/black-bg` - Logo para fundo preto

**Payload:**
```json
{
  "fileBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA...",
  "filename": "logo.png"
}
```

### Recupera\u00e7\u00e3o de Logos

- `GET /api/settings/company/logo` - Logo principal (legado)
- `GET /api/settings/company/logo/white-bg` - Logo para fundo branco
- `GET /api/settings/company/logo/blue-bg` - Logo para fundo azul
- `GET /api/settings/company/logo/green-bg` - Logo para fundo verde
- `GET /api/settings/company/logo/black-bg` - Logo para fundo preto

**Resposta:** Arquivo bin\u00e1rio da imagem com Content-Type apropriado

## Frontend - Configura\u00e7\u00f5es

### Localiza\u00e7\u00e3o
`frontend/src/pages/SettingsPage.jsx` - Aba "Dados da Empresa"

### Interface de Upload

A interface foi reorganizada para incluir:

1. **Se\u00e7\u00e3o "Logos da Empresa"**
   - Bot\u00e3o de upload para cada tipo de logo
   - Pr\u00e9-visualiza\u00e7\u00e3o com fundo da cor correspondente
   - Descri\u00e7\u00f5es claras de uso

2. **Se\u00e7\u00e3o "Cores da Marca"**
   - Cor prim\u00e1ria (verde)
   - Cor secund\u00e1ria (azul)
   - Usadas nos fundos das pr\u00e9-visualiza\u00e7\u00f5es

## L\u00f3gica de Sele\u00e7\u00e3o Autom\u00e1tica

### Backend - PDF Export

Arquivo: `backend/src/routes/forms-export.js`

#### Fun\u00e7\u00e3o `getLogoForBackground(bgColor)`

Esta fun\u00e7\u00e3o detecta automaticamente qual logo usar baseada na cor de fundo:

```javascript
const getLogoForBackground = (bgColor) => {
  if (!bgColor) return logos.logo || null
  
  const color = bgColor.toLowerCase()
  
  // Detectar se \u00e9 fundo azul
  if (color.includes('blue') || 
      (color.match(/#[0-9a-f]{6}/) && 
       parseInt(color.replace('#', '').substring(2, 4), 16) > 
       parseInt(color.replace('#', '').substring(0, 2), 16))) {
    return logos.logoBlueBg || logos.logo || null
  }
  
  // Detectar se \u00e9 fundo verde
  if (color.includes('green') || 
      (color.match(/#[0-9a-f]{6}/) &&
       parseInt(color.replace('#', '').substring(2, 4), 16) > 100)) {
    return logos.logoGreenBg || logos.logo || null
  }
  
  // Detectar se \u00e9 fundo preto/escuro
  if (color.includes('black') || 
      color === '#000000' || 
      color === '#000' ||
      (color.match(/#[0-9a-f]{6}/) && 
       parseInt(color.replace('#', ''), 16) < 0x333333)) {
    return logos.logoBlackBg || logos.logo || null
  }
  
  // Padr\u00e3o: fundo branco (logo colorida)
  return logos.logoWhiteBg || logos.logo || null
}
```

#### Fun\u00e7\u00e3o `drawCompanyHeader(pageTitle, bgColor)`

Fun\u00e7\u00e3o universal para desenhar cabe\u00e7alho em qualquer p\u00e1gina:

- Aceita cor de fundo opcional (`bgColor`)
- Usa `companyPrimaryColor` por padr\u00e3o
- Seleciona logo automaticamente via `getLogoForBackground()`
- Desenha logo ou nome da empresa
- Inclui informa\u00e7\u00f5es de contato (CNPJ, Telefone, Email)

#### Fun\u00e7\u00e3o `drawCompanyFooter()`

Fun\u00e7\u00e3o universal para rodap\u00e9 de p\u00e1gina:

- Linha superior com cor prim\u00e1ria
- Nome da empresa
- Raz\u00e3o social e CNPJ
- Endere\u00e7o completo
- Contatos (Telefone, Email, Site)
- Data/hora de emiss\u00e3o
- "Documento Confidencial"

## Uso em PDFs

### Exemplo de Implementa\u00e7\u00e3o

```javascript
// In\u00edcio do PDF
drawCompanyHeader('CHECKLIST HOTELARIA') // Usa cor prim\u00e1ria por padr\u00e3o

// ... conte\u00fado do PDF ...

// Nova p\u00e1gina com cor diferente
doc.addPage()
drawCompanyHeader('CONCLUS\u00c3O', '#1976D2') // Usa cor azul especificada

// ... mais conte\u00fado ...

// Final do PDF
drawCompanyFooter()
doc.end()
```

## Modelos de PDF Personalizados

### PDFs J\u00e1 Implementados

1. **Checklist Mestre de Diagn\u00f3stico e Viabilidade (Hotelaria)**
   - Identifica\u00e7\u00e3o: `form.title.toLowerCase().includes('mestre') && form.title.toLowerCase().includes('hotelaria')`
   - P\u00e1ginas m\u00faltiplas com an\u00e1lise detalhada de setores
   - Conclus\u00e3o com classifica\u00e7\u00e3o de viabilidade

2. **Formul\u00e1rio SMART de Higieniza\u00e7\u00e3o**
   - Identifica\u00e7\u00e3o: `form.title.toLowerCase().includes('smart de higieniza')`
   - Layout t\u00e9cnico-comercial
   - Tabelas de avalia\u00e7\u00e3o

### PDFs Pendentes de Implementa\u00e7\u00e3o

3. **Checklist SMART Hotelaria - Envio Direto**
4. **Checklist de Instala\u00e7\u00e3o - NTI NC100 CP PLUS**
5. **Checklist de Limpeza Industrial**
6. **Auditoria de Higieniza\u00e7\u00e3o Hospitalar**

## Migra\u00e7\u00e3o de Dados

### Se voc\u00ea j\u00e1 tem uma logo cadastrada

A logo principal (legado) continua funcionando como fallback. Para uma apresenta\u00e7\u00e3o profissional:

1. Acesse **Configura\u00e7\u00f5es > Dados da Empresa**
2. Fa\u00e7a upload das logos espec\u00edficas para cada fundo
3. Use vers\u00f5es negativas (brancas) para fundos azul, verde e preto
4. Use a logo colorida para fundo branco

### Recomenda\u00e7\u00f5es de Design

- **Logo para Fundo Branco**: Vers\u00e3o colorida completa
- **Logo para Fundos Coloridos/Escuros**: Vers\u00e3o em branco (negativa)
- **Formato**: PNG com fundo transparente \u00e9 o ideal
- **Tamanho**: M\u00ednimo 400x150px, m\u00e1ximo 2000x800px
- **Propor\u00e7\u00e3o**: Prefira horizontal (landscape) para melhor encaixe

## Testes

### Como Testar

1. **Upload das Logos**
   - Acesse Configura\u00e7\u00f5es > Dados da Empresa
   - Fa\u00e7a upload de cada tipo de logo
   - Verifique pr\u00e9-visualiza\u00e7\u00f5es

2. **Gera\u00e7\u00e3o de PDF**
   - Preencha um formul\u00e1rio (ex: Checklist Hotelaria)
   - Clique no bot\u00e3o PDF
   - Verifique se a logo aparece corretamente no cabe\u00e7alho
   - Verifique se as cores da empresa est\u00e3o aplicadas

3. **Teste com Diferentes Cores**
   - Altere as cores prim\u00e1ria e secund\u00e1ria
   - Gere novos PDFs
   - Confirme que a logo apropriada \u00e9 selecionada

## Troubleshooting

### Logo n\u00e3o aparece no PDF

1. Verifique se a logo foi enviada corretamente em Configura\u00e7\u00f5es
2. Teste o endpoint GET correspondente (ex: `/api/settings/company/logo/white-bg`)
3. Verifique os logs do backend para erros de renderiza\u00e7\u00e3o
4. Se nenhuma logo espec\u00edfica existir, o sistema usar\u00e1 a logo principal ou o nome da empresa

### Logo aparece distorcida

- Ajuste as dimens\u00f5es na fun\u00e7\u00e3o `drawCompanyHeader`:
  ```javascript
  doc.image(logoBuffer, PAGE.left + 10, PAGE.top - 30, { 
    width: 100, 
    height: 35, 
    fit: [100, 35] 
  })
  ```

### Cores incorretas

1. Verifique se `companyPrimaryColor` e `companySecondaryColor` est\u00e3o salvos
2. Use o formato hexadecimal (#RRGGBB)
3. Reinicie o backend ap\u00f3s alterar cores

## Pr\u00f3ximos Passos

1. Implementar os PDFs personalizados restantes
2. Adicionar op\u00e7\u00e3o de escolher cor do cabe\u00e7alho por formul\u00e1rio
3. Permitir posi\u00e7\u00e3o customizada da logo
4. Adicionar marca d'\u00e1gua opcional
5. Suporte a m\u00faltiplas marcas (franquias/filiais)

## Autores e Manuten\u00e7\u00e3o

- **Data de Cria\u00e7\u00e3o**: Outubro 2025
- **\u00daltima Atualiza\u00e7\u00e3o**: Outubro 2025
- **Vers\u00e3o**: 1.0.0

