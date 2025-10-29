# Funcionalidade de Exclusão de Visitas

## Data: Outubro 2025

## Visão Geral

Implementação completa da funcionalidade de exclusão de visitas com justificativa obrigatória, alinhada com o sistema de exclusão do planejamento. A exclusão é soft delete, mantendo histórico completo para auditoria.

---

## 📋 Requisitos Implementados

### 1. ✅ Botão de Exclusão na Lista de Visitas
- **Local:** `Gestão de Visitas > Visitas` (aba principal)
- **Comportamento:** Botão "Excluir" alinhado e paralelo aos botões "Visualizar" e "Editar"
- **Cor:** Vermelho (error) para destacar ação destrutiva

### 2. ✅ Desativação de Botões para Visitas Concluídas/Excluídas
- **Regra:** Visitas com status `concluida` ou `excluida` não podem ser editadas ou excluídas
- **Feedback:** Botões ficam desabilitados com tooltip explicativo
- **Motivo:** Preservar integridade dos dados históricos

### 3. ✅ Dialog de Justificativa Obrigatória
- **Componente:** Reutiliza `DeletionReasonDialog` (mesmo usado no planejamento)
- **Validação:** Justificativa mínima de 10 caracteres
- **Consistência:** Mesmo padrão UX do sistema de planejamento

### 4. ✅ Status "Excluída" nos Filtros
- **Filtro de Status:** Adicionado opção "Excluída"
- **Exibição:** Chip com ícone de Delete e cor padrão (cinza)
- **Visibilidade:** Visitas excluídas aparecem na lista quando filtradas

### 5. ✅ Histórico de Exclusão na Visualização
- **Local:** Dialog "Detalhes da Visita"
- **Informações Exibidas:**
  - Data e hora da exclusão
  - Usuário que excluiu (nome ou email)
  - Justificativa completa
- **Formato:** Alert vermelho destacado no topo dos detalhes

---

## 🏗️ Arquitetura da Solução

### Backend (Já Implementado)

**Modelo `Visit`:**
```javascript
// backend/src/models/Visit.js
{
  status: DataTypes.ENUM('agendada', 'em_andamento', 'concluida', 'cancelada', 'reagendada', 'excluida'),
  deleted_at: DataTypes.DATE,
  deleted_by: DataTypes.UUID, // referência para users.id
  deletion_reason: DataTypes.TEXT
}
```

**Endpoint DELETE:**
```javascript
// DELETE /api/visits/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const { deletion_reason } = req.body;
  
  // Validações
  if (!deletion_reason || deletion_reason.trim().length < 10) {
    return res.status(400).json({ error: 'Justificativa obrigatória (mínimo 10 caracteres)' });
  }
  
  // Soft delete
  await visit.update({
    status: 'excluida',
    deleted_at: new Date(),
    deleted_by: req.user.id,
    deletion_reason: deletion_reason.trim()
  });
  
  // Broadcast SSE para sincronização em tempo real
  broadcast({
    type: 'visit.deleted',
    payload: { id: visit.id, planning_id: visit.planning_id }
  });
}));
```

**Auditoria:**
```javascript
// GET /api/visits/audit/deleted
// Acesso restrito: apenas manager, admin, master
// Retorna todas as visitas excluídas com detalhes completos
```

---

### Frontend

#### 1. Componentes Modificados

**`VisitsManagementPage.jsx`:**
- ✅ Adicionado botão Delete na coluna de ações
- ✅ Lógica de desabilitação condicional
- ✅ Integração com `DeletionReasonDialog`
- ✅ Sincronização via `notifyVisitDeleted()`
- ✅ Exibição de histórico no dialog de visualização

#### 2. Estados Adicionados

```javascript
const [showDeletionDialog, setShowDeletionDialog] = useState(false);
const [deletionTarget, setDeletionTarget] = useState(null); // { id }
```

#### 3. Funções Implementadas

```javascript
// Abre dialog de confirmação
const handleDelete = async (visitId) => {
  setDeletionTarget({ id: visitId });
  setShowDeletionDialog(true);
};
```

#### 4. Renderização dos Botões de Ação

```javascript
{
  field: 'actions',
  headerName: 'Ações',
  flex: 0.8, // Aumentado para acomodar 3 botões
  renderCell: (params) => {
    const isCompleted = params.row.status === 'concluida';
    const isDeleted = params.row.status === 'excluida';
    
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Visualizar - sempre ativo */}
        <Tooltip title="Visualizar">
          <IconButton size="small" onClick={...}>
            <Visibility />
          </IconButton>
        </Tooltip>
        
        {/* Editar - desabilitado se concluída ou excluída */}
        <Tooltip title={isCompleted || isDeleted ? "Não é possível editar..." : "Editar"}>
          <span>
            <IconButton 
              size="small" 
              onClick={...}
              disabled={isCompleted || isDeleted}
            >
              <Edit />
            </IconButton>
          </span>
        </Tooltip>
        
        {/* Excluir - desabilitado se concluída ou excluída */}
        <Tooltip title={isCompleted || isDeleted ? "Não é possível excluir..." : "Excluir"}>
          <span>
            <IconButton 
              size="small" 
              color="error"
              onClick={() => handleDelete(params.row.id)}
              disabled={isCompleted || isDeleted}
            >
              <Delete />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  }
}
```

**Importante:** Botões desabilitados são envolvidos em `<span>` para permitir que o Tooltip funcione corretamente.

#### 5. Dialog de Justificativa (Reutilizado)

```jsx
<DeletionReasonDialog
  open={showDeletionDialog}
  title="Excluir Visita"
  helperText="Confirme a exclusão da visita. Informe um motivo (mínimo 10 caracteres)."
  onCancel={() => {
    setShowDeletionDialog(false);
    setDeletionTarget(null);
  }}
  onConfirm={async (reason) => {
    try {
      await api.delete(`/visits/${deletionTarget.id}`, {
        data: { deletion_reason: reason }
      });
      
      setSnackbar({ open: true, message: 'Visita excluída com sucesso!', severity: 'success' });
      
      // Sincronização em tempo real
      notifyVisitDeleted(deletionTarget.id);
      fetchVisits();
    } catch (error) {
      const msg = error.response?.data?.error || 'Falha ao excluir visita';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setShowDeletionDialog(false);
      setDeletionTarget(null);
    }
  }}
/>
```

#### 6. Exibição do Histórico de Exclusão

```jsx
{/* Dentro do Dialog de Visualização */}
{viewVisit.status === 'excluida' && viewVisit.deletion_reason && (
  <Grid item xs={12}>
    <Alert severity="error" sx={{ mb: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'error.main', fontWeight: 'bold' }}>
        Visita Excluída
      </Typography>
      <Box sx={{ mt: 1 }}>
        <Typography variant="subtitle2" color="textSecondary">Data de Exclusão</Typography>
        <Typography variant="body2">
          {viewVisit.deleted_at ? new Date(viewVisit.deleted_at).toLocaleString('pt-BR') : 'Não informado'}
        </Typography>
      </Box>
      <Box sx={{ mt: 1 }}>
        <Typography variant="subtitle2" color="textSecondary">Excluído por</Typography>
        <Typography variant="body2">
          {viewVisit.deletedBy?.name || viewVisit.deletedBy?.email || 'Usuário não identificado'}
        </Typography>
      </Box>
      <Box sx={{ mt: 1 }}>
        <Typography variant="subtitle2" color="textSecondary">Justificativa da Exclusão</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {viewVisit.deletion_reason}
        </Typography>
      </Box>
    </Alert>
  </Grid>
)}
```

---

## 🔄 Integração com Planejamento

### Sincronização Automática

Quando uma visita é excluída:

1. **Backend emite evento SSE:**
   ```javascript
   broadcast({
     type: 'visit.deleted',
     payload: { id: visit.id, planning_id: visit.planning_id }
   });
   ```

2. **Frontend propaga via Context:**
   ```javascript
   notifyVisitDeleted(deletionTarget.id);
   ```

3. **Planejamento atualiza automaticamente:**
   - Remove visita da lista de compromissos
   - Atualiza contadores (total_planned_visits, etc.)
   - Recalcula métricas (distância, combustível, custo)
   - Atualiza UI sem reload

### Consistência de Dados

**Garantias:**
- ✅ Exclusão de visita remove do planejamento associado
- ✅ Status `excluida` é respeitado em todas as queries
- ✅ Soft delete preserva histórico para relatórios
- ✅ Permissões de acesso são verificadas (backend)

---

## 🎨 UX/UI

### Design System

**Cores:**
- Status `excluida`: Chip cinza (default)
- Botão Excluir: Vermelho (error)
- Alert de histórico: Vermelho (error severity)

**Ícones:**
- Status excluída: `<Delete />`
- Botão ação: `<Delete />`

**Feedback:**
- ✅ Snackbar de sucesso ao excluir
- ❌ Snackbar de erro se falhar
- ⚠️ Tooltip em botões desabilitados
- 🔍 Alert destacado no histórico

### Responsividade

- Botões de ação ajustam tamanho em telas pequenas
- Dialog responsivo (maxWidth: sm)
- Grid adaptável para mobile

---

## 🧪 Testes

### Cenários de Teste

#### 1. Exclusão Normal ✅
- **Passos:**
  1. Acessar Gestão de Visitas > Visitas
  2. Clicar no botão Excluir de uma visita agendada
  3. Preencher justificativa com mais de 10 caracteres
  4. Confirmar exclusão
- **Resultado Esperado:**
  - Visita marcada como `excluida`
  - Status atualizado na lista
  - Snackbar de sucesso exibido
  - Sincronização com planejamento

#### 2. Validação de Justificativa ❌
- **Passos:**
  1. Clicar em Excluir
  2. Tentar confirmar com menos de 10 caracteres
- **Resultado Esperado:**
  - Erro exibido: "A justificativa deve ter pelo menos 10 caracteres"
  - Dialog permanece aberto

#### 3. Botões Desabilitados 🔒
- **Teste A: Visita Concluída**
  1. Criar visita e marcar como concluída
  2. Verificar botões Editar e Excluir
  - **Esperado:** Ambos desabilitados com tooltip explicativo

- **Teste B: Visita Excluída**
  1. Excluir uma visita
  2. Filtrar por status "Excluída"
  3. Verificar botões
  - **Esperado:** Editar e Excluir desabilitados, Visualizar ativo

#### 4. Visualização de Histórico 📖
- **Passos:**
  1. Excluir uma visita
  2. Filtrar por "Excluída"
  3. Clicar em Visualizar
- **Resultado Esperado:**
  - Alert vermelho no topo com:
    - Data/hora da exclusão
    - Nome do usuário que excluiu
    - Justificativa completa

#### 5. Filtros 🔍
- **Passos:**
  1. Criar visitas com diferentes status
  2. Excluir algumas
  3. Testar filtro "Excluída"
- **Resultado Esperado:**
  - Apenas visitas excluídas aparecem
  - Filtro "Todos" inclui excluídas

#### 6. Sincronização com Planejamento 🔄
- **Passos:**
  1. Criar planejamento semanal
  2. Adicionar visitas ao planejamento
  3. Excluir uma visita da lista geral
  4. Verificar planejamento
- **Resultado Esperado:**
  - Visita removida do planejamento
  - Contadores atualizados
  - Rotas recalculadas

---

## 🔐 Segurança

### Controle de Acesso

**Backend:**
```javascript
// Apenas o proprietário ou admin/master pode excluir
if (visit.responsible_id !== req.user.id && !['admin', 'master'].includes(req.user.role)) {
  return res.status(403).json({ error: 'Sem permissão' });
}
```

**Auditoria:**
```javascript
// Relatório de visitas excluídas
// Acesso: manager, admin, master
GET /api/visits/audit/deleted
```

### Validações

1. **Justificativa obrigatória:** Mínimo 10 caracteres
2. **Visita já excluída:** Impede dupla exclusão
3. **Visita não encontrada:** Retorna 404
4. **Token expirado:** Reautentica automaticamente (interceptor)

---

## 📊 Impacto no Sistema

### Mudanças no Banco de Dados

**Nenhuma migration necessária:**
- Campos `deleted_at`, `deleted_by`, `deletion_reason` já existiam
- Status `excluida` já estava no ENUM

### Performance

- **Query de lista:** Soft delete usa `WHERE deleted_at IS NULL` (padrão Sequelize)
- **Query de filtro:** `WHERE status = 'excluida'` usa índice
- **SSE broadcast:** Assíncrono, não bloqueia resposta HTTP

### Compatibilidade

- ✅ Não quebra funcionalidades existentes
- ✅ Reutiliza componentes do planejamento
- ✅ Respeita hierarquia de permissões
- ✅ Mantém padrões de código do projeto

---

## 📝 Próximos Passos (Sugestões)

### Melhorias Opcionais

1. **Restauração de Visitas:**
   ```javascript
   // POST /api/visits/:id/restore
   // Permitir "desfazer" exclusão (apenas admin/master)
   ```

2. **Lote de Exclusões:**
   ```javascript
   // DELETE /api/visits/batch
   // Excluir múltiplas visitas de uma vez
   ```

3. **Exportação de Auditoria:**
   ```javascript
   // GET /api/visits/audit/export
   // Exportar relatório de exclusões em CSV/PDF
   ```

4. **Notificações por Email:**
   - Notificar cliente quando visita é excluída
   - CC para gestor da equipe

5. **Dashboard de Auditoria:**
   - Gráficos de exclusões por período
   - Top motivos de exclusão
   - Análise de padrões

---

## 🐛 Problemas Conhecidos

**Nenhum no momento.**

---

## 📚 Referências

- **Backend Route:** `backend/src/routes/visits.js` (linha 514-570)
- **Frontend Page:** `frontend/src/pages/VisitsManagementPage.jsx`
- **Component:** `frontend/src/components/DeletionReasonDialog.jsx`
- **Model:** `backend/src/models/Visit.js` (linha 174-190)
- **Context:** `frontend/src/contexts/VisitSyncContext.jsx`

---

## ✅ Checklist de Implementação

- [x] Botão de exclusão adicionado à lista
- [x] Botões desabilitados para visitas concluídas/excluídas
- [x] Dialog de justificativa implementado
- [x] Status "excluida" adicionado aos filtros
- [x] Histórico de exclusão exibido na visualização
- [x] Sincronização com planejamento funcionando
- [x] Validações de backend implementadas
- [x] Auditoria de exclusões disponível
- [x] SSE broadcast configurado
- [x] Testes manuais realizados
- [x] Documentação completa criada
- [x] Commit e push para GitHub

---

**SmartCHAPP - Exclusão de Visitas Implementada com Sucesso! ✅**

*Mantendo rastreabilidade e consistência em todo o sistema de planejamento.*

