import ArrowLink from "@/components/ArrowLink";

// Rendered inside the [lang] layout; copy is kept bilingual since the
// segment's params aren't available here.
export default function NotFound() {
  return (
    <section className="wrap" style={{ paddingBlock: "var(--space-10)" }}>
      <p className="meta">404 /</p>
      <h1 className="display-l" style={{ marginBlock: "var(--space-7)" }}>
        Page not found.
        <br />
        <span className="muted" lang="es">Página no encontrada.</span>
      </h1>
      <ArrowLink href="/">Brief&amp;Co.</ArrowLink>
    </section>
  );
}
