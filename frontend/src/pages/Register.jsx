import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import api from "../api/axios"
import { useOnlineStatus } from "../hooks/useOnlineStatus"

const BriefcaseIcon = () => (
  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
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

const CheckIcon = () => (
  <svg className="w-5 h-5 text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

function Register() {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!online) {
      setError("You're offline. Connect to the internet to create an account.")
      return
    }
    
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    setError("")

    try {
      await api.post("/api/auth/register", {
        email: form.email,
        password: form.password
      })
      setMessage("Account created successfully! Redirecting...")
      setTimeout(() => navigate("/"), 2000)
    } catch (err) {
      if (!err?.response) {
        setError("Can't reach the server right now. Check your connection (or wake the backend) and try again.")
      } else {
        setError(err.response?.data?.message || "Registration failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const features = [
    "Track unlimited job applications",
    "Powerful analytics & insights",
    "Interview scheduling & notes",
    "Skill extraction from job posts",
    "Source tracking & performance",
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
              <BriefcaseIcon />
            </div>
            <span className="text-2xl font-bold text-white">Capsule</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="text-5xl font-bold text-white leading-tight">
            Start Your Success Story Today
          </h1>
          <p className="text-xl text-primary-100 max-w-md">
            Join thousands of job seekers who've streamlined their job search with Capsule.
          </p>
          
          <div className="space-y-4 pt-4">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 text-primary-100"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="p-1 bg-white/20 rounded-full">
                  <CheckIcon />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-primary-200 text-sm">
          &copy; 2024 Capsule. All rights reserved.
        </div>
      </div>

      {/* Right side - Register form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-dark-900">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg shadow-primary-500/30">
              <BriefcaseIcon />
            </div>
            <span className="text-2xl font-bold text-white">Capsule</span>
          </div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Create your account</h2>
            <p className="text-dark-400">Start tracking your job applications for free</p>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-success-500/10 border border-success-500/30 rounded-xl animate-fade-in-down">
              <p className="text-success-400 text-sm text-center flex items-center justify-center gap-2">
                <CheckIcon />
                {message}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl animate-fade-in-down">
              <p className="text-danger-400 text-sm text-center">{error}</p>
            </div>
          )}

          {!online && (
            <div className="mb-6 p-4 bg-warning-500/10 border border-warning-500/30 rounded-xl animate-fade-in-down">
              <p className="text-warning-300 text-sm text-center">
                Offline: registration is disabled.
              </p>
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
                  placeholder="Create a password"
                  required
                  autoComplete="new-password"
                />
              </div>
              <p className="text-xs text-dark-500">Must be at least 6 characters</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockIcon />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="input-field pl-12"
                  placeholder="Confirm your password"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || message || !online}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create account</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-dark-400">
              Already have an account?{" "}
              <Link 
                to="/" 
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Decorative element */}
          <div className="mt-12 pt-8 border-t border-dark-700/50">
            <p className="text-center text-dark-500 text-xs">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
