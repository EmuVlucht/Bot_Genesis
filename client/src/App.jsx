import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@contexts/AuthContext';
import { VaultProvider } from '@contexts/VaultContext';
import Login from '@pages/Login';
import Register from '@pages/Register';
import Vault from '@pages/Vault';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-dark-textSecondary">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/vault" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/vault"
        element={
          <ProtectedRoute>
            <VaultProvider>
              <Vault />
            </VaultProvider>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/vault" replace />} />
      <Route path="*" element={<Navigate to="/vault" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;