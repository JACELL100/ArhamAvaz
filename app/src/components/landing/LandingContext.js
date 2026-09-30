import { createContext, useContext } from 'react'

// go(e, id) scrolls to a section; launch(tab) opens the app on that tab; openBookDemo() opens demo booking modal
export const LandingContext = createContext({ go: () => {}, launch: () => {}, openBookDemo: () => {} })

export const useLanding = () => useContext(LandingContext)
