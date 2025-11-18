import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EventPage from './pages/EventPage';
import SuccessPage from './pages/SuccessPage';
import CancelPage from './pages/CancelPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EventPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/cancel" element={<CancelPage />} />
      </Routes>
    </Router>
  );
}

export default App;
