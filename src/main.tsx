import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { hydrateTokensFromStorage } from "./auth/tokenStore";
import { runAuthBootstrap } from "./auth";

hydrateTokensFromStorage();
runAuthBootstrap();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
