import Link from 'next/link'

/**
 * App-wide 404 page.
 * Next.js App Router requires this file to exist for notFound() calls
 * to properly return HTTP 404 (without it the status may be 200 in dev).
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-white/10 mb-4">404</p>
      <h1 className="text-2xl font-semibold text-white/80 mb-2">Page not found</h1>
      <p className="text-sm text-white/40 mb-8">
        That actor or page doesn&apos;t exist in our database.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-full text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
      >
        Back to home
      </Link>
    </div>
  )
}
