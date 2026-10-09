import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../../store/authStore";

// Pages that need a logged-in user.
//  - Visitor is logged out and opens /profile      -> /login, and remember /profile
//                                                     so they come back after logging in.
//  - Person presses Logout while ON this page      -> go HOME. Do NOT remember the page:
//                                                     the next person to log in on this
//                                                     screen must not land on someone
//                                                     else's /profile.
//  - Session simply expires while on this page     -> /login and remember the page.
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loggedOutByUser = useAuthStore((s) => s.loggedOutByUser);
  const location = useLocation();
  // Was this page on screen for a logged-in person when it first rendered?
  const [shownToLoggedInUser] = useState(isAuthenticated); // fixed at first render

  if (isAuthenticated) return children;
  if (shownToLoggedInUser && loggedOutByUser) return <Navigate to="/" replace />;
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;
