// Why this is a plain placeholder and not real routing/pages yet:
// this is the boilerplate step — proving the stack (Vite + React +
// Tailwind + brand colors) is wired correctly before any real screens
// (Login, Dashboard, etc.) get built in the next step. Delete this
// once real pages/routes exist.
export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-maroon text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-wide">Ignite</h1>
        <span className="text-gold-light text-sm">
          Rotaract Volunteer Platform
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <div className="inline-block bg-gold text-maroon-dark font-semibold px-4 py-1 rounded-full text-sm">
            Boilerplate ready
          </div>
          <p className="text-gray-600">
            Backend and frontend scaffolding are wired up. Auth pages,
            routing, and the Smart Team Builder get built on top of this.
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-200 px-6 py-3 text-center text-xs text-gray-400">
        Ignite — The event is temporary. The volunteer relationship isn&apos;t.
      </footer>
    </div>
  );
}
