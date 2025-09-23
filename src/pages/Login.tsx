import { useState } from 'react'

export default function Login() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError(null)
		if (!email || !password) {
			setError('Vui lòng nhập email và mật khẩu')
			return
		}
		// Fake auth flow for now
		alert(`Đăng nhập thành công: ${email}`)
	}

	return (
		<div className="login-page">
			<div className="login-card">
				<h1>Đăng nhập</h1>
				<form onSubmit={handleSubmit} noValidate>
					<label>
						Email
						<input
							type="email"
							placeholder="you@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
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
						/>
					</label>
					{error && <p className="form-error">{error}</p>}
					<button type="submit">Đăng nhập</button>
				</form>
			</div>
			<style>
				{`
					.login-page { display:flex; align-items:center; justify-content:center; min-height:100dvh; padding:16px; background: #0b1020; }
					.login-card { width:100%; max-width:380px; background:#121735; color:#e6e8ef; border:1px solid #242a4a; border-radius:12px; padding:24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
					.login-card h1 { margin:0 0 16px; font-size:22px; }
					label { display:block; font-size:13px; margin:12px 0; }
					input { width:100%; margin-top:6px; padding:10px 12px; border:1px solid #2c335a; background:#0d1230; color:#e6e8ef; border-radius:8px; outline:none; }
					input:focus { border-color:#6672ff; box-shadow:0 0 0 3px rgba(102,114,255,0.2); }
					button { width:100%; margin-top:12px; padding:10px 14px; background:#6672ff; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600; }
					button:hover { background:#5562ff; }
					.form-error { color:#ff6b6b; font-size:12px; margin:8px 0 0; }
				`}
			</style>
		</div>
	)
}

