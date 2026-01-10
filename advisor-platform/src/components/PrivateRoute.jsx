import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function PrivateRoute({ children, roles }) {
  const token = window.localStorage.getItem('token');
  const role = window.localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && role && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children || <Outlet />;
}
