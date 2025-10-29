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
  FormControlLabel,
  Checkbox,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  Radio,
  FormLabel
} from '@mui/material'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const SCRIPT_DATA = {
  versao: '2.0',
  data_criacao: '2025-08-09',
  empresa: 'Clean & Health Soluções',
  territorio: 'Maranhão, Ceará e Piauí',
  representacao: 'Distribuidora e Representante Oficial Spartanbrasil',
  metodologia: 'Sistema SMART',
  objetivo: 'conversao_leads_alta_performance',
  abertura_profissional: {
    saudacao: 'Bom dia/Boa tarde! Meu nome é [NOME], sou consultor da Clean & Health Soluções, distribuidora e representante oficial da Spartanbrasil nos estados do Maranhão, Ceará e Piauí.',
    credibilidade: 'Trabalhamos há mais de [ANOS] transformando a gestão de limpeza e higienização de empresas através do nosso Sistema SMART - uma metodologia exclusiva que garante resultados mensuráveis.',
    hook_interesse: 'Estou entrando em contato porque identificamos que a [NOME_EMPRESA] pode reduzir até 40% dos custos com limpeza mantendo padrões superiores de qualidade. Posso explicar como em poucos minutos?',
    permissao: 'O(a) senhor(a) tem 5 minutinhos para eu apresentar nossa metodologia?'
  },
  qualificacao_smart: {
    dimensionamento: {
      argumentos_por_porte: {
        pequena_empresa: 'Para empresas do seu porte, o Sistema SMART é ainda mais impactante, pois cada real economizado faz diferença real no resultado.',
        media_empresa: 'Empresas como a sua são o perfil ideal para o Sistema SMART - já têm estrutura, mas ainda podem otimizar muito os processos.',
        grande_empresa: 'Para operações do porte de vocês, o Sistema SMART pode representar milhares de reais economizados mensalmente.'
      }
    },
    mapeamento_segmento: {
      smart_por_segmento: {
        hospitalar: "No segmento hospitalar, nosso Sistema SMART é fundamental - principalmente o 'M' de Máxima Segurança Microbiológica, que é crítico para controle de infecções.",
        alimenticio: 'Para o setor alimentício, o Sistema SMART garante compliance total com vigilância sanitária, especialmente na Segurança e Máxima Proteção Microbiológica.',
        industrial: "Na indústria, o 'A' de Alta Performance do nosso sistema brilha - produtos que removem óleos pesados e mantêm equipamentos protegidos.",
        educacional: 'Em ambiente educacional, focamos na Segurança do sistema SMART - produtos seguros para crianças sem perder eficácia.',
        corporativo: 'Para escritórios, o Sistema SMART otimiza custos e mantém ambiente profissional impecável com produtos de Alta Performance.'
      }
    }
  },
  tratamento_objecoes_smart: {
    ja_tenho_fornecedor_satisfeito: {
      resposta: 'Ótimo! Satisfação é importante. Mas me permita uma pergunta: seu fornecedor atual oferece um sistema estruturado como o SMART? Com garantia de ROI mensurado? Que tal testarmos sem compromisso e compararmos os resultados lado a lado?'
    },
    preco_alto_economia: {
      resposta: "Entendo a preocupação com investimento. Mas vamos raciocinar: se você gasta R$ [VALOR_ATUAL] e o Sistema SMART reduz isso para R$ [VALOR_NOVO], o 'preço' na verdade é uma RECEITA de R$ [ECONOMIA]. O produto se paga sozinho!"
    }
  }
}

const steps = ['Abertura', 'Qualificação', 'Diagnóstico', 'Apresentação SMART', 'ROI & Proposta', 'Fechamento', 'Resumo']

const SmartCallScript = ({ open, onClose, context, onSuccess }) => {
  const { user } = useAuth()
  const { leadId, leadName, companyName, segment, stage } = context || {}
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activeStep, setActiveStep] = useState(0)

  // Campos principais do roteiro
  const [consultorNome, setConsultorNome] = useState('')
  const [anos, setAnos] = useState('')
  const [colaboradores, setColaboradores] = useState('')
  const [gastoMensal, setGastoMensal] = useState('')
  // removidos: horasLimpeza, valorHora
  const [decisor, setDecisor] = useState(true)
  const [decisorNome, setDecisorNome] = useState('')
  const [temFornecedorFixo, setTemFornecedorFixo] = useState(false)
  const [satisfacaoAtual, setSatisfacaoAtual] = useState('')
  const [controleMicro, setControleMicro] = useState(false)
  // removido: custoM2Conhecido
  const [observacoes, setObservacoes] = useState('')
  const [temSustentabilidade, setTemSustentabilidade] = useState(false)
  const [equipeTreinada, setEquipeTreinada] = useState(false)
  const [performanceIssues, setPerformanceIssues] = useState('')
  const [interestLevel, setInterestLevel] = useState('medio') // alto | medio | baixo
  const [objectionsText, setObjectionsText] = useState('')
  const [nextContactAt, setNextContactAt] = useState('')
  // Fluxo: TEM TEMPO?
  const [hasTimeNow, setHasTimeNow] = useState('sim') // 'sim' | 'nao'
  const [rescheduleWhen, setRescheduleWhen] = useState('')
  const [materialsEmail, setMaterialsEmail] = useState('')
  // Decisor branch
  const [transferRequested, setTransferRequested] = useState(false)
  const [decisionMakerMeetingAt, setDecisionMakerMeetingAt] = useState('')
  // Dimensionamento
  const [companySize, setCompanySize] = useState('media') // pequena | media | grande
  // CTA detalhes
  const [auditDateTime, setAuditDateTime] = useState('')
  const [auditLocation, setAuditLocation] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [proposalMeetingAt, setProposalMeetingAt] = useState('')
  // Nurturing (baixo interesse)
  const [nurtureBestSeason, setNurtureBestSeason] = useState('')
  const [nurtureEventInterest, setNurtureEventInterest] = useState('')
  const [nurtureNextDate, setNurtureNextDate] = useState('')
  // Objeções tipificadas
  const [objectionType, setObjectionType] = useState('nenhuma')
  // Compliance & ESG
  const [requireAnvisa, setRequireAnvisa] = useState(true)
  // removido: requireIso
  const [requireFISPQ, setRequireFISPQ] = useState(true)
  const [requireTechSheet, setRequireTechSheet] = useState(true)
  const [requireMicroLaudos, setRequireMicroLaudos] = useState(false)
  const [biodegradable, setBiodegradable] = useState(true)
  const [lowVOC, setLowVOC] = useState(false)
  const [returnablePackaging, setReturnablePackaging] = useState(false)
  const [reverseLogistics, setReverseLogistics] = useState(false)
  const [lotTraceability, setLotTraceability] = useState(true)
  const [expirationControl, setExpirationControl] = useState(true)
  // Preferências técnicas e cotação
  const [areasList, setAreasList] = useState('')
  const [productsList, setProductsList] = useState('')
  // removidos: phRange, fragrance
  const [hypoallergenic, setHypoallergenic] = useState(false)
  const [chlorineFree, setChlorineFree] = useState(false)
  const [colorantFree, setColorantFree] = useState(false)
  // CTA (chamada para ação)
  const [ctaAction, setCtaAction] = useState('visita') // visita | cotacao | fechamento

  const economiaProdutos = useMemo(() => {
    const g = parseFloat(gastoMensal || '0')
    return isNaN(g) ? 0 : g * 0.3
  }, [gastoMensal])

  const economiaMOD = 0

  const economiaMensal = useMemo(() => economiaProdutos + economiaMOD, [economiaProdutos])
  const economiaAnual = useMemo(() => economiaMensal * 12, [economiaMensal])

  // Preencher automaticamente o nome do consultor a partir do login
  React.useEffect(() => {
    if (open && user?.name && !consultorNome) {
      setConsultorNome(user.name)
    }
  }, [open, user, consultorNome])

  const buildScriptText = () => {
    const empresa = companyName || 'Empresa'
    const seg = segment || 'segmento'
    const linhas = []
    linhas.push(SCRIPT_DATA.abertura_profissional.saudacao.replace('[NOME]', consultorNome || '[NOME]'))
    linhas.push(SCRIPT_DATA.abertura_profissional.credibilidade.replace('[ANOS]', anos || '[ANOS]'))
    linhas.push(SCRIPT_DATA.abertura_profissional.hook_interesse.replace('[NOME_EMPRESA]', empresa))
    linhas.push(SCRIPT_DATA.abertura_profissional.permissao)
    linhas.push(`Tempo disponível agora: ${hasTimeNow === 'sim' ? 'SIM' : 'NÃO'}`)
    if (hasTimeNow === 'nao') {
      if (rescheduleWhen) linhas.push(`Reagendar: ${rescheduleWhen}`)
      if (materialsEmail) linhas.push(`Enviar materiais: ${materialsEmail}`)
    }
    linhas.push(`Qualificação: decisor=${decisor ? 'sim' : `não (${decisorNome || '-'})`} • colaboradores=${colaboradores || '-'} • segmento=${seg}`)
    if (!decisor) {
      if (transferRequested) linhas.push('Ação: Solicitada transferência para o responsável')
      if (decisionMakerMeetingAt) linhas.push(`Agendado com decisor: ${decisionMakerMeetingAt}`)
    }
    linhas.push(`Dimensionamento: porte=${companySize}`)
    linhas.push(`Diagnóstico: fornecedor_fixo=${temFornecedorFixo ? 'sim' : 'não'} • satisfação=${satisfacaoAtual || '-'} • controle_micro=${controleMicro ? 'sim' : 'não'}`)
    linhas.push(`Gaps SMART: sustentabilidade=${temSustentabilidade ? 'sim' : 'não'} • equipe_treinada=${equipeTreinada ? 'sim' : 'não'}${performanceIssues ? ` • performance_obs=${performanceIssues}` : ''}`)
    linhas.push(`ROI: produtos(30%)=R$ ${economiaProdutos.toFixed(2)} • mão-de-obra(25%)=R$ ${economiaMOD.toFixed(2)} • mensal=R$ ${economiaMensal.toFixed(2)} • anual=R$ ${economiaAnual.toFixed(2)}`)
    linhas.push('Próximo passo: Auditoria técnica gratuita e plano SMART com ROI garantido.')
    linhas.push('Compliance & ESG:')
    linhas.push(`- ANVISA: ${requireAnvisa ? 'exigido' : 'não exigido'} • ISO: ${requireIso ? 'exigido' : 'opcional'} • FISPQ: ${requireFISPQ ? 'exigido' : 'opcional'} • Boletim Técnico: ${requireTechSheet ? 'exigido' : 'opcional'} • Laudos microbiológicos: ${requireMicroLaudos ? 'sim' : 'não'}`)
    linhas.push(`- Biodegradável: ${biodegradable ? 'sim' : 'não'} • Baixo VOC: ${lowVOC ? 'sim' : 'não'} • Embalagem retornável: ${returnablePackaging ? 'sim' : 'não'} • Logística reversa: ${reverseLogistics ? 'sim' : 'não'}`)
    linhas.push(`- Rastreabilidade de lote: ${lotTraceability ? 'sim' : 'não'} • Controle de validade: ${expirationControl ? 'sim' : 'não'}`)
    if (areasList) linhas.push(`Áreas/macroprocessos: ${areasList}`)
    if (productsList) linhas.push(`Lista base de produtos para cotação: ${productsList}`)
    linhas.push('Preferências técnicas:')
    linhas.push(`- Produtos de pH Alcalino: ${hypoallergenic ? 'sim' : 'não'} • Produtos de pH Ácido: ${chlorineFree ? 'sim' : 'não'} • Produtos de pH Neutro: ${colorantFree ? 'sim' : 'não'}`)
    if (interestLevel === 'alto') {
      linhas.push('Fechamento: Interesse ALTO — agendar auditoria técnica (manhã/tarde, esta/ próxima semana).')
    } else if (interestLevel === 'medio') {
      linhas.push('Fechamento: Interesse MÉDIO — enviar análise prévia e agendar videoconferência de 20 min.')
    } else {
      linhas.push('Fechamento: Interesse BAIXO/FUTURO — enviar cases e programar recontato na melhor época.')
    }
    if (ctaAction === 'visita') linhas.push('CTA: Agendar visita técnica presencial com checklist de áreas e testes in loco.')
    if (ctaAction === 'cotacao') linhas.push('CTA: Consolidar lista de produtos e enviar cotação com FISPQ/BT anexos.')
    if (ctaAction === 'fechamento') linhas.push('CTA: Fechamento imediato com proposta comercial e cronograma de implantação.')
    if (ctaAction === 'visita') {
      if (auditDateTime) linhas.push(`Visita técnica: ${auditDateTime}${auditLocation ? ` • Local: ${auditLocation}` : ''}`)
      if (contactPhone || contactEmail) linhas.push(`Contatos: ${contactPhone || ''} ${contactEmail || ''}`.trim())
    }
    if (ctaAction === 'cotacao') {
      if (proposalMeetingAt) linhas.push(`Videoconferência de proposta: ${proposalMeetingAt}`)
    }
    if (objectionsText) linhas.push(`Objeções apontadas: ${objectionsText}`)
    if (objectionType && objectionType !== 'nenhuma') linhas.push(`Tipo de objeção: ${objectionType}`)
    if (nextContactAt) linhas.push(`Próximo contato sugerido: ${nextContactAt}`)
    return linhas.join('\n')
  }

  const handleSubmit = async () => {
    if (!leadId) return
    try {
      setSubmitting(true)
      setError('')
      const content = buildScriptText()
      await api.post(`/leads/${leadId}/activities`, {
        channel: 'call',
        subject: `Ligação SMART — ${companyName || 'Lead'}`,
        content,
        outcome: 'Ligação realizada com diagnóstico SMART',
        next_contact_at: nextContactAt || null,
        stage: stage || 'contatado',
        form_responses: {
          smart_call: {
            consultorNome,
            anos,
            colaboradores,
            gastoMensal,
            horasLimpeza,
            valorHora,
            decisor,
            decisorNome,
            temFornecedorFixo,
            satisfacaoAtual,
            controleMicro,
            custoM2Conhecido,
            observacoes,
            temSustentabilidade,
            equipeTreinada,
            performanceIssues,
            interestLevel,
            objectionsText,
            nextContactAt,
            hasTimeNow,
            rescheduleWhen,
            materialsEmail,
            transferRequested,
            decisionMakerMeetingAt,
            companySize,
            requireAnvisa,
            requireIso,
            requireFISPQ,
            requireTechSheet,
            requireMicroLaudos,
            biodegradable,
            lowVOC,
            returnablePackaging,
            reverseLogistics,
            lotTraceability,
            expirationControl,
            areasList,
            productsList,
             // removidos: phRange, fragrance
            hypoallergenic,
            chlorineFree,
            colorantFree,
            ctaAction,
            auditDateTime,
            auditLocation,
            contactPhone,
            contactEmail,
            proposalMeetingAt,
            nurtureBestSeason,
            nurtureEventInterest,
            nurtureNextDate,
            objectionType,
            economiaProdutos,
            economiaMOD,
            economiaMensal,
            economiaAnual
          }
        },
        script_context: {
          script: 'script_crm_clean_health',
          version: '2.0',
          pipeline_stage: 'contatado',
          segment: segment || 'geral',
          source: 'SmartCallScript'
        },
        call_details: {
          objective: 'Diagnóstico SMART',
          decision_maker: decisor ? 'Sim' : `Não (${decisorNome || '-'})`,
          need_confirmed: null,
          budget_range: null,
          timeline: null,
          objections: objectionsText || null,
          next_step: ctaAction === 'visita' ? 'Visita técnica' : ctaAction === 'cotacao' ? 'Enviar cotação' : 'Fechamento imediato',
          duration_seconds: null
        }
      })
      onSuccess && onSuccess()
      onClose && onClose()
    } catch (e) {
      setError('Erro ao registrar atividade')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Script SMART — Contato Telefônico ({companyName || 'Lead'})</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                {SCRIPT_DATA.abertura_profissional.saudacao.replace('[NOME]', consultorNome || '[NOME]')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {SCRIPT_DATA.abertura_profissional.credibilidade.replace('[ANOS]', anos || '[ANOS]')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {SCRIPT_DATA.abertura_profissional.hook_interesse.replace('[NOME_EMPRESA]', companyName || 'Empresa')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {SCRIPT_DATA.abertura_profissional.permissao}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Seu nome (consultor)" value={consultorNome} onChange={(e) => setConsultorNome(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Anos de experiência" type="number" value={anos} onChange={(e) => setAnos(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <FormControl>
                <FormLabel>Tem tempo agora?</FormLabel>
                <RadioGroup row value={hasTimeNow} onChange={(e) => setHasTimeNow(e.target.value)}>
                  <FormControlLabel value="sim" control={<Radio />} label="Sim" />
                  <FormControlLabel value="nao" control={<Radio />} label="Não (reagendar)" />
                </RadioGroup>
              </FormControl>
            </Grid>
            {hasTimeNow === 'nao' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Melhor horário para retorno" placeholder="AAAA-MM-DD HH:mm" value={rescheduleWhen} onChange={(e) => setRescheduleWhen(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Email para envio de materiais" type="email" value={materialsEmail} onChange={(e) => setMaterialsEmail(e.target.value)} />
                </Grid>
              </>
            )}
          </Grid>
        )}

        {activeStep === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel control={<Checkbox checked={decisor} onChange={(e) => setDecisor(e.target.checked)} />} label="Estou falando com o decisor" />
            </Grid>
            {!decisor && (
              <>
                <Grid item xs={12}>
                  <TextField fullWidth label="Nome do decisor" value={decisorNome} onChange={(e) => setDecisorNome(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel control={<Checkbox checked={transferRequested} onChange={(e) => setTransferRequested(e.target.checked)} />} label="Solicitar transferência agora" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Agendar com decisor (AAAA-MM-DD HH:mm)" value={decisionMakerMeetingAt} onChange={(e) => setDecisionMakerMeetingAt(e.target.value)} />
                </Grid>
              </>
            )}
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Colaboradores (aprox.)" type="number" value={colaboradores} onChange={(e) => setColaboradores(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Porte da empresa</InputLabel>
                <Select value={companySize} label="Porte da empresa" onChange={(e) => setCompanySize(e.target.value)}>
                  <MenuItem value="pequena">Pequena</MenuItem>
                  <MenuItem value="media">Média</MenuItem>
                  <MenuItem value="grande">Grande</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Enfoque por segmento: {segment || 'segmento'}
              </Typography>
            </Grid>
          </Grid>
        )}

        {activeStep === 2 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={temFornecedorFixo} onChange={(e) => setTemFornecedorFixo(e.target.checked)} />} label="Possui fornecedor fixo" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={controleMicro} onChange={(e) => setControleMicro(e.target.checked)} />} label="Faz controle microbiológico" />
            </Grid>
            {/* removido: Conhece custo por m² */}
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={temSustentabilidade} onChange={(e) => setTemSustentabilidade(e.target.checked)} />} label="Possui políticas de sustentabilidade" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={equipeTreinada} onChange={(e) => setEquipeTreinada(e.target.checked)} />} label="Equipe treinada regularmente" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Satisfação atual (texto curto)" value={satisfacaoAtual} onChange={(e) => setSatisfacaoAtual(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Questões de performance observadas" value={performanceIssues} onChange={(e) => setPerformanceIssues(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={3} label="Observações gerais" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Compliance & Documentação</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={requireAnvisa} onChange={(e) => setRequireAnvisa(e.target.checked)} />} label="Exigir notificação/registro ANVISA" />
            </Grid>
            {/* removido: Exigir certificações ISO */}
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={requireFISPQ} onChange={(e) => setRequireFISPQ(e.target.checked)} />} label="Exigir FISPQ atualizada" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={requireTechSheet} onChange={(e) => setRequireTechSheet(e.target.checked)} />} label="Exigir Boletim Técnico" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={requireMicroLaudos} onChange={(e) => setRequireMicroLaudos(e.target.checked)} />} label="Exigir laudos microbiológicos" />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">ESG / Sustentabilidade</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={biodegradable} onChange={(e) => setBiodegradable(e.target.checked)} />} label="Preferir biodegradável" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={lowVOC} onChange={(e) => setLowVOC(e.target.checked)} />} label="Baixo VOC" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={returnablePackaging} onChange={(e) => setReturnablePackaging(e.target.checked)} />} label="Embalagem retornável" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={reverseLogistics} onChange={(e) => setReverseLogistics(e.target.checked)} />} label="Logística reversa" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={lotTraceability} onChange={(e) => setLotTraceability(e.target.checked)} />} label="Rastreabilidade de lote" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Checkbox checked={expirationControl} onChange={(e) => setExpirationControl(e.target.checked)} />} label="Controle de validade" />
            </Grid>
          </Grid>
        )}

        {activeStep === 3 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Apresentação do Sistema SMART</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">S - Sustentabilidade & Segurança: biodegradáveis, menos agressivos, até 70% menos descarte.</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">M - Máxima Segurança Microbiológica: 99,9% eliminação de patógenos, laudos técnicos, menos afastamentos.</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">A - Alta Performance: até 300% mais rendimento, ação rápida, multipropósito.</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">R - Redução de Custos: 25–45% de economia, ROI em até 30 dias, menos logística.</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">T - Treinamentos & Tecnologia: capacitação inclusa, suporte 24/7, relatórios mensais.</Typography>
            </Grid>
          </Grid>
        )}

        {activeStep === 4 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Gasto mensal atual (R$)" type="number" value={gastoMensal} onChange={(e) => setGastoMensal(e.target.value)} />
            </Grid>
            {/* removidos: Horas/mês de limpeza e Valor hora */}
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Economia em produtos (30%): R$ {economiaProdutos.toFixed(2)}
              </Typography>
               {/* remoção do cálculo de mão de obra por hora */}
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Economia mensal: R$ {economiaMensal.toFixed(2)} • Anual: R$ {economiaAnual.toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        )}

        {activeStep === 5 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Lista de produtos e áreas para cotação</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline minRows={4} label="Áreas / macroprocessos" placeholder="Ex.: Banheiros, Cozinha, Pisos, Vidros, Lavanderia" value={areasList} onChange={(e) => setAreasList(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline minRows={4} label="Produtos desejados (se souber)" placeholder="Ex.: Desinfetante hospitalar, Detergente neutro, Desengordurante, Limpador multiuso" value={productsList} onChange={(e) => setProductsList(e.target.value)} />
            </Grid>
            {/* removidos: Faixa de pH e Fragrância */}
            <Grid item xs={12} md={4}>
              <FormControlLabel control={<Checkbox checked={hypoallergenic} onChange={(e) => setHypoallergenic(e.target.checked)} />} label="Produtos de pH Alcalino" />
              <FormControlLabel control={<Checkbox checked={chlorineFree} onChange={(e) => setChlorineFree(e.target.checked)} />} label="Produtos de pH Ácido" />
              <FormControlLabel control={<Checkbox checked={colorantFree} onChange={(e) => setColorantFree(e.target.checked)} />} label="Produtos de pH Neutro" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Próximo passo</InputLabel>
                <Select value={ctaAction} label="Próximo passo" onChange={(e) => setCtaAction(e.target.value)}>
                  <MenuItem value="visita">Agendar visita técnica</MenuItem>
                  <MenuItem value="cotacao">Montar lista e enviar cotação</MenuItem>
                  <MenuItem value="fechamento">Fechamento imediato</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Nível de interesse</InputLabel>
                <Select value={interestLevel} label="Nível de interesse" onChange={(e) => setInterestLevel(e.target.value)}>
                  <MenuItem value="alto">Alto</MenuItem>
                  <MenuItem value="medio">Médio</MenuItem>
                  <MenuItem value="baixo">Baixo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Próximo contato (aaaa-mm-dd hh:mm)" placeholder="2025-08-10 15:00" value={nextContactAt} onChange={(e) => setNextContactAt(e.target.value)} />
            </Grid>
            {ctaAction === 'visita' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Data/hora auditoria técnica" placeholder="AAAA-MM-DD HH:mm" value={auditDateTime} onChange={(e) => setAuditDateTime(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Local da auditoria" value={auditLocation} onChange={(e) => setAuditLocation(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Telefone contato" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Email contato" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </Grid>
              </>
            )}
            {ctaAction === 'cotacao' && (
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Data/hora videoconferência" placeholder="AAAA-MM-DD HH:mm" value={proposalMeetingAt} onChange={(e) => setProposalMeetingAt(e.target.value)} />
              </Grid>
            )}
            {interestLevel === 'baixo' && (
              <>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Melhor época p/ recontato" placeholder="Ex.: pós-orçamento, fim de contrato, baixa temporada" value={nurtureBestSeason} onChange={(e) => setNurtureBestSeason(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Próximo nurturing (AAAA-MM-DD)" value={nurtureNextDate} onChange={(e) => setNurtureNextDate(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Interesse em eventos do setor" value={nurtureEventInterest} onChange={(e) => setNurtureEventInterest(e.target.value)} />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <TextField fullWidth label="Objeções identificadas" value={objectionsText} onChange={(e) => setObjectionsText(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de objeção</InputLabel>
                <Select value={objectionType} label="Tipo de objeção" onChange={(e) => setObjectionType(e.target.value)}>
                  <MenuItem value="nenhuma">Nenhuma</MenuItem>
                  <MenuItem value="fornecedor">Já tenho fornecedor</MenuItem>
                  <MenuItem value="preco">Preço alto</MenuItem>
                  <MenuItem value="pensar">Preciso pensar</MenuItem>
                  <MenuItem value="momento">Não é o momento</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {objectionType && objectionType !== 'nenhuma' && (
              <Grid item xs={12}>
                <Alert severity="info">
                  {objectionType === 'fornecedor' && SCRIPT_DATA.tratamento_objecoes_smart.ja_tenho_fornecedor_satisfeito.resposta}
                  {objectionType === 'preco' && SCRIPT_DATA.tratamento_objecoes_smart.preco_alto_economia.resposta}
                  {objectionType === 'pensar' && 'Proposta detalhada, call de 15min para dúvidas, transparência SMART e dados para decidir.'}
                  {objectionType === 'momento' && 'Crise = otimização, cada real conta, piloto sem risco, vantagem competitiva.'}
                </Alert>
              </Grid>
            )}
          </Grid>
        )}

        {activeStep === 6 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={10} value={buildScriptText()} label="Resumo do roteiro (copiar)" />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Dicas de objeções: {SCRIPT_DATA.tratamento_objecoes_smart.ja_tenho_fornecedor_satisfeito.resposta}
              </Typography>
            </Grid>
          </Grid>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        {activeStep > 0 && (
          <Button onClick={() => setActiveStep((s) => s - 1)}>Voltar</Button>
        )}
        {activeStep < steps.length - 1 && (
          <Button variant="contained" onClick={() => setActiveStep((s) => s + 1)} disabled={activeStep === 0 && !consultorNome}>
            Avançar
          </Button>
        )}
        {activeStep === steps.length - 1 && (
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Registrando...' : 'Registrar atividade'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default SmartCallScript


