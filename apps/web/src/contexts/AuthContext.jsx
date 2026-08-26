import { createContext, useContext, useState, useEffect } from 'react'
import { registerUser, loginUser, googleLogin } from '../services/api'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext(null)

/**
 * Parse OAuth tokens from URL hash fragment.
 * Supabase redirects back with: /login#access_token=...&refresh_token=...&token_type=bearer&...
 */
function extractHashTokens() {
  const hash = window.location.hash
  if (!hash || hash.length < 2) return null

  const params = new URLSearchParams(hash.substring(1))
  const accessToken = params.get('access_token')

  if (accessToken && accessToken.length > 20) {
    return accessToken
  }
  return null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      // Step 1: Check if this is a Google OAuth redirect (tokens in URL hash)
      const oauthToken = extractHashTokens()

      if (oauthToken) {
        console.log('[Auth] OAuth redirect detected — sending token to backend...')
        setGoogleLoading(true)
        try {
          const result = await googleLogin(oauthToken)
          console.log('[Auth] Backend returned user:', result.user?.name || result.user?.email)
          
          localStorage.setItem('smartcrop_token', result.token)
          localStorage.setItem('smartcrop_user', JSON.stringify(result.user))
          setToken(result.token)
          setUser(result.user)

          // Clean up the URL hash so it's not visible
          window.history.replaceState(null, '', window.location.pathname)
        } catch (err) {
          console.error('[Auth] Google login failed:', err.message)
        } finally {
          setGoogleLoading(false)
          setLoading(false)
          // Sign out from Supabase — we use our own JWT
          try { await supabase.auth.signOut() } catch {}
        }
        return
      }

      // Step 2: No OAuth redirect — restore saved session from localStorage
      const savedToken = localStorage.getItem('smartcrop_token')
      const savedUser = localStorage.getItem('smartcrop_user')
      if (savedToken && savedUser) {
        try {
          setToken(savedToken)
          setUser(JSON.parse(savedUser))
        } catch {
          localStorage.removeItem('smartcrop_token')
          localStorage.removeItem('smartcrop_user')
        }
      }

      if (!cancelled) setLoading(false)
    }

    init()
    return () => { cancelled = true }
  }, [])

  const login = async (phone, password) => {
    const result = await loginUser({ phone, password })
    localStorage.setItem('smartcrop_token', result.token)
    localStorage.setItem('smartcrop_user', JSON.stringify(result.user))
    setToken(result.token)
    setUser(result.user)
    return result
  }

  const register = async (phone, password, name) => {
    const result = await registerUser({ phone, password, name })
    localStorage.setItem('smartcrop_token', result.token)
    localStorage.setItem('smartcrop_user', JSON.stringify(result.user))
    setToken(result.token)
    setUser(result.user)
    return result
  }

  const loginWithGoogle = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/login',
      },
    })
    if (error) {
      setGoogleLoading(false)
      throw new Error(error.message)
    }
    // Browser redirects to Google → then back to /login#access_token=...
    // The init() function above handles parsing the hash on reload
  }

  const logout = () => {
    localStorage.removeItem('smartcrop_token')
    localStorage.removeItem('smartcrop_user')
    setToken(null)
    setUser(null)
  }

  const updateUserName = (name) => {
    if (user) {
      const updated = { ...user, name }
      setUser(updated)
      localStorage.setItem('smartcrop_user', JSON.stringify(updated))
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      googleLoading,
      isAuthenticated: !!token,
      login,
      register,
      loginWithGoogle,
      logout,
      updateUserName,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

