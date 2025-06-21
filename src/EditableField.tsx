import {
  forwardRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

export interface EditableFieldProps {
  value: string | number
  onSave: (value: string | number) => void
  render?: (value: string | number) => React.ReactNode
  inputType?: string
  multiline?: boolean
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  textareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>
  onDirtyChange?: (dirty: boolean) => void
}

export interface EditableFieldHandle {
  save: () => void
  revert: () => void
  editing: boolean
  dirty: boolean
}

const EditableField = forwardRef<EditableFieldHandle, EditableFieldProps>(
  function EditableField(
    {
      value,
      onSave,
      render,
      inputType = 'text',
      multiline = false,
      inputProps = {},
      textareaProps = {},
      onDirtyChange,
    }: EditableFieldProps,
    ref,
  ) {
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState<string | number>(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setPending(value)
    setEditing(false)
  }, [value])

  useEffect(() => {
    if (editing) {
      const el = multiline ? textareaRef.current : inputRef.current
      el?.focus()
    }
  }, [editing, multiline])

  const dirty = editing && pending !== value

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  const save = useCallback(() => {
    onSave(pending)
    setEditing(false)
    onDirtyChange?.(false)
  }, [onSave, pending, onDirtyChange])

  const revert = useCallback(() => {
    setPending(value)
    setEditing(false)
    onDirtyChange?.(false)
  }, [value, onDirtyChange])

  useImperativeHandle(
    ref,
    () => ({
      save,
      revert,
      editing,
      dirty,
    }),
    [save, revert, editing, dirty],
  )

  if (!editing) {
    return (
      <span
        tabIndex={0}
        className="editable-display"
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            setEditing(true)
          }
        }}
      >
        {render ? render(value) : value === '' ? '\u00A0' : String(value)}
      </span>
    )
  }

  const commonProps = {
    value: pending,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setPending(e.target.value),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!multiline && e.key === 'Enter') {
        e.preventDefault()
        save()
      }
    },
  }

  return (
    <span className="editable-edit">
      {multiline ? (
        <textarea
          {...commonProps}
          {...textareaProps}
          ref={textareaRef}
        />
      ) : (
        <input
          type={inputType}
          {...commonProps}
          {...inputProps}
          ref={inputRef}
        />
      )}
      <button type="button" onClick={save}>
        Save
      </button>
      <button type="button" onClick={revert}>
        Revert
      </button>
    </span>
  )
})

export default EditableField
