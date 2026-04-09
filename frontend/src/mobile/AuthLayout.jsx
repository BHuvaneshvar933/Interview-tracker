import TopBar from "./TopBar"

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-dvh bg-transparent overflow-x-hidden">
      <TopBar />
      <main className="w-full max-w-[420px] mx-auto px-4 pt-4 pb-8">
        {children}
      </main>
    </div>
  )
}
