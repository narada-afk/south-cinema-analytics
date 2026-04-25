// Legal route group layout.
// Inherits the root layout (StarBackground, footer, analytics) but
// constrains content to a readable 760 px column with comfortable padding.

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[760px] mx-auto px-5 sm:px-8 py-14 pb-28">
      {children}
    </div>
  )
}
