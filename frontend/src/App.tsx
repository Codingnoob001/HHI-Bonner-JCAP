import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/dashboard/Dashboard';
import PatientRecords from './components/patients/PatientRecords';
import PatientDetail from './components/patients/PatientDetail';
import Billing from './components/billing/Billing';
import Reports from './components/reports/Reports';
import FinancialReports from './components/reports/FinancialReports';
import Settings from './components/settings/Settings';
import { SearchProvider } from './components/SearchContext';
import { ThemeProvider } from './components/ThemeContext';
export function App() {
  return <Router>
      <ThemeProvider>
        <SearchProvider>
          <Layout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/patients" element={<PatientRecords />} />
              <Route path="/patients/:clientId" element={<PatientDetail />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/financial-reports" element={<FinancialReports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </SearchProvider>
      </ThemeProvider>
    </Router>;
}