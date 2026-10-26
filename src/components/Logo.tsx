export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`grid h-9 w-9 place-items-center rounded-xl bg-lime text-ink shadow-[0_0_30px_rgba(198,245,110,0.22)] ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M4.5 19.5V13.5h3.75v6H4.5Zm5.625 0V9h3.75v10.5h-3.75Zm5.625 0V4.5H19.5v15h-3.75Z" />
      </svg>
    </span>
  )
}
