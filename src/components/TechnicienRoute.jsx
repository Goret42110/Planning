import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import TechnicienApp from '../TechnicienApp'

export default function TechnicienRoute() {
  const { id } = useParams()
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return <TechnicienApp forcedPersonId={id} onLogout={handleLogout} />
}
