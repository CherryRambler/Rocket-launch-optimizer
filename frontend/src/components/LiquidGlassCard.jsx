export default function LiquidGlassCard({ children, style, className = "", accent = false, ...rest }) {
  return (
    <div
      className={`lgc ${accent ? "lgc--accent" : ""} ${className}`}
      style={style}
      {...rest}
    >
      <div className="lgc__shimmer" aria-hidden="true" />
      <div className="lgc__inner">{children}</div>
    </div>
  );
}
