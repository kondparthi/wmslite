import { Navigate } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";

/**
 * Wraps every page that requires a real login. Redirects to the login page
 * ("/") if there's no valid token in localStorage — replacing the old
 * behavior where any URL was reachable directly with no login at all.
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
