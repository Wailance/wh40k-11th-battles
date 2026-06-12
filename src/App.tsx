import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ActiveGamePage } from './pages/ActiveGamePage'
import { DetachmentsPage } from './pages/DetachmentsPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { NewGamePage } from './pages/NewGamePage'
import { RulesPage } from './pages/RulesPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="new" element={<NewGamePage />} />
          <Route path="game" element={<ActiveGamePage />} />
          <Route path="detachments" element={<DetachmentsPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
