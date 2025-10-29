// 🎯 Utilitários de Formatação para Campos Brasileiros
// Formatação automática de CNPJ, CPF, telefone, email e CEP

/**
 * Formata CNPJ (XX.XXX.XXX/XXXX-XX)
 * @param {string} value - Valor a ser formatado
 * @returns {string} - CNPJ formatado
 */
export const formatCNPJ = (value) => {
  if (!value) return ''
  
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Limita a 14 dígitos
  const limited = numbers.slice(0, 14)
  
  // Aplica máscara
  return limited.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

/**
 * Formata CPF (XXX.XXX.XXX-XX)
 * @param {string} value - Valor a ser formatado
 * @returns {string} - CPF formatado
 */
export const formatCPF = (value) => {
  if (!value) return ''
  
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11)
  
  // Aplica máscara
  return limited.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    '$1.$2.$3-$4'
  )
}

/**
 * Formata telefone ((XX) XXXXX-XXXX)
 * @param {string} value - Valor a ser formatado
 * @returns {string} - Telefone formatado
 */
export const formatPhone = (value) => {
  if (!value) return ''
  
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11)
  
  // Aplica máscara baseada no tamanho
  if (limited.length <= 10) {
    // Telefone fixo: (XX) XXXX-XXXX
    return limited.replace(
      /^(\d{2})(\d{4})(\d{4})$/,
      '($1) $2-$3'
    )
  } else {
    // Celular: (XX) XXXXX-XXXX
    return limited.replace(
      /^(\d{2})(\d{5})(\d{4})$/,
      '($1) $2-$3'
    )
  }
}

/**
 * Formata CEP (XXXXX-XXX)
 * @param {string} value - Valor a ser formatado
 * @returns {string} - CEP formatado
 */
export const formatCEP = (value) => {
  if (!value) return ''
  
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  // Limita a 8 dígitos
  const limited = numbers.slice(0, 8)
  
  // Aplica máscara
  return limited.replace(
    /^(\d{5})(\d{3})$/,
    '$1-$2'
  )
}

/**
 * Valida formato de email
 * @param {string} email - Email a ser validado
 * @returns {boolean} - True se válido
 */
export const validateEmail = (email) => {
  if (!email) return true // Campo vazio é válido
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida CNPJ
 * @param {string} cnpj - CNPJ a ser validado
 * @returns {boolean} - True se válido
 */
export const validateCNPJ = (cnpj) => {
  if (!cnpj) return true // Campo vazio é válido
  
  // Remove formatação
  const numbers = cnpj.replace(/\D/g, '')
  
  // Verifica se tem 14 dígitos
  if (numbers.length !== 14) return false
  
  // Verifica se não são todos iguais
  if (/^(\d)\1+$/.test(numbers)) return false
  
  // Validação dos dígitos verificadores
  let sum = 0
  let weight = 2
  
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(numbers[i]) * weight
    weight = weight === 9 ? 2 : weight + 1
  }
  
  const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  
  if (parseInt(numbers[12]) !== digit1) return false
  
  sum = 0
  weight = 2
  
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(numbers[i]) * weight
    weight = weight === 9 ? 2 : weight + 1
  }
  
  const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  
  return parseInt(numbers[13]) === digit2
}

/**
 * Valida CPF
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean} - True se válido
 */
export const validateCPF = (cpf) => {
  if (!cpf) return true // Campo vazio é válido
  
  // Remove formatação
  const numbers = cpf.replace(/\D/g, '')
  
  // Verifica se tem 11 dígitos
  if (numbers.length !== 11) return false
  
  // Verifica se não são todos iguais
  if (/^(\d)\1+$/.test(numbers)) return false
  
  // Validação dos dígitos verificadores
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i)
  }
  
  let remainder = sum % 11
  let digit1 = remainder < 2 ? 0 : 11 - remainder
  
  if (parseInt(numbers[9]) !== digit1) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i)
  }
  
  remainder = sum % 11
  let digit2 = remainder < 2 ? 0 : 11 - remainder
  
  return parseInt(numbers[10]) === digit2
}

/**
 * Valida telefone
 * @param {string} phone - Telefone a ser validado
 * @returns {boolean} - True se válido
 */
export const validatePhone = (phone) => {
  if (!phone) return true // Campo vazio é válido
  
  // Remove formatação
  const numbers = phone.replace(/\D/g, '')
  
  // Telefone deve ter 10 ou 11 dígitos
  return numbers.length === 10 || numbers.length === 11
}

/**
 * Valida CEP
 * @param {string} cep - CEP a ser validado
 * @returns {boolean} - True se válido
 */
export const validateCEP = (cep) => {
  if (!cep) return true // Campo vazio é válido
  
  // Remove formatação
  const numbers = cep.replace(/\D/g, '')
  
  // CEP deve ter 8 dígitos
  return numbers.length === 8
}

/**
 * Remove formatação de um valor
 * @param {string} value - Valor formatado
 * @returns {string} - Valor sem formatação
 */
export const removeFormatting = (value) => {
  if (!value) return ''
  return value.replace(/\D/g, '')
}

/**
 * Detecta automaticamente se é CNPJ ou CPF e aplica formatação
 * @param {string} value - Valor a ser formatado
 * @returns {string} - Valor formatado
 */
export const formatTaxId = (value) => {
  if (!value) return ''
  
  const numbers = value.replace(/\D/g, '')
  
  if (numbers.length <= 11) {
    return formatCPF(value)
  } else {
    return formatCNPJ(value)
  }
}

/**
 * Aplica formatação automática baseada no tipo de campo
 * @param {string} value - Valor a ser formatado
 * @param {string} type - Tipo de campo (cnpj, cpf, phone, cep, email)
 * @returns {string} - Valor formatado
 */
export const autoFormat = (value, type) => {
  switch (type) {
    case 'cnpj':
      return formatCNPJ(value)
    case 'cpf':
      return formatCPF(value)
    case 'phone':
      return formatPhone(value)
    case 'cep':
      return formatCEP(value)
    case 'taxid':
      return formatTaxId(value)
    default:
      return value
  }
}

/**
 * Valida campo baseado no tipo
 * @param {string} value - Valor a ser validado
 * @param {string} type - Tipo de campo
 * @returns {boolean} - True se válido
 */
export const validateField = (value, type) => {
  switch (type) {
    case 'cnpj':
      return validateCNPJ(value)
    case 'cpf':
      return validateCPF(value)
    case 'phone':
      return validatePhone(value)
    case 'cep':
      return validateCEP(value)
    case 'email':
      return validateEmail(value)
    case 'taxid':
      return validateCNPJ(value) || validateCPF(value)
    default:
      return true
  }
}
