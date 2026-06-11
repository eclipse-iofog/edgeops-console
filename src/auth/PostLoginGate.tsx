import { useEffect, type FC, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { resolvePostLoginGateRoute } from "./postLoginRedirect";

type PostLoginGateProps = {
  children: ReactNode;
};

const PostLoginGate: FC<PostLoginGateProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const profile = user?.profile;

  useEffect(() => {
    if (!isAuthenticated || !profile) {
      return;
    }

    const gateRoute = resolvePostLoginGateRoute(profile);
    if (!gateRoute || location.pathname === gateRoute) {
      return;
    }

    window.location.hash = `#${gateRoute.replace(/^\//, "")}`;
  }, [isAuthenticated, profile, location.pathname]);

  return children;
};

export default PostLoginGate;
