import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import RiskRadarPage from './pages/RiskRadarPage.jsx'
import ScoreboardPage from './pages/ScoreboardPage.jsx'
import SumMapPage from './pages/SumMapPage.jsx'
import ConsultantPage from './pages/ConsultantPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<RiskRadarPage />} />
        <Route path="/scoreboard" element={<ScoreboardPage />} />
        <Route path="/sum-map" element={<SumMapPage />} />
        <Route path="/consultant" element={<ConsultantPage />} />
      </Routes>
    </BrowserRouter>
  )
}
