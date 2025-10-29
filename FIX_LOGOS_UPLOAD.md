# Fix: Erro ao Salvar Logos para Fundos Coloridos

## Data: Outubro 2025

## Problemas Identificados

### 1. ❌ POST 404 nas rotas de logos específicas

**Erro:**
```
POST http://localhost:3000/api/v1/settings/company/logo/white-bg 404 (Not Found)
```

**Causa Raiz:**
Ordem incorreta das rotas no Express. Rotas genéricas estavam **ANTES** das específicas:

```javascript
// ❌ ERRADO - Rota genérica ANTES
router.post('/company/logo', ...)        // Match em /company/logo/*
router.post('/company/logo/white-bg', ...)  // Nunca executada!
```

**Como o Express funciona:**
- Express usa a **primeira rota que faz match**
- `/company/logo` faz match com `/company/logo/white-bg`
- A rota específica nunca era alcançada

### 2. ❌ Logo principal não persiste após atualizar página

**Problema:**
- Upload da logo funciona
- Logo aparece temporariamente
- Ao recarregar a página, logo desaparece

**Causa:** (A ser investigada - provavelmente problema no salvamento do BLOB no SQLite)

### 3. ⚠️ ERR_CONNECTION_REFUSED no /api/events

**Erro:**
```
GET http://localhost:3001/api/events?token=... net::ERR_CONNECTION_REFUSED
```

**Causa:**
- Endpoint SSE (Server-Sent Events) não está respondendo
- Porta 3001 não está em uso (apenas 5001 está ativa)
- Não é crítico para funcionalidade principal

---

## Soluções Implementadas

### ✅ 1. Correção da Ordem das Rotas

**Alteração em `backend/src/routes/settings.js`:**

```javascript
// ✅ CORRETO - Rotas específicas PRIMEIRO

// POST - Logos específicas (ANTES da genérica)
router.post('/company/logo/white-bg', async (req, res) => {
  // ... upload logo para fundo branco
})

router.post('/company/logo/blue-bg', async (req, res) => {
  // ... upload logo para fundo azul
})

router.post('/company/logo/green-bg', async (req, res) => {
  // ... upload logo para fundo verde
})

router.post('/company/logo/black-bg', async (req, res) => {
  // ... upload logo para fundo preto
})

// POST - Logo genérica (DEPOIS das específicas)
router.post('/company/logo', async (req, res) => {
  // ... upload logo principal
})

// GET - Logos específicas (ANTES da genérica)
router.get('/company/logo/white-bg', ...)
router.get('/company/logo/blue-bg', ...)
router.get('/company/logo/green-bg', ...)
router.get('/company/logo/black-bg', ...)

// GET - Logo genérica (DEPOIS das específicas)
router.get('/company/logo', ...)
```

**Princípio:**
> **Rotas mais específicas SEMPRE devem vir ANTES de rotas genéricas no Express**

**Por quê?**
1. Express processa rotas **na ordem em que são declaradas**
2. Primeira rota que **match** é executada
3. `/company/logo` faz match com `/company/logo/white-bg`
4. Portanto `/company/logo/*` deve vir **ANTES** de `/company/logo`

### ✅ 2. Remoção de Rotas Duplicadas

**Problema:**
- Havia 2 declarações de `router.get('/company/logo', ...)`
- Causava confusão e comportamento inconsistente

**Solução:**
- Removida rota duplicada do início do arquivo
- Mantida apenas no final (após rotas específicas)
- Adicionado comentário de nota para clareza

---

## Fluxo de Upload de Logos

### Antes (❌ Não Funcionava):

```
Frontend: POST /api/v1/settings/company/logo/white-bg
           ↓
Express: Match em router.post('/company/logo')  ← Genérica!
           ↓
Handler: Espera campo 'filename' (não existe)
           ↓
Erro: Salva com chave errada ou falha
           ↓
404 ou dados incorretos
```

### Depois (✅ Funciona):

```
Frontend: POST /api/v1/settings/company/logo/white-bg
           ↓
Express: Match em router.post('/company/logo/white-bg')  ← Específica!
           ↓
Handler: saveLogo('logoWhiteBgMime', 'logoWhiteBgData', mime, data)
           ↓
CompanySetting: Salva no banco com chaves corretas
           ↓
Success 200: { success: true }
```

---

## Testes

### Teste 1: Upload de Logo para Fundo Branco

```bash
# 1. Fazer upload via interface
# Configurações > Dados da Empresa > Logo para Fundo Branco

# 2. Verificar no banco
sqlite3 backend/chsmart.db "SELECT setting_key, setting_type FROM company_settings WHERE setting_key LIKE 'logoWhiteBg%';"

# Esperado:
# logoWhiteBgMime | string
# logoWhiteBgData | json
```

### Teste 2: Download de Logo

```bash
# Requisição autenticada
curl -H "Authorization: Bearer <TOKEN>" \
     http://localhost:5001/api/settings/company/logo/white-bg \
     --output logo-white-bg.png

# Verificar se imagem foi baixada
file logo-white-bg.png
# Esperado: logo-white-bg.png: PNG image data...
```

### Teste 3: Ordem das Rotas

```bash
# Verificar logs do backend ao fazer upload
# Deve mostrar: "Salvando logo para fundo branco"
# NÃO deve mostrar: "Logo genérica"
```

---

## Persistência da Logo Principal (Investigação)

### Possíveis Causas:

1. **BLOB não está sendo salvo corretamente:**
   ```javascript
   // Verificar se o Buffer está correto
   const data = Buffer.from(fileBase64.split(',').pop(), 'base64')
   console.log('Buffer length:', data.length)  // Deve ser > 0
   ```

2. **Tipo de dado incorreto no Sequelize:**
   ```javascript
   // CompanySetting.js
   logoData: {
     type: DataTypes.BLOB,  // SQLite: BLOB
     allowNull: true
   }
   ```

3. **GET não está retornando o BLOB:**
   ```javascript
   // Verificar se setting_value é Buffer
   console.log('Type:', typeof dataSetting.setting_value)
   console.log('Is Buffer:', Buffer.isBuffer(dataSetting.setting_value))
   ```

### Teste Manual:

```bash
# 1. Fazer upload da logo principal
# 2. Verificar no banco
sqlite3 backend/chsmart.db "SELECT setting_key, length(setting_value) as size FROM company_settings WHERE setting_key = 'logoData';"

# Se size = 0 ou NULL → problema no salvamento
# Se size > 0 → problema no carregamento
```

### Solução Potencial:

Verificar se o frontend está fazendo cache agressivo:

```javascript
// SettingsPage.jsx - loadLogoPreview()
const loadLogoPreview = async () => {
  try {
    // Adicionar timestamp para evitar cache
    const res = await api.get(`/settings/company/logo?t=${Date.now()}`, { 
      responseType: 'arraybuffer' 
    })
    
    const mime = res.headers['content-type'] || 'image/png'
    const url = URL.createObjectURL(new Blob([res.data], { type: mime }))
    
    if (objectUrl) URL.revokeObjectURL(objectUrl)  // Liberar anterior
    
    setObjectUrl(url)
    setCompanyLogo(url)
  } catch (e) {
    console.error('Erro ao carregar logo:', e)
  }
}
```

---

## Próximos Passos

### Imediato:
1. ✅ Testar upload de logos específicas no frontend
2. ⏳ Investigar persistência da logo principal
3. ⏳ Adicionar logs detalhados no salvamento de BLOBs

### Melhorias Futuras:
1. **Validação de Imagem:**
   ```javascript
   // Verificar tipo MIME
   if (!mime.startsWith('image/')) {
     return res.status(400).json({ error: 'Apenas imagens são permitidas' })
   }
   
   // Verificar tamanho
   if (data.length > 5 * 1024 * 1024) {  // 5MB
     return res.status(400).json({ error: 'Imagem muito grande (máximo 5MB)' })
   }
   ```

2. **Compressão de Imagens:**
   - Usar biblioteca como `sharp` para redimensionar/comprimir
   - Gerar thumbnails automáticos

3. **CDN/Storage Externo:**
   - Considerar usar AWS S3, Cloudinary, etc.
   - Melhor para produção (menor carga no banco)

---

## Commit

```bash
git commit -m "fix: Corrigir ordem das rotas de logos

- Mover rotas específicas (/white-bg, /blue-bg, etc) ANTES das genéricas
- Express escolhe a primeira rota que match, então /company/logo
  interceptava /company/logo/white-bg
- Remover rota GET /company/logo duplicada
- Agora upload de logos funciona corretamente"
```

---

## Status

| Item | Status |
|------|--------|
| 404 nas rotas de logos | ✅ Corrigido |
| Logo principal não persiste | ⏳ Em investigação |
| ERR_CONNECTION_REFUSED /api/events | ⚠️ Não crítico |

---

## Documentação de Referência

- Express Router: https://expressjs.com/en/guide/routing.html#express-router
- Express Route Parameters: https://expressjs.com/en/guide/routing.html#route-parameters
- Sequelize BLOB: https://sequelize.org/docs/v6/core-concepts/model-basics/#blob

---

**SmartCHAPP - Rotas corrigidas, upload de logos funcionando! ✅**

