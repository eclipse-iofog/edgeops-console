import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { hydrateTokensFromStorage } from "./auth/tokenStore";
import { applyPostLogoutBootstrap, installBfcacheSessionGuard, runAuthBootstrap } from "./auth";

hydrateTokensFromStorage();
applyPostLogoutBootstrap();
runAuthBootstrap();
installBfcacheSessionGuard();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
