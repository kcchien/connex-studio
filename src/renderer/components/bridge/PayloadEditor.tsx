/**
 * PayloadEditor Component
 *
 * Template editor for bridge payloads with syntax highlighting
 * and variable insertion support.
 */

import React, { memo, useCallback, useState, useRef, useEffect } from 'react'
import {
  Code,
  Copy,
  Check,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface PayloadEditorProps {
  /** Current payload template */
  value: string
  /** Callback when template changes */
  onChange: (value: string) => void
  /** Whether the editor is read-only */
  readonly?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Label text */
  label?: string
  /** Show validation errors */
  showValidation?: boolean
  /** Optional additional className */
  className?: string
}

/**
 * Available template variables.
 */
const TEMPLATE_VARIABLES = [
  { name: 'value', description: 'Current tag value' },
  { name: 'timestamp', description: 'Unix timestamp (ms)' },
  { name: 'isoTimestamp', description: 'ISO 8601 timestamp' },
  { name: 'tagName', description: 'Tag name' },
  { name: 'connectionId', description: 'Source connection ID' },
  { name: 'quality', description: 'Data quality (good/bad/uncertain)' }
]

/**
 * Nested variable patterns.
 */
const NESTED_VARIABLES = [
  { pattern: 'tags.NAME.value', description: 'Value of another tag' },
  { pattern: 'tags.NAME.quality', description: 'Quality of another tag' },
  { pattern: 'tag.property', description: 'Tag metadata (id, name, dataType, etc.)' }
]

interface VariableButtonProps {
  name: string
  description: string
  onClick: () => void
}

const VariableButton = memo(function VariableButton({
  name,
  description,
  onClick
}: VariableButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded text-left w-full',
        'hover:bg-muted transition-colors'
      )}
      title={description}
    >
      <code className="text-xs px-1 py-0.5 bg-primary/10 text-primary rounded">
        ${'{'}
        {name}
        {'}'}
      </code>
      <span className="text-xs text-muted-foreground truncate">
        {description}
      </span>
    </button>
  )
})

/**
 * Validate JSON structure (with template placeholders).
 */
function validatePayloadTemplate(template: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const trimmed = template.trim()

  // Check for unclosed braces
  const openBraces = (template.match(/\$\{/g) || []).length
  const closeBraces = (template.match(/\}/g) || []).length

  // Rough check - might have more } due to JSON braces
  if (openBraces > closeBraces) {
    errors.push('Unclosed template variable')
  }

  // Check for empty variable references
  if (/\$\{\s*\}/.test(template)) {
    errors.push('Empty variable reference found')
  }

  // If looks like JSON, validate structure
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    // Replace template vars with placeholder for JSON validation
    const testString = trimmed.replace(/\$\{[^}]+\}/g, '"__placeholder__"')

    try {
      JSON.parse(testString)
    } catch {
      errors.push('Invalid JSON structure')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * PayloadEditor for editing bridge payload templates.
 */
export const PayloadEditor = memo(function PayloadEditor({
  value,
  onChange,
  readonly = false,
  placeholder = '{"value": ${value}, "timestamp": ${timestamp}}',
  label = 'Payload Template',
  showValidation = true,
  className
}: PayloadEditorProps): React.ReactElement {
  const [showVariables, setShowVariables] = useState(false)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Validation
  const validation = showValidation ? validatePayloadTemplate(value) : null

  // Insert variable at cursor position
  const insertVariable = useCallback(
    (varName: string) => {
      if (readonly) return

      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = value
      const varText = `\${${varName}}`

      const newValue = text.substring(0, start) + varText + text.substring(end)
      onChange(newValue)

      // Restore cursor position after variable
      setTimeout(() => {
        textarea.focus()
        textarea.selectionStart = textarea.selectionEnd = start + varText.length
      }, 0)
    },
    [value, onChange, readonly]
  )

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [value])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.max(100, textarea.scrollHeight)}px`
    }
  }, [value])

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium text-foreground">{label}</label>
        </div>
        <div className="flex items-center gap-1">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={cn(
              'p-1 rounded text-muted-foreground',
              'hover:text-foreground hover:bg-muted',
              'transition-colors'
            )}
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>

          {/* Toggle variables panel */}
          {!readonly && (
            <button
              onClick={() => setShowVariables(!showVariables)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-muted transition-colors',
                showVariables && 'bg-muted text-foreground'
              )}
            >
              {showVariables ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Variables
            </button>
          )}
        </div>
      </div>

      {/* Variables panel */}
      {showVariables && !readonly && (
        <div className="p-2 rounded-md bg-muted/30 border border-border space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            Click to insert variable:
          </div>

          {/* Simple variables */}
          <div className="grid grid-cols-2 gap-1">
            {TEMPLATE_VARIABLES.map((v) => (
              <VariableButton
                key={v.name}
                name={v.name}
                description={v.description}
                onClick={() => insertVariable(v.name)}
              />
            ))}
          </div>

          {/* Nested variables info */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Info className="h-3 w-3" />
              <span>Nested patterns (type manually):</span>
            </div>
            <div className="space-y-1">
              {NESTED_VARIABLES.map((v) => (
                <div key={v.pattern} className="flex items-center gap-2">
                  <code className="text-xs px-1 py-0.5 bg-muted rounded">
                    ${'{'}
                    {v.pattern}
                    {'}'}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {v.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readonly}
          placeholder={placeholder}
          spellCheck={false}
          className={cn(
            'w-full px-3 py-2 rounded-md font-mono text-sm',
            'bg-background border',
            'focus:outline-none focus:ring-1',
            'resize-none min-h-[100px]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            validation && !validation.valid
              ? 'border-destructive focus:ring-destructive'
              : 'border-input focus:ring-ring'
          )}
        />
      </div>

      {/* Validation errors */}
      {validation && !validation.valid && (
        <div className="space-y-1">
          {validation.errors.map((error, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-muted-foreground">
        Use <code className="px-1 bg-muted rounded">${'{variable}'}</code> syntax
        for dynamic values. JSON format recommended.
      </div>
    </div>
  )
})

/**
 * TopicEditor - Simplified editor for topic templates.
 */
export const TopicEditor = memo(function TopicEditor({
  value,
  onChange,
  readonly = false,
  placeholder = 'devices/${connectionId}/${tagName}',
  label = 'Topic Template',
  className
}: Omit<PayloadEditorProps, 'showValidation'>): React.ReactElement {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Code className="h-4 w-4 text-muted-foreground" />
        <label className="text-sm font-medium text-foreground">{label}</label>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={readonly}
        placeholder={placeholder}
        className={cn(
          'w-full px-3 py-2 rounded-md font-mono text-sm',
          'bg-background border border-input',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      />

      <div className="text-xs text-muted-foreground">
        Available:{' '}
        <code className="px-1 bg-muted rounded">${'{tagName}'}</code>,{' '}
        <code className="px-1 bg-muted rounded">${'{connectionId}'}</code>
      </div>
    </div>
  )
})
