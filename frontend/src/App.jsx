import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import JobTracker from "./pages/JobTracker"
import ApplicationDetail from "./pages/ApplicationDetail"
import Analytics from "./pages/Analytics"
import AiTools from "./pages/AiTools"
import Settings from "./pages/Settings"
import Todos from "./pages/Todos"
import Pomodoro from "./pages/Pomodoro"
import Habits from "./pages/Habits"
import Curator from "./pages/Curator"
import ProtectedRoute from "./components/ProtectedRoute"
import Layout from "./components/Layout"
import { warmUpBackend } from "./api/axios"
import { useMediaQuery } from "./hooks/useMediaQuery"
import AppLayout from "./mobile/AppLayout"
import AuthLayout from "./mobile/AuthLayout"
import { useOnlineStatus } from "./hooks/useOnlineStatus"

function App() {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const online = useOnlineStatus()

  useEffect(() => {
    // Render free tier cold starts: attempt a gentle warm-up on load.
    if (!online) return
    warmUpBackend({ reason: "startup" })
  }, [online])

  const Shell = isMobile ? AppLayout : Layout

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={isMobile ? <AuthLayout><Login /></AuthLayout> : <Login />} />
        <Route path="/register" element={isMobile ? <AuthLayout><Register /></AuthLayout> : <Register />} />

        {/* Protected routes share a single shell (mobile/desktop) */}
        <Route
          element={
            <ProtectedRoute>
              <Shell>
                <Outlet />
              </Shell>
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/job-tracker" element={<JobTracker />} />
          <Route path="/applications/:id" element={<ApplicationDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/ai" element={<AiTools />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/todos" element={<Todos />} />
          <Route path="/pomodoro" element={<Pomodoro />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/curator" element={<Curator />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
