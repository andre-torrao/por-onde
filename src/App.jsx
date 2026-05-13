import { AuthProvider, useAuth } from './auth'
import AuthPage from './AuthPage'
import Tracker from './Tracker'

function Inner() {
  const { user, ready } = useAuth()
  if (!ready) return null          // brief flash while reading localStorage
  return user ? <Tracker /> : <AuthPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  )
}
