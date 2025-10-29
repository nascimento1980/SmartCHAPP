import React, { useMemo, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Grid,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Button,
  Alert
} from '@mui/material'
import api from '../services/api'

// Mapa de perguntas por segmento e estágio do pipeline
// Mantemos enxuto e focado na execução por telemarketing
const questionsConfig = {
  geral: {
    novo: [
      { name: 'objetivo_principal', label: 'Objetivo principal', type: 'text', required: true },
      { name: 'decisor', label: 'Decisor (nome/cargo)', type: 'text' },
      { name: 'area_aplicacao', label: 'Área de aplicação', type: 'text' },
      { name: 'volume_frequencia', label: 'Volume / Frequência de uso', type: 'text' },
      { name: 'requisitos', label: 'Requisitos (ex.: fragrância, hospitalar, biodegradável)', type: 'text' },
      { name: 'faixa_orcamento', label: 'Faixa de orçamento', type: 'text' }
    ],
    contatado: [
      { name: 'confirmou_interesse', label: 'Confirmou interesse?', type: 'select', options: ['Sim', 'Não', 'A avaliar'], required: true },
      { name: 'objeções', label: 'Objeções levantadas', type: 'text' },
      { name: 'proximo_passo', label: 'Próximo passo sugerido', type: 'select', options: ['Demonstração', 'Amostra', 'Visita técnica', 'Retorno por email/whats'] }
    ],
    qualificado: [
      { name: 'criterios_tecnicos', label: 'Critérios técnicos chave', type: 'text' },
      { name: 'tco_prazo', label: 'TCO/Prazo esperado', type: 'text' },
      { name: 'aprovadores', label: 'Aprovadores envolvidos', type: 'text' }
    ],
    proposta_enviada: [
      { name: 'avaliou_proposta', label: 'Avaliou proposta?', type: 'select', options: ['Sim', 'Não', 'Parcial'], required: true },
      { name: 'ajustes_necessarios', label: 'Ajustes necessários', type: 'text' }
    ],
    negociacao: [
      { name: 'pontos_negociacao', label: 'Pontos de negociação (preço, prazo, condições)', type: 'text' },
      { name: 'chance_fechamento', label: 'Chance de fechamento (%)', type: 'number' }
    ]
  },
  condominios: {
    novo: [
      { name: 'areas', label: 'Áreas (ex.: área comum, salão, piscina, garagem)', type: 'text', required: true },
      { name: 'metragem', label: 'Metragem aproximada (m²)', type: 'number' },
      { name: 'rotina_limpeza', label: 'Rotina atual de limpeza', type: 'text' }
    ]
  },
  hotelaria: {
    novo: [
      { name: 'setores', label: 'Setores (UH, A&B, áreas comuns, lavanderia)', type: 'text', required: true },
      { name: 'ocupacao_media', label: 'Ocupação média (%)', type: 'number' },
      { name: 'exigencias', label: 'Exigências sanitárias/qualidade', type: 'text' }
    ]
  },
  restaurantes: {
    novo: [
      { name: 'cozinha_salao', label: 'Cozinha e salão — pontos críticos', type: 'text', required: true },
      { name: 'volume_refeicoes', label: 'Volume de refeições/dia', type: 'number' }
    ]
  },
  industria: {
    novo: [
      { name: 'linha_producao', label: 'Linha/área de produção principal', type: 'text', required: true },
      { name: 'ppe_bpf', label: 'Requisitos PPE/BPF', type: 'text' }
    ]
  },
  hospitais: {
    novo: [
      { name: 'setores_criticos', label: 'Setores críticos (ex.: UTI, CME)', type: 'text', required: true },
      { name: 'protocolos', label: 'Protocolos/laudos exigidos', type: 'text' }
    ]
  },
  escolas: {
    novo: [
      { name: 'ambientes', label: 'Ambientes (salas, refeitório, sanitários, quadras)', type: 'text', required: true },
      { name: 'alunos', label: 'Nº de alunos', type: 'number' }
    ]
  },
  shopping_centers: {
    novo: [
      { name: 'areas_mall', label: 'Áreas (mall, sanitários, praça alimentação)', type: 'text', required: true },
      { name: 'fluxo', label: 'Fluxo médio diário', type: 'number' }
    ]
  },
  cozinhas_industriais: {
    novo: [
      { name: 'volume_producao', label: 'Volume de produção (refeições/dia)', type: 'number', required: true },
      { name: 'exigencias_haccp', label: 'Exigências (HACCP/APPCC)', type: 'text' }
    ]
  }
}

const defaultStagesOrder = ['novo', 'contatado', 'qualificado', 'agendado', 'visitado', 'proposta_enviada', 'negociacao']

const getQuestionsFor = (segment, stage) => {
  const segKey = (segment || 'geral').toLowerCase()
  const stageKey = (stage || 'novo').toLowerCase()
  const segQuestions = questionsConfig[segKey]?.[stageKey] || []
  const generic = questionsConfig.geral[stageKey] || []
  // concatena específicas + genéricas, evitando duplicar names
  const seen = new Set()
  const merged = [...segQuestions, ...generic].filter(q => {
    if (seen.has(q.name)) return false
    seen.add(q.name)
    return true
  })
  return merged
}

const buildScriptSummary = ({
  leadName,
  companyName,
  segment,
  stage,
  answers
}) => {
  const nome = leadName || 'Contato'
  const empresa = companyName || 'empresa'
  const segmento = segment || 'segmento'
  const linhas = Object.entries(answers).map(([k, v]) => `- ${k}: ${v ?? ''}`)
  return `Ligação — ${empresa} (${segmento}) — estágio: ${stage}\n\nResumo respostas:\n${linhas.join('\n')}`
}

const SegmentContactForm = ({
  open,
  onClose,
  context,
  onSuccess
}) => {
  const { leadId, leadName, companyName, segment, stage } = context || {}
  const [answers, setAnswers] = useState({})
  const [outcome, setOutcome] = useState('')
  const [nextContactAt, setNextContactAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const questions = useMemo(() => getQuestionsFor(segment, stage), [segment, stage])

  const handleChange = (name, value) => {
    setAnswers(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    if (!leadId) return
    try {
      setSubmitting(true)
      setError('')
      const content = buildScriptSummary({ leadName, companyName, segment, stage, answers })
      await api.post(`/leads/${leadId}/activities`, {
        channel: 'call',
        subject: `Atendimento — ${companyName || 'Lead'}`,
        content,
        outcome: outcome || null,
        next_contact_at: nextContactAt || null,
        stage: stage || null,
        form_responses: answers,
        script_context: {
          segment: segment || 'geral',
          pipeline_stage: stage || 'novo',
          source: 'SegmentContactForm'
        },
        call_details: {
          objective: answers.objetivo_principal || null,
          decision_maker: answers.decisor || null,
          need_confirmed: undefined,
          budget_range: answers.faixa_orcamento || null,
          timeline: null,
          objections: answers['objeções'] || null,
          next_step: answers.proximo_passo || null,
          duration_seconds: null
        }
      })
      onSuccess && onSuccess()
      onClose && onClose()
    } catch (e) {
      setError('Erro ao registrar atendimento')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Formulário de Atendimento — {companyName || 'Lead'} ({stage})</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Segmento: {segment} • Estágio: {stage}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {questions.map((q) => (
            <Grid key={q.name} item xs={12} md={q.type === 'textarea' ? 12 : 6}>
              {q.type === 'select' ? (
                <FormControl fullWidth>
                  <InputLabel>{q.label}</InputLabel>
                  <Select
                    label={q.label}
                    value={answers[q.name] ?? ''}
                    onChange={(e) => handleChange(q.name, e.target.value)}
                  >
                    <MenuItem value="" disabled>Selecione</MenuItem>
                    {(q.options || []).map(opt => (
                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : q.type === 'checkbox' ? (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(answers[q.name])}
                      onChange={(e) => handleChange(q.name, e.target.checked)}
                    />
                  }
                  label={q.label}
                />
              ) : (
                <TextField
                  fullWidth
                  type={q.type === 'number' ? 'number' : 'text'}
                  label={q.label}
                  value={answers[q.name] ?? ''}
                  onChange={(e) => handleChange(q.name, e.target.value)}
                />
              )}
            </Grid>
          ))}

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Resultado/Observação"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Próximo contato (aaaa-mm-dd hh:mm)"
              placeholder="2025-08-10 15:00"
              value={nextContactAt}
              onChange={(e) => setNextContactAt(e.target.value)}
            />
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Salvando...' : 'Registrar atendimento'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SegmentContactForm



