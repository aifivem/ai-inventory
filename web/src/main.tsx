import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { config } from "@fortawesome/fontawesome-svg-core"
import { isEnvBrowser } from "fivem-nui-react"
import { App } from "./App"
import { store } from "./store"
import "./index.css"

// FA's injected unlayered CSS would beat Tailwind's icon sizes; its styles come from index.css in @layer base.
config.autoAddCss = false
// Browser preview only: a game-like backdrop (the page is transparent in game).
if (isEnvBrowser())
  document.body.style.background =
    "linear-gradient(135deg, #3a3a3a 0%, #0e0e0e 100%)"

const root = document.getElementById("root")
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </StrictMode>
  )
}
