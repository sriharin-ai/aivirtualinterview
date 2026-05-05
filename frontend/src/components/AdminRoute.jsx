import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

export default function AdminRoute() {
    const { adminUser } = useSelector(s => s.admin);
    return adminUser ? <Outlet /> : <Navigate to="/admin/login" replace />;
}
