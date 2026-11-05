import { createRoot } from "react-dom/client";
import { SpSpa } from "pankosmia-rcl";
import App from "./App";
import "./index.css";

function AppLayout() {
  return (
    <SpSpa
      requireNet={false}
      titleKey="pages:textTranslation_dif:title"
      currentId="textTranslation_dif"
    >
      <App />
    </SpSpa>
  );
}

createRoot(document.getElementById("root")).render(<AppLayout />);
