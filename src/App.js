import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import AppHome from './App';   
import AppHome from './components/AppHome';             // your main MUI dashboard
import AthenaDashboard from './components/AthenaDashboard'; // your AthenaDashboard file

function MainRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppHome />} />
        <Route path="/athena" element={<AthenaDashboard />} />
      </Routes>
    </Router>
  );
}

export default MainRouter;
