import React, { useState, useEffect } from 'react'
import { TextField, FormHelperText } from '@mui/material'
import { autoFormat, validateField, removeFormatting } from '../utils/formatters'

/**
 * Componente de campo com formatação automática
 * Suporta: CNPJ, CPF, telefone, CEP, email
 */
const FormattedField = ({
  type = 'text', // 'cnpj', 'cpf', 'phone', 'cep', 'email', 'taxid'
  value = '',
  onChange,
  onBlur,
  label,
  placeholder,
  required = false,
  disabled = false,
  fullWidth = true,
  error = false, // Pode ser boolean ou string
  helperText = '',
  variant = 'outlined',
  size = 'medium',
  sx = {},
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState('')
  const [isValid, setIsValid] = useState(true)
  const [validationMessage, setValidationMessage] = useState('')

  // Atualiza valor de exibição quando o valor externo muda
  useEffect(() => {
    if (type !== 'email') {
      setDisplayValue(autoFormat(value, type))
    } else {
      setDisplayValue(value)
    }
  }, [value, type])

  // Validação em tempo real
  useEffect(() => {
    if (value && type !== 'text') {
      const valid = validateField(value, type)
      setIsValid(valid)
      
      if (!valid) {
        switch (type) {
          case 'cnpj':
            setValidationMessage('CNPJ inválido. Verifique os números digitados.')
            break
          case 'cpf':
            setValidationMessage('CPF inválido. Verifique os números digitados.')
            break
          case 'phone':
            setValidationMessage('Telefone inválido. Formato esperado: (XX) XXXXX-XXXX')
            break
          case 'cep':
            setValidationMessage('CEP inválido. Formato esperado: XXXXX-XXX')
            break
          case 'email':
            setValidationMessage('Email inválido. Verifique o formato correto.')
            break
          case 'taxid':
            setValidationMessage('CNPJ/CPF inválido. Verifique os números digitados.')
            break
          default:
            setValidationMessage('')
        }
      } else {
        setValidationMessage('')
      }
    } else {
      setIsValid(true)
      setValidationMessage('')
    }
  }, [value, type])

  const handleChange = (event) => {
    const inputValue = event.target.value
    
    if (type === 'email') {
      // Email não tem formatação, apenas validação
      setDisplayValue(inputValue)
      onChange?.(inputValue)
    } else {
      // Aplica formatação automática
      const formatted = autoFormat(inputValue, type)
      setDisplayValue(formatted)
      
      // Para o onChange, envia o valor sem formatação
      const rawValue = removeFormatting(formatted)
      onChange?.(rawValue)
    }
  }

  const handleBlur = (event) => {
    if (onBlur) {
      onBlur(event)
    }
    
    // Validação final no blur
    if (value && type !== 'text') {
      const valid = validateField(value, type)
      setIsValid(valid)
    }
  }

  // Determinar se deve mostrar erro e o texto final
  // SEMPRE garantir que seja boolean, não string
  const showError = Boolean(error) || (!isValid && value)
  const finalHelperText = helperText || validationMessage || (typeof error === 'string' ? error : '')

  // Placeholder baseado no tipo
  const getPlaceholder = () => {
    if (placeholder) return placeholder
    
    switch (type) {
      case 'cnpj':
        return '00.000.000/0000-00'
      case 'cpf':
        return '000.000.000-00'
      case 'phone':
        return '(00) 00000-0000'
      case 'cep':
        return '00000-000'
      case 'email':
        return 'exemplo@email.com'
      case 'taxid':
        return 'CPF ou CNPJ'
      default:
        return ''
    }
  }

  // Remove 'error' das props para evitar conflito
  const { error: _, ...restProps } = props

  return (
    <>
      <TextField
        {...restProps}
        type="text" // Sempre text para permitir formatação
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        label={label}
        placeholder={getPlaceholder()}
        required={required}
        disabled={disabled}
        fullWidth={fullWidth}
        error={showError}
        variant={variant}
        size={size}
        sx={sx}
      />
      {finalHelperText && (
        <FormHelperText error={showError}>
          {finalHelperText}
        </FormHelperText>
      )}
    </>
  )
}

export default FormattedField
