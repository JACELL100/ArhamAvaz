import { createContext, useContext } from 'react'

// go(e, id) scrolls to a section; launch(tab) opens the app on that tab
export const LandingContext = createContext({ go: () => {}, launch: () => {} })

export const useLanding = () => useContext(LandingContext)
