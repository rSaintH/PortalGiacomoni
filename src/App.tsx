import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import ChangePassword from "@/pages/ChangePassword";

const Index = lazy(() => import("@/pages/Index"));
const Clients = lazy(() => import("@/pages/Clients"));
const ClientDetail = lazy(() => import("@/pages/ClientDetail"));
const ClientSectorView = lazy(() => import("@/pages/ClientSectorView"));
const Pops = lazy(() => import("@/pages/Pops"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const Admin = lazy(() => import("@/pages/Admin"));
const Reinf = lazy(() => import("@/pages/Reinf"));
const PopView = lazy(() => import("@/pages/PopView"));
const Documents = lazy(() => import("@/pages/Documents"));
const AccountingReady = lazy(() => import("@/pages/AccountingReady"));
const Management = lazy(() => import("@/pages/Management"));
const Customization = lazy(() => import("@/pages/Customization"));
const ExportData = lazy(() => import("@/pages/ExportData"));
const ImportData = lazy(() => import("@/pages/ImportData"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, mustChangePassword } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function ChangePasswordRoute() {
  const { user, loading, mustChangePassword } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!mustChangePassword) return <Navigate to="/" replace />;
  return <ChangePassword />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/change-password" element={<ChangePasswordRoute />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
              <Route path="/clients/:id/sector/:sectorId" element={<ProtectedRoute><ClientSectorView /></ProtectedRoute>} />
              <Route path="/pops" element={<ProtectedRoute><Pops /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
              <Route path="/reinf" element={<ProtectedRoute><Reinf /></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
              <Route path="/accounting-ready" element={<ProtectedRoute><AccountingReady /></ProtectedRoute>} />
              <Route path="/management" element={<ProtectedRoute><Management /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/pops/:popId" element={<ProtectedRoute><PopView /></ProtectedRoute>} />
              <Route path="/customization" element={<ProtectedRoute><Customization /></ProtectedRoute>} />
              <Route path="/export-data" element={<ProtectedRoute><ExportData /></ProtectedRoute>} />
              <Route path="/import-data" element={<ProtectedRoute><ImportData /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
