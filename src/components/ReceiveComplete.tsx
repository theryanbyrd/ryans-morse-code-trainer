export function ReceiveComplete({ pool, onSwitch }: { pool: string[]; onSwitch: () => void }) {
  return (
    <div className="completion">
      <div className="confetti" aria-hidden="true">👂✨</div>
      <h2>Great ears!</h2>
      <p>
        You can now recognise all {pool.length} of your learned letters by sound. Learn more
        letters in Send mode to unlock more to hear.
      </p>
      <div className="completion-actions">
        <button className="btn primary" onClick={onSwitch}>Back to modes</button>
      </div>
    </div>
  );
}
