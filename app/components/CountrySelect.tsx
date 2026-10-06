'use client'

import { useId, useState } from 'react'
import { COUNTRIES_WORLD, COUNTRY_NAME_BY_CODE } from '@/lib/countries'

/**
 * A searchable, global country picker. Uses a native input + datalist so it is
 * keyboard-accessible and filterable with no extra library. The committed value
 * is an ISO 3166-1 alpha-2 code; an unrecognised name resolves to '' (the
 * server validates again).
 */
const NAME_TO_CODE = new Map(COUNTRIES_WORLD.map((c) => [c.name.toLowerCase(), c.code]))

export default function CountrySelect({
  value,
  onChange,
  label,
  id,
  required = false,
}: {
  value: string | null
  onChange: (code: string) => void
  label: string
  id?: string
  required?: boolean
}) {
  const autoId = useId()
  const inputId = id ?? autoId
  const listId = `${inputId}-list`
  const [text, setText] = useState(value ? COUNTRY_NAME_BY_CODE.get(value) ?? '' : '')

  return (
    <div>
      <label htmlFor={inputId} className="mf-lbl block">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={inputId}
        list={listId}
        value={text}
        required={required}
        autoComplete="off"
        placeholder="Start typing a country…"
        onChange={(e) => {
          const next = e.target.value
          setText(next)
          const code = NAME_TO_CODE.get(next.trim().toLowerCase()) ?? ''
          onChange(code)
        }}
        className="mf-fld mt-2 max-w-sm"
      />
      <datalist id={listId}>
        {COUNTRIES_WORLD.map((c) => (
          <option key={c.code} value={c.name} />
        ))}
      </datalist>
    </div>
  )
}
