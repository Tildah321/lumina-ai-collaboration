import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PlanProvider } from "./contexts/PlanContext";
import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ClientSpace from "./pages/ClientSpace";
import ClientView from "./pages/ClientView";
import ClientByToken from "./pages/ClientByToken";
import ClientAccess from "./pages/ClientAccess";
import Tasky from "./pages/Tasky";
import Pipou from "./pages/Pipou";
import Copyly from "./pages/Copyly";
import Mailo from "./pages/Mailo";
import Upgrade from "./pages/Upgrade";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return (
    <PlanProvider>
      <Layout>{children}</Layout>
    </PlanProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/client-access" element={<ClientAccess />} />

            {/* Shared client spaces */}
            <Route path="/client/:token" element={<ClientByToken />} />
            <Route path="/client-view/:id" element={<ClientView />} />

            {/* Protected App Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            {/* Internal client space management */}
            <Route path="/client-space/:id" element={
              <ProtectedRoute>
                <ClientSpace />
              </ProtectedRoute>
            } />
            <Route path="/tasky" element={
              <ProtectedRoute>
                <Tasky />
              </ProtectedRoute>
            } />
            <Route path="/pipou" element={
              <ProtectedRoute>
                <Pipou />
              </ProtectedRoute>
            } />
            <Route path="/copyly" element={
              <ProtectedRoute>
                <Copyly />
              </ProtectedRoute>
            } />
            <Route path="/mailo" element={
              <ProtectedRoute>
                <Mailo />
              </ProtectedRoute>
            } />
            <Route path="/upgrade" element={
              <ProtectedRoute>
                <Upgrade />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
