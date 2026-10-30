type PlayGlyphProps = {
  className?: string;
};

/** Shared play triangle with softly rounded corners. Inherits its color. */
export function PlayGlyph({ className = "size-5" }: PlayGlyphProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`fill-current ${className}`}>
      <path
        d="M7.5 4.2c0-1.1 1.2-1.8 2.1-1.2l11 7.8c.9.6.9 1.8 0 2.4l-11 7.8c-.9.6-2.1 0-2.1-1.2z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
