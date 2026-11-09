/** Shown instead of the app when the operator flips maintenance mode on. */
export function Maintenance({ message }: { message: string }) {
  return (
    <div className="start-screen" style={{ cursor: 'default' }}>
      <div className="start-loader" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h1 className="start-title brand">Back shortly</h1>
      <p className="start-tagline">
        {message || 'Dit Dah Me is down for a moment while we change something.'}
      </p>
      <p className="start-prompt">
        The iPhone app keeps working offline:{' '}
        <a href="https://ditdah.me/support.html" style={{ color: 'var(--amber)' }}>
          support
        </a>
      </p>
    </div>
  );
}
