import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import Login from './pages/Login.tsx'

const router = createBrowserRouter([
	{ path: '/', element: <Navigate to="/login" replace /> },
	{ path: '/login', element: <Login /> },
	{ path: '/app', element: <App /> },
])

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
)
