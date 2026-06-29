// Renders a dot/dash pattern as a row of filled circles and bars.

export function Pattern({
  pattern,
  size = 18,
  className,
}: {
  pattern: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`pattern ${className ?? ''}`} aria-label={patternAria(pattern)}>
      {pattern.split('').map((ch, i) =>
        ch === '-' ? (
          <span key={i} className="sym dash" style={{ height: size, width: size * 2.2 }} />
        ) : (
          <span key={i} className="sym dot" style={{ height: size, width: size }} />
        ),
      )}
    </div>
  );
}

function patternAria(pattern: string): string {
  return pattern
    .split('')
    .map((c) => (c === '-' ? 'dash' : 'dot'))
    .join(' ');
}
