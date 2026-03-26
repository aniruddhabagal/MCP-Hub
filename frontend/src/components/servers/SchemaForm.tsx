'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface SchemaProperty {
  type?: string | string[]
  description?: string
  enum?: string[]
  default?: unknown
  title?: string
}

interface JsonSchema {
  type?: string
  properties?: Record<string, SchemaProperty>
  required?: string[]
}

interface SchemaFormProps {
  schema: JsonSchema | null | undefined
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  disabled?: boolean
}

function getType(prop: SchemaProperty): string {
  if (!prop.type) return 'string'
  if (Array.isArray(prop.type)) {
    return prop.type.find((t) => t !== 'null') ?? 'string'
  }
  return prop.type
}

function isComplex(prop: SchemaProperty): boolean {
  const t = getType(prop)
  return t === 'object' || t === 'array'
}

export function SchemaForm({ schema, values, onChange, disabled }: SchemaFormProps) {
  if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
    return (
      <p className="text-xs text-muted-foreground font-mono py-2">
        This tool takes no arguments.
      </p>
    )
  }

  const required = schema.required ?? []
  const entries = Object.entries(schema.properties)

  return (
    <div className="space-y-4">
      {entries.map(([key, prop]) => {
        const label = prop.title ?? key
        const isRequired = required.includes(key)
        const type = getType(prop)
        const complex = isComplex(prop)
        const value = values[key]

        return (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs font-mono text-foreground flex items-center gap-1">
              {label}
              {isRequired && <span className="text-status-error">*</span>}
            </Label>

            {/* Fallback: complex types → JSON textarea */}
            {complex ? (
              <textarea
                className={cn(
                  'w-full min-h-[80px] rounded-md border border-border bg-background px-3 py-2',
                  'text-xs font-mono text-foreground resize-y',
                  'focus:outline-none focus:ring-1 focus:ring-primary',
                  'placeholder:text-muted-foreground',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                placeholder={`Enter JSON ${type}…`}
                value={typeof value === 'string' ? value : value !== undefined ? JSON.stringify(value, null, 2) : ''}
                onChange={(e) => {
                  try {
                    onChange(key, JSON.parse(e.target.value))
                  } catch {
                    onChange(key, e.target.value)
                  }
                }}
                disabled={disabled}
              />
            ) : prop.enum ? (
              <Select
                value={String(value ?? '')}
                onValueChange={(v) => onChange(key, v)}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {prop.enum.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-xs font-mono">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : type === 'boolean' ? (
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!value}
                  onCheckedChange={(checked) => onChange(key, checked)}
                  disabled={disabled}
                />
                <span className="text-xs font-mono text-muted-foreground">
                  {value ? 'true' : 'false'}
                </span>
              </div>
            ) : type === 'number' || type === 'integer' ? (
              <Input
                type="number"
                className="h-8 text-xs font-mono"
                placeholder={prop.default !== undefined ? String(prop.default) : '0'}
                value={value ?? ''}
                onChange={(e) =>
                  onChange(key, e.target.value === '' ? undefined : Number(e.target.value))
                }
                disabled={disabled}
              />
            ) : (
              <Input
                type="text"
                className="h-8 text-xs font-mono"
                placeholder={prop.default !== undefined ? String(prop.default) : `Enter ${label}…`}
                value={value ?? ''}
                onChange={(e) => onChange(key, e.target.value)}
                disabled={disabled}
              />
            )}

            {prop.description && (
              <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                {prop.description}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
