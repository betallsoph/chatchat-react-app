import { useEffect, useState, type ReactElement } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import Login from './components/Login'
import Home from './pages/Home'
import Chat from './pages/Chat'

/**
 * STRUCTURAL PATTERN - HOC (Higher-Order Component) Pattern
 * ProtectedRoute là wrapper component bảo vệ routes requiring authentication  
 * BEHAVIORAL PATTERN - Guard Pattern/Router Guard cho authorization
 */
function ProtectedRoute({ user, children }: { user: User | null, children: ReactElement }) {
  if (!user) return <Navigate to="/login" replace />
  return children
}

/**
 * STRUCTURAL PATTERN - Root Component Pattern/Container Component
 * App component quản lý global state và routing structure
 * BEHAVIORAL PATTERN - Application Lifecycle Pattern
 */
function App() {
  // BEHAVIORAL PATTERN - State Management Pattern
  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [isReady, setIsReady] = useState(false)

  // BEHAVIORAL PATTERN - Observer Pattern + Lifecycle Pattern
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setIsReady(true)
    })
    return () => unsub()
  }, [])

  // BEHAVIORAL PATTERN - Loading State Pattern (Template Method Pattern)
  if (!isReady) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white'
      }}>
        Đang tải…
      </div>
    )
  }

  // STRUCTURAL PATTERN - Router Pattern/Navigation Structure  
  return (
    <BrowserRouter>
      <Routes>
        {/* STRUCTURAL PATTERN - Component Composition (HOC wrapper) */}
        <Route
          path="/"
          element={<ProtectedRoute user={user}><Home /></ProtectedRoute>}
        />
        <Route
          path="/chat"
          element={<ProtectedRoute user={user}><Chat /></ProtectedRoute>}
        />
        <Route
          path="/chat/:roomId"
          element={<ProtectedRoute user={user}><Chat /></ProtectedRoute>}
        />
        {/* BEHAVIORAL PATTERN - Conditional Rendering Pattern */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        {/* BEHAVIORAL PATTERN - Fallback Route Pattern (Catch-all) */}
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
