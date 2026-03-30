import { Navigate, useLocation } from "react-router-dom"
import { getToken } from "../utils/auth"
import { useOnlineStatus } from "../hooks/useOnlineStatus"

function ProtectedRoute({ children }) {
  const token = getToken()
  const online = useOnlineStatus()
  const location = useLocation()

  if (!token) {
    // Allow read-only browsing of cached data when offline.
    if (!online) return children
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return children
}

export default ProtectedRoute
