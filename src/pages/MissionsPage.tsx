import { Navigate } from 'react-router-dom'

/** Legacy route — primary missions live at /missions/primary */
export function MissionsPage() {
  return <Navigate to="/missions/primary" replace />
}
