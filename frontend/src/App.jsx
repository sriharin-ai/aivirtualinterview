import React from 'react'
import { Routes, Route } from 'react-router-dom'
import useSocket from './hooks/useSocket';
import { ToastContainer } from 'react-toastify';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import InterviewRunner from './pages/InterviewRunner';
import SessionReview from './pages/SessionReview';
import SharedReview from './pages/SharedReview';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import OrgAdminLogin from './pages/OrgAdminLogin';
import OrgAdminDashboard from './pages/OrgAdminDashboard';
import OrgAdminRoute from './components/OrgAdminRoute';
import NotFound from './pages/NotFound';
import LandingPage from './pages/LandingPage';
import CollegeLanding from './pages/CollegeLanding';
import CorporateLanding from './pages/CorporateLanding';
import OrgSignup from './pages/OrgSignup';
import OrgDemo from './pages/OrgDemo';

const UserLayout = ({ children }) => (
  <>
    <Header />
    <main className='container mx-auto p-4'>{children}</main>
    <ToastContainer position='top-right' autoClose={3000} />
  </>
);

const App = () => {
  useSocket();
  return (
    <div className='min-h-screen bg-gray-50'>
      <Routes>
        {/* ── Super Admin (no user header) ── */}
        <Route path='/admin/login' element={<AdminLogin />} />
        <Route path='/admin' element={<AdminRoute />}>
          <Route index element={<AdminDashboard />} />
        </Route>

        {/* ── Org Admin (no user header) ── */}
        <Route path='/org-admin/login' element={<OrgAdminLogin />} />
        <Route path='/org-admin' element={<OrgAdminRoute />}>
          <Route index element={<OrgAdminDashboard />} />
        </Route>

        {/* ── Public marketing routes (no header) ── */}
        <Route path='/'           element={<LandingPage />} />
        <Route path='/college'    element={<CollegeLanding />} />
        <Route path='/corporate'  element={<CorporateLanding />} />
        <Route path='/org/signup' element={<OrgSignup />} />
        <Route path='/org/demo'   element={<OrgDemo />} />

        {/* ── Public user routes ── */}
        <Route path='/login'    element={<UserLayout><Login /></UserLayout>} />
        <Route path='/register' element={<UserLayout><Register /></UserLayout>} />
        <Route path='/shared/:shareToken' element={<UserLayout><SharedReview /></UserLayout>} />

        {/* ── Protected user routes ── */}
        <Route element={<PrivateRoute />}>
          <Route path='/dashboard'              element={<UserLayout><Dashboard /></UserLayout>} />
          <Route path='/profile'                element={<UserLayout><Profile /></UserLayout>} />
          <Route path='/interview/:sessionId'   element={<UserLayout><InterviewRunner /></UserLayout>} />
          <Route path='/review/:sessionId'      element={<UserLayout><SessionReview /></UserLayout>} />
        </Route>

        {/* ── 404 ── */}
        <Route path='*' element={<UserLayout><NotFound /></UserLayout>} />
      </Routes>
    </div>
  );
};

export default App
