import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'

function App() {
  const [count, setCount] = useState(0)

  return (
		<>
			<nav style={{ display: 'flex', gap: 12, padding: 12 }}>
				<Link to="/">Trang chủ</Link>
				<Link to="/login">Đăng nhập</Link>
			</nav>
			<Routes>
				<Route
					path="/"
					element={
						<>
							<div>
								<a href="https://vite.dev" target="_blank">
									<img src={viteLogo} className="logo" alt="Vite logo" />
								</a>
								<a href="https://react.dev" target="_blank">
									<img src={reactLogo} className="logo react" alt="React logo" />
								</a>
							</div>
							<h1>Vite + React</h1>
							<div className="card">
								<button onClick={() => setCount((count) => count + 1)}>
									count is {count}
								</button>
								<p>
									Edit <code>src/App.tsx</code> and save to test HMR
								</p>
							</div>
							<p className="read-the-docs">
								Click on the Vite and React logos to learn more
							</p>
						</>
					}
				/>
				<Route path="/login" element={<Login />} />
			</Routes>
		</>
	)
}

export default App
