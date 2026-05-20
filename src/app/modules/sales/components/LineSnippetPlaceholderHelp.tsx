import { LINE_SNIPPET_PLACEHOLDERS } from '../../crm/lineSnippetPlaceholders'

interface LineSnippetPlaceholderHelpProps {
  onInsert?: (token: string) => void
}

export function LineSnippetPlaceholderHelp({ onInsert }: LineSnippetPlaceholderHelpProps) {
  return (
    <div className="line-snippet-placeholders-help crm-form__full">
      <p className="line-snippet-placeholders-help__title">ตัวแปรอัตโนมัติ (จากข้อมูล Lead)</p>
      <p className="crm-sub muted">
        วางในข้อความแล้วระบบแทนค่าก่อนใส่ช่องแชท — ว่างถ้า Lead ไม่มีข้อมูล
        {onInsert ? ' กดเพื่อแทรกในข้อความ' : ''}
      </p>
      <ul className="line-snippet-placeholders-help__list">
        {LINE_SNIPPET_PLACEHOLDERS.map((p) => {
          const token = `{${p.key}}`
          return (
            <li key={p.key}>
              {onInsert ? (
                <button
                  type="button"
                  className="line-snippet-placeholders-help__insert"
                  onClick={() => onInsert(token)}
                  title={`แทรก ${token}`}
                >
                  <code className="line-snippet-placeholders-help__code">{token}</code>
                </button>
              ) : (
                <code className="line-snippet-placeholders-help__code">{token}</code>
              )}
              <span>{p.label}</span>
              <span className="muted">เช่น {p.example}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
