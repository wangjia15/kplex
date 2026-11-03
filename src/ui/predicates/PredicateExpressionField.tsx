/** Shared code-expression field for lenses and category rules. The caller supplies its bounded
 * draft, localization and validation policy; this component owns no parsing, settings or sources. */

/** Keep the expression label above a full-width, resizable monospace editor in any host shell. */
export function PredicateExpressionField({label, value, onChange, placeholder, maxLength, hint}: Readonly<{
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; maxLength?: number; hint?: string;
}>) {
  return <div className="kplex-predicate-expression-field">
    <label><span>{label}</span><textarea rows={4} spellCheck={false} value={value} placeholder={placeholder} maxLength={maxLength}
      onChange={event => onChange(event.currentTarget.value)} /></label>
    {hint && <div className="kplex-lens-help">{hint}</div>}
  </div>;
}
