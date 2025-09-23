import type { FormEvent } from 'react'
import { useState } from 'react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    // Fake login delay
    setTimeout(() => {
      setLoading(false)
      if (email && password) {
        alert(`Đăng nhập thành công: ${email}`)
      } else {
        setError('Vui lòng nhập email và mật khẩu')
      }
    }, 600)
  }

  return (
    <div style={{ maxWidth: 360, margin: '0 auto', textAlign: 'left' }}>
      <h1>Đăng nhập</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', marginTop: 6 }}
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 10px', marginTop: 6 }}
            />
          </label>
          {error && (
            <div style={{ color: '#ff6b6b' }}>{error}</div>
          )}
          <button type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </div>
      </form>
    </div>
  )
}

