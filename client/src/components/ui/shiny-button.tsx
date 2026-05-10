import type React from "react"

interface ShinyButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

const shinyButtonCss = `
  @property --gradient-angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }

  @property --gradient-percent {
    syntax: "<percentage>";
    initial-value: 10%;
    inherits: false;
  }

  .shiny-cta {
    --shiny-cta-bg: oklch(0.18 0.07 55);
    --shiny-cta-bg-subtle: oklch(0.30 0.08 58);
    --shiny-cta-fg: oklch(0.97 0.02 95);
    --shiny-cta-highlight: oklch(0.78 0.20 60);
    --duration: 4s;
    --transition: 600ms cubic-bezier(0.25, 1, 0.5, 1);

    isolation: isolate;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    outline-offset: 4px;
    padding: 0 2rem;
    font-size: 1.125rem;
    line-height: 1.2;
    font-weight: 700;
    border: 3px solid transparent;
    border-radius: 360px;
    color: var(--shiny-cta-fg);
    background:
      linear-gradient(var(--shiny-cta-bg), var(--shiny-cta-bg)) padding-box,
      conic-gradient(
        from var(--gradient-angle),
        transparent,
        var(--shiny-cta-highlight) var(--gradient-percent),
        var(--shiny-cta-highlight) calc(var(--gradient-percent) * 2),
        transparent calc(var(--gradient-percent) * 3)
      ) border-box;
    box-shadow: inset 0 0 0 1px var(--shiny-cta-bg-subtle);
    transition: --gradient-percent var(--transition), box-shadow var(--transition);
    animation: gradient-angle linear infinite var(--duration);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
  }

  .shiny-cta span {
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .shiny-cta:active {
    translate: 0 1px;
  }

  .shiny-cta:is(:hover, :focus-visible) {
    --gradient-percent: 32%;
    box-shadow: inset 0 0 0 1px var(--shiny-cta-bg-subtle), 0 0 18px oklch(0.78 0.20 60 / 0.4);
  }

  .shiny-cta.worker-jobs-cta {
    --shiny-cta-bg: oklch(0.38 0.07 124.99);
    --shiny-cta-bg-subtle: oklch(0.75 0.03 113.79);
    --shiny-cta-fg: #ffffff;
    --shiny-cta-highlight: oklch(0.76 0.17 114);
  }

  .shiny-cta.worker-jobs-cta:is(:hover, :focus-visible) {
    box-shadow: inset 0 0 0 1px var(--shiny-cta-bg-subtle), 0 0 18px oklch(0.76 0.17 114 / 0.4);
  }

  @keyframes gradient-angle {
    to { --gradient-angle: 360deg; }
  }
`

export function ShinyButton({ children, onClick, className = "", style }: ShinyButtonProps) {
  return (
    <>
      <style>{shinyButtonCss}</style>
      <button className={`shiny-cta ${className}`} onClick={onClick} style={style}>
        <span>{children}</span>
      </button>
    </>
  )
}
