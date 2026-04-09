import { useEffect, useState } from "react"
import { useLocation, useNavigate, Link } from "react-router-dom"
import api from "../api/axios"
import { getToken, setToken } from "../utils/auth"
import { useOnlineStatus } from "../hooks/useOnlineStatus"
import { toUserMessage } from "../utils/errorMessage"

const LogoMark = ({ className = "w-10 h-10" }) => (
  <img
    src="/capsule-corp.svg"
    alt="Capsule"
    className={`${className} object-contain`}
    loading="eager"
  />
)

const EmailIcon = () => (
  <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
)

const LockIcon = () => (
  <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
)

const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const online = useOnlineStatus()
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    const to = location.state?.from || "/dashboard"
    navigate(to, { replace: true })
  }, [location.state, navigate])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!online) {
      setError("You're offline. Connect to the internet to sign in.")
      return
    }
    setLoading(true)
    setError("")

    try {
      const res = await api.post("/api/auth/login", form)
      setToken(res.data.token)
      const to = location.state?.from || "/dashboard"
      navigate(to)
    } catch (err) {
      setError(toUserMessage(err, "Sign-in failed. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-8 bg-transparent">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-10">
          <LogoMark className="w-12 h-12" />
          <span className="text-2xl font-bold text-white">Capsule</span>
        </div>

           <div className="text-center mb-10">
             <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
             <p className="text-dark-400">Sign in to continue</p>
           </div>

          {error && (
            <div className="mb-6 p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl animate-fade-in-down">
              <p className="text-danger-400 text-sm text-center">{error}</p>
            </div>
          )}

          {!online && (
            <div className="mb-6 p-4 bg-warning-500/10 border border-warning-500/30 rounded-xl animate-fade-in-down">
              <p className="text-warning-300 text-sm text-center">
                Offline: sign-in is disabled. You can still browse cached applications from the home screen if you already opened them before.
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/job-tracker")}
                  className="btn-secondary"
                >
                  Browse cached applications
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <EmailIcon />
                </div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input-field pl-12"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockIcon />
                </div>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field pl-12"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !online}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-dark-400">
              Don't have an account?{" "}
              <Link 
                to="/register" 
                className="text-emerald-300 hover:text-teal-200 font-medium transition-colors"
              >
                Create account
              </Link>
            </p>
          </div>

          {/* Decorative element */}
          <div className="mt-12 pt-8 border-t border-dark-700/50">
            <p className="text-center text-dark-500 text-xs">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
      </div>
    </div>
  )
}

export default Login
