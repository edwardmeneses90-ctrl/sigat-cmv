import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import CatalogosPage from "./components/catalogos/CatalogosPage";
import Personas from "./pages/Personas";
import Activos from "./pages/Activos";
import Movimientos from "./pages/Movimientos";
import Mantenimientos from "./pages/Mantenimientos";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import Alertas from "./pages/Alertas";
import CargueMasivo from "./pages/CargueMasivo";
import SoportesTecnicos from "./pages/SoportesTecnicos";
import ConceptosBaja from "./pages/ConceptosBaja";
import SolicitudPublica from "./pages/SolicitudPublica";
import SolicitudesServicio from "./pages/SolicitudesServicio";

function PrivateLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100">
        <Sidebar />

        <div className="min-h-screen md:pl-64">
          <Header />

          <main className="p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* RUTAS PÚBLICAS */}
          <Route path="/login" element={<Login />} />
          <Route path="/solicitud" element={<SolicitudPublica />} />

          {/* RUTAS PRIVADAS */}
          <Route
            path="/"
            element={
              <PrivateLayout>
                <Dashboard />
              </PrivateLayout>
            }
          />

          <Route
            path="/activos"
            element={
              <PrivateLayout>
                <Activos />
              </PrivateLayout>
            }
          />

          <Route
            path="/movimientos"
            element={
              <PrivateLayout>
                <Movimientos />
              </PrivateLayout>
            }
          />

          <Route
            path="/mantenimientos"
            element={
              <PrivateLayout>
                <Mantenimientos />
              </PrivateLayout>
            }
          />

          <Route
            path="/personas"
            element={
              <PrivateLayout>
                <Personas />
              </PrivateLayout>
            }
          />

          <Route
            path="/catalogos"
            element={
              <PrivateLayout>
                <CatalogosPage />
              </PrivateLayout>
            }
          />

          <Route
            path="/reportes"
            element={
              <PrivateLayout>
                <Reportes />
              </PrivateLayout>
            }
          />

          <Route
            path="/alertas"
            element={
              <PrivateLayout>
                <Alertas />
              </PrivateLayout>
            }
          />

          <Route
            path="/cargue-masivo"
            element={
              <PrivateLayout>
                <CargueMasivo />
              </PrivateLayout>
            }
          />

          <Route
            path="/configuracion"
            element={
              <PrivateLayout>
                <Configuracion />
              </PrivateLayout>
            }
          />

          <Route
            path="/soportes-tecnicos"
            element={
              <PrivateLayout>
                <SoportesTecnicos />
              </PrivateLayout>
            }
          />

          <Route
            path="/conceptos-baja"
            element={
              <PrivateLayout>
                <ConceptosBaja />
              </PrivateLayout>
            }
          />

          <Route
            path="/solicitudes"
            element={
              <PrivateLayout>
                <SolicitudesServicio />
              </PrivateLayout>
            }
          />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
