import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Login from './pages/Login';
import LeaderDashboard from './pages/LeaderDashboard';
import ComplaintDetail from './pages/ComplaintDetail';
import VerificationPage from './pages/VerificationPage';
import SocialMediaInsights from './pages/SocialMediaInsights';
import Communications from './pages/Communications';
import PublicPortal from './pages/PublicPortal';
import RegisterComplaint from './pages/RegisterComplaint';
import ManageComplaints from './pages/ManageComplaints';
import MyProfile from './pages/MyProfile';
import MyComplaints from './pages/MyComplaints';
import CitizenDashboard from './pages/CitizenDashboard';
import HelpCenter from './pages/HelpCenter';
import AboutDeveloper from './pages/AboutDeveloper';

// Layout
import Navbar from './components/Common/Navbar';
import Sidebar from './components/Common/Sidebar';
import Footer from './components/Common/Footer';
import WelcomeSplash from './components/Common/WelcomeSplash';

function ProtectedLayout({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex flex-col app-shell-bg">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1480px]">
            {children}
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}

function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    const home = user.role === 'CITIZEN' ? '/register-complaint' : '/dashboard';
    return <Navigate to={home} replace />;
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}

function DashboardEntry() {
  const { user } = useAuth();
  if (user?.role === 'CITIZEN') return <CitizenDashboard />;
  return <LeaderDashboard />;
}

export default function App() {
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(true);
  const [isSplashFading, setIsSplashFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsSplashFading(true), 1600);
    const hideTimer = setTimeout(() => setShowWelcomeSplash(false), 2000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {showWelcomeSplash && <WelcomeSplash fading={isSplashFading} />}
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
            <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/public" element={<PublicPortal />} />
          <Route path="/public/ward/:wardId" element={<PublicPortal />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={<RoleRoute><DashboardEntry /></RoleRoute>}
          />
          <Route
            path="/manage-complaints"
            element={(
              <RoleRoute roles={['LEADER', 'DEPARTMENT_HEAD', 'WORKER', 'OFFICER', 'ENGINEER', 'ADMIN']}>
                <ManageComplaints />
              </RoleRoute>
            )}
          />
          <Route
            path="/register-complaint"
            element={(
              <RoleRoute roles={['CITIZEN']}>
                <RegisterComplaint />
              </RoleRoute>
            )}
          />
          <Route
            path="/my-complaints"
            element={(
              <RoleRoute roles={['CITIZEN']}>
                <MyComplaints />
              </RoleRoute>
            )}
          />
          <Route path="/complaints/:id" element={<RoleRoute><ComplaintDetail /></RoleRoute>} />
          <Route path="/verification/:id" element={<RoleRoute><VerificationPage /></RoleRoute>} />
          <Route
            path="/social"
            element={(
              <RoleRoute roles={['LEADER', 'DEPARTMENT_HEAD', 'ADMIN']}>
                <SocialMediaInsights />
              </RoleRoute>
            )}
          />
          <Route
            path="/communications"
            element={(
              <RoleRoute roles={['LEADER', 'DEPARTMENT_HEAD', 'ADMIN']}>
                <Communications />
              </RoleRoute>
            )}
          />
          <Route path="/help" element={<RoleRoute><HelpCenter /></RoleRoute>} />
          <Route path="/about-developer" element={<RoleRoute><AboutDeveloper /></RoleRoute>} />
          <Route path="/profile" element={<RoleRoute><MyProfile /></RoleRoute>} />

          {/* Default redirect */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
            </Routes>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </>
  );
}
