import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Checklist3991Page from './pages/Checklist3991Page';

const App = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/3991" element={<Checklist3991Page />} />
  </Routes>
);

export default App;
