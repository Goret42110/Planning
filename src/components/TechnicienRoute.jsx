import { useParams } from 'react-router-dom'
import TechnicienApp from '../TechnicienApp'

export default function TechnicienRoute() {
  const { id } = useParams()
  return <TechnicienApp forcedPersonId={id} />
}
