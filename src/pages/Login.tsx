import type { FormEvent } from 'react'
import { useState } from 'react'

export default function Login() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError(null)
		if (!email || !password) {
			setError('Vui lòng nhập email và mật khẩu')
			return
		}
		// Fake login flow: accept any credentials
		alert(`Đăng nhập thành công cho: ${email}`)
	}

	return (
		<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
			<form onSubmit={handleSubmit} style={{ width: 360, padding: 24, border: '1px solid #e5e7eb', borderRadius: 12, background: 'white', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' }}>
				<h2 style={{ margin: 0, marginBottom: 8 }}>Đăng nhập</h2>
				<p style={{ marginTop: 0, color: '#6b7280', marginBottom: 16 }}>Chào mừng trở lại 👋</p>

				<label htmlFor="email" style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 6 }}>Email</label>
				<input
					id="email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="you@example.com"
					style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', marginBottom: 12 }}
				/>

				<label htmlFor="password" style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 6 }}>Mật khẩu</label>
				<input
					id="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="••••••••"
					style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', marginBottom: 16 }}
				/>

				{error && (
					<div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 10px', borderRadius: 8, marginBottom: 12 }}>
						{error}
					</div>
				)}

				<button type="submit" style={{ width: '100%', padding: '10px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
					Đăng nhập
				</button>
			</form>
		</div>
	)
}

