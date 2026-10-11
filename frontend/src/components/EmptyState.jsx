/** Consistent explanation and optional action when a list has no records. */
export default function EmptyState({ icon = "◇", title, description, action }) {
  return (
    <section className="empty-state" aria-live="polite">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <h2 className="empty-state-title">{title}</h2>
      {description && <p className="empty-state-desc">{description}</p>}
      {action}
    </section>
  );
}
