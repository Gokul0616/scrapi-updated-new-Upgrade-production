import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { Sidebar } from "./components/Layout";
import { Home } from "./pages/Home";
import { Actors } from "./pages/Actors";
import { ActorDetail } from "./pages/ActorDetail";
import { Runs } from "./pages/Runs";
import { RunDetail } from "./pages/RunDetail";
import { Store } from "./pages/Store";
import { SavedTasks } from "./pages/SavedTasks";
import { ScrapedData } from "./pages/ScrapedData";
import { ScrapedDataEnhanced } from "./pages/ScrapedDataEnhanced";
import { CompareRuns } from "./pages/CompareRuns";
import { Integrations } from "./pages/Integrations";
import { Schedules } from "./pages/Schedules";
import { MyActors } from "./pages/MyActors";
import { Insights } from "./pages/Insights";
import { Messaging } from "./pages/Messaging";
import { Proxy } from "./pages/Proxy";
import { Settings } from "./pages/Settings";
import { Notifications } from "./pages/Notifications";
import { Issues } from "./pages/Issues";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import FloatingChatWidget from "./components/FloatingChatWidget";

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="App min-h-screen bg-background text-foreground">
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        } />
        <Route path="/signup" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Signup />
        } />
        
        {/* Protected Routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/actors" element={<Actors />} />
                  <Route path="/actors/:actorId" element={<ActorDetail />} />
                  <Route path="/runs" element={<Runs />} />
                  <Route path="/runs/:runId" element={<RunDetail />} />
                  <Route path="/store" element={<Store />} />
                  <Route path="/saved" element={<SavedTasks />} />
                  <Route path="/scraped-data" element={<ScrapedDataEnhanced />} />
                  <Route path="/compare-runs" element={<CompareRuns />} />
                  <Route path="/integrations" element={<Integrations />} />
                  <Route path="/schedules" element={<Schedules />} />
                  <Route path="/my-actors" element={<MyActors />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/messaging" element={<Messaging />} />
                  <Route path="/proxy" element={<Proxy />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/issues" element={<Issues />} />
                  <Route path="*" element={<Home />} />
                </Routes>
              </div>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
      <Toaster />
      <Sonner />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </NotificationProvider>
        </WebSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
