import { useId, useState } from 'react'

interface AuthPasswordFieldProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: 'new-password' | 'current-password'
  placeholder?: string
  hint?: string
  minLength?: number
  required?: boolean
  disabled?: boolean
}

export function AuthPasswordField({
  id: idProp,
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder,
  hint,
  minLength,
  required = true,
  disabled = false,
}: AuthPasswordFieldProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const hintId = hint ? `${id}-hint` : undefined
  const [show, setShow] = useState(false)

  return (
    <div className="login-field">
      <label className="login-field__label" htmlFor={id}>
        {label}
        {required ? (
          <span className="login-field__req" aria-hidden>
            {' '}
            *
          </span>
        ) : null}
      </label>
      <div className="login-field__password">
        <input
          id={id}
          className="login-field__input"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          aria-describedby={hintId}
        />
        <button
          type="button"
          className="login-field__toggle"
          onClick={() => setShow((v) => !v)}
          disabled={disabled}
          aria-pressed={show}
          aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        >
          {show ? 'ซ่อน' : 'แสดง'}
        </button>
      </div>
      {hint ? (
        <p id={hintId} className="login-field__hint muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
