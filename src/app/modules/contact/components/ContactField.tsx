import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

type FieldHint = { id: string; error?: string | null; hint?: string }

function fieldDescribedBy(id: string, error?: string | null, hint?: string) {
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint && !error ? `${id}-hint` : undefined
  return [errorId, hintId].filter(Boolean).join(' ') || undefined
}

export const ContactInput = forwardRef<
  HTMLInputElement,
  FieldHint & { label: string } & InputHTMLAttributes<HTMLInputElement>
>(function ContactInput({ id, label, required, error, hint, className = '', ...props }, ref) {
  const hintId = hint && !error ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={`contact-field${error ? ' contact-field--error' : ''}`}>
      <label className="contact-field__label" htmlFor={id}>
        {label}
        {required ? <span className="contact-field__req" aria-hidden> *</span> : null}
      </label>
      <input
        ref={ref}
        id={id}
        className={`contact-input${className ? ` ${className}` : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(id, error, hint)}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="contact-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="contact-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})

export function ContactSelect({
  id,
  label,
  required,
  error,
  hint,
  children,
  ...props
}: FieldHint & { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const hintId = hint && !error ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={`contact-field${error ? ' contact-field--error' : ''}`}>
      <label className="contact-field__label" htmlFor={id}>
        {label}
        {required ? <span className="contact-field__req" aria-hidden> *</span> : null}
      </label>
      <select
        id={id}
        className="contact-select"
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(id, error, hint)}
        {...props}
      >
        {children}
      </select>
      {hint && !error ? (
        <p id={hintId} className="contact-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="contact-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function ContactTextarea({
  id,
  label,
  required,
  error,
  hint,
  ...props
}: FieldHint & { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const hintId = hint && !error ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={`contact-field${error ? ' contact-field--error' : ''}`}>
      <label className="contact-field__label" htmlFor={id}>
        {label}
        {required ? <span className="contact-field__req" aria-hidden> *</span> : null}
      </label>
      <textarea
        id={id}
        className="contact-textarea"
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(id, error, hint)}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="contact-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="contact-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
