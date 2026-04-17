import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../auth/tokens';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const loc = useLocation();
  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return children;
};
