import { Navigate, Outlet } from 'react-router-dom';

const OrgAdminRoute = () => {
    const token = localStorage.getItem('orgAdminToken');
    if (!token) return <Navigate to="/org-admin/login" replace />;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('orgAdminToken');
            return <Navigate to="/org-admin/login" replace />;
        }
        if (payload.role !== 'orgadmin') return <Navigate to="/org-admin/login" replace />;
    } catch {
        localStorage.removeItem('orgAdminToken');
        return <Navigate to="/org-admin/login" replace />;
    }
    return <Outlet />;
};

export default OrgAdminRoute;
