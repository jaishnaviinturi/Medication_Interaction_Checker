import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { MedicationForm } from './pages/MedicationForm';
import { SideEffectsPage } from './pages/SideEffectsPage';
import { DrugInfoPage } from './pages/DrugInfoPage';
import { FoodInteractionsPage } from './pages/FoodInteractionsPage';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/check-medications" element={<MedicationForm />} />
            <Route path="/side-effects" element={<SideEffectsPage />} />
            <Route path="/drug-info" element={<DrugInfoPage />} />
            <Route path="/food-interactions" element={<FoodInteractionsPage />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;