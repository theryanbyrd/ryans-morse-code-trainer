// Cross-link to CallSignReady — the companion app for the Ham Radio Technician
// exam. Ditdah teaches the code; CallSignReady gets you the callsign to use it.
export function LicenseBlurb({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={`license-blurb${compact ? ' compact' : ''}`}
      href="https://callsignready.com"
      target="_blank"
      rel="noreferrer"
    >
      <span className="lb-icon" aria-hidden="true">📻</span>
      <span className="lb-text">
        <span className="lb-title">Ready for your license?</span>
        <span className="lb-sub">
          <b>CallSignReady</b> turns the Ham Radio Technician exam into a game — earn your callsign and
          put this code on the air for real.
        </span>
      </span>
      <span className="lb-arrow" aria-hidden="true">→</span>
    </a>
  );
}
