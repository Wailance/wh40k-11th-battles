import { lazy, Suspense, type ReactNode } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Analytics } from './components/Analytics'
import { Layout } from './components/Layout'
import { PageLoading } from './components/PageLoading'
import { HomePage } from './pages/HomePage'

const ActiveGamePage = lazy(() =>
  import('./pages/ActiveGamePage').then((m) => ({ default: m.ActiveGamePage })),
)
const NewGamePage = lazy(() => import('./pages/NewGamePage').then((m) => ({ default: m.NewGamePage })))
const DetachmentsPage = lazy(() =>
  import('./pages/DetachmentsPage').then((m) => ({ default: m.DetachmentsPage })),
)
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const MissionSequencePage = lazy(() =>
  import('./pages/MissionSequencePage').then((m) => ({ default: m.MissionSequencePage })),
)
const TeamsBpPage = lazy(() => import('./pages/TeamsBpPage').then((m) => ({ default: m.TeamsBpPage })))
const DominatusPage = lazy(() => import('./pages/DominatusPage').then((m) => ({ default: m.DominatusPage })))
const DoublesPage = lazy(() => import('./pages/DoublesPage').then((m) => ({ default: m.DoublesPage })))
const HistoryGamePage = lazy(() =>
  import('./pages/HistoryGamePage').then((m) => ({ default: m.HistoryGamePage })),
)
const ListsPage = lazy(() => import('./pages/ListsPage').then((m) => ({ default: m.ListsPage })))
const InDevPage = lazy(() => import('./pages/InDevPage').then((m) => ({ default: m.InDevPage })))
const ListBuilderPage = lazy(() =>
  import('./pages/ListBuilderPage').then((m) => ({ default: m.ListBuilderPage })),
)
const ReferencePage = lazy(() =>
  import('./pages/ReferencePage').then((m) => ({ default: m.ReferencePage })),
)
const RulesPage = lazy(() => import('./pages/RulesPage').then((m) => ({ default: m.RulesPage })))
const MatrixPage = lazy(() => import('./pages/MatrixPage').then((m) => ({ default: m.MatrixPage })))
const MissionsPage = lazy(() =>
  import('./pages/MissionsPage').then((m) => ({ default: m.MissionsPage })),
)
const PrimaryMissionsPage = lazy(() =>
  import('./pages/PrimaryMissionsPage').then((m) => ({ default: m.PrimaryMissionsPage })),
)
const SecondaryMissionsPage = lazy(() =>
  import('./pages/SecondaryMissionsPage').then((m) => ({ default: m.SecondaryMissionsPage })),
)
const ForceDispositionPage = lazy(() =>
  import('./pages/ForceDispositionPage').then((m) => ({ default: m.ForceDispositionPage })),
)
const MetaListsPage = lazy(() =>
  import('./pages/MetaListsPage').then((m) => ({ default: m.MetaListsPage })),
)

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>
}

export default function App() {
  return (
    <HashRouter>
      <Analytics />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route
            path="new"
            element={
              <LazyPage>
                <NewGamePage />
              </LazyPage>
            }
          />
          <Route
            path="new/dominatus"
            element={
              <LazyPage>
                <NewGamePage format="dominatus" />
              </LazyPage>
            }
          />
          <Route
            path="new/doubles"
            element={
              <LazyPage>
                <NewGamePage format="doubles" />
              </LazyPage>
            }
          />
          <Route
            path="game"
            element={
              <LazyPage>
                <ActiveGamePage />
              </LazyPage>
            }
          />
          <Route
            path="in-dev"
            element={
              <LazyPage>
                <InDevPage />
              </LazyPage>
            }
          />
          <Route
            path="lists"
            element={
              <LazyPage>
                <ListsPage />
              </LazyPage>
            }
          />
          <Route
            path="lists/meta"
            element={
              <LazyPage>
                <MetaListsPage />
              </LazyPage>
            }
          />
          <Route
            path="lists/new"
            element={
              <LazyPage>
                <ListBuilderPage />
              </LazyPage>
            }
          />
          <Route
            path="lists/:id"
            element={
              <LazyPage>
                <ListBuilderPage />
              </LazyPage>
            }
          />
          <Route
            path="detachments"
            element={
              <LazyPage>
                <DetachmentsPage />
              </LazyPage>
            }
          />
          <Route
            path="mission-sequence"
            element={
              <LazyPage>
                <MissionSequencePage />
              </LazyPage>
            }
          />
          <Route
            path="teams"
            element={
              <LazyPage>
                <TeamsBpPage />
              </LazyPage>
            }
          />
          <Route
            path="formats/dominatus"
            element={
              <LazyPage>
                <DominatusPage />
              </LazyPage>
            }
          />
          <Route
            path="formats/doubles"
            element={
              <LazyPage>
                <DoublesPage />
              </LazyPage>
            }
          />
          <Route
            path="reference"
            element={
              <LazyPage>
                <ReferencePage />
              </LazyPage>
            }
          />
          <Route
            path="matrix"
            element={
              <LazyPage>
                <MatrixPage />
              </LazyPage>
            }
          />
          <Route
            path="dispositions"
            element={
              <LazyPage>
                <ForceDispositionPage />
              </LazyPage>
            }
          />
          <Route
            path="missions"
            element={
              <LazyPage>
                <MissionsPage />
              </LazyPage>
            }
          />
          <Route
            path="missions/primary"
            element={
              <LazyPage>
                <PrimaryMissionsPage />
              </LazyPage>
            }
          />
          <Route
            path="missions/secondary"
            element={
              <LazyPage>
                <SecondaryMissionsPage />
              </LazyPage>
            }
          />
          <Route
            path="rules"
            element={
              <LazyPage>
                <RulesPage />
              </LazyPage>
            }
          />
          <Route
            path="history"
            element={
              <LazyPage>
                <HistoryPage />
              </LazyPage>
            }
          />
          <Route
            path="history/:id"
            element={
              <LazyPage>
                <HistoryGamePage />
              </LazyPage>
            }
          />
        </Route>
      </Routes>
    </HashRouter>
  )
}
