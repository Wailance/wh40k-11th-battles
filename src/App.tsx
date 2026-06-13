import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ActiveGamePage } from './pages/ActiveGamePage'
import { DetachmentsPage } from './pages/DetachmentsPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { NewGamePage } from './pages/NewGamePage'
import { MissionSequencePage } from './pages/MissionSequencePage'
import { TeamsBpPage } from './pages/TeamsBpPage'
import { FormatPlaceholderPage } from './pages/FormatPlaceholderPage'
import { HistoryGamePage } from './pages/HistoryGamePage'
import { ListsPage } from './pages/ListsPage'
import { ListBuilderPage } from './pages/ListBuilderPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="new" element={<NewGamePage />} />
          <Route path="game" element={<ActiveGamePage />} />
          <Route path="lists" element={<ListsPage />} />
          <Route path="lists/new" element={<ListBuilderPage />} />
          <Route path="lists/:id" element={<ListBuilderPage />} />
          <Route path="detachments" element={<DetachmentsPage />} />
          <Route path="mission-sequence" element={<MissionSequencePage />} />
          <Route path="teams" element={<TeamsBpPage />} />
          <Route path="formats/dominatus" element={<FormatPlaceholderPage format="dominatus" />} />
          <Route path="formats/doubles" element={<FormatPlaceholderPage format="doubles" />} />
          <Route path="rules" element={<MissionSequencePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="history/:id" element={<HistoryGamePage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
