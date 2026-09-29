import '../../landing.css'
import { useMemo } from 'react'
import BulkCalling from './BulkCalling'
import Control from './Control'
import FinalCTA from './FinalCTA'
import Footer from './Footer'
import Hero from './Hero'
import HowItWorks from './HowItWorks'
import Insights from './Insights'
import Language from './Language'
import { LandingContext } from './LandingContext'
import Navbar from './Navbar'
import Overview from './Overview'
import Problem from './Problem'
import Record from './Record'
import Review from './Review'
import Schedule from './Schedule'
import ScriptDemo from './ScriptDemo'
import UseCases from './UseCases'
import { reducedMotion } from './motion'

export default function LandingPage({ onLaunchApp }) {
  const value = useMemo(() => ({
    launch: (tab) => onLaunchApp(tab),
    go: (e, id) => {
      e?.preventDefault()
      const behavior = reducedMotion() ? 'auto' : 'smooth'
      if (id === 'top') window.scrollTo({ top: 0, behavior })
      else document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' })
    },
  }), [onLaunchApp])

  return (
    <LandingContext.Provider value={value}>
      <div className="lp-root">
        <Navbar />
        <main>
          <Hero />
          <Problem />
          <Overview />
          <HowItWorks />
          <Language />
          <ScriptDemo />
          <BulkCalling />
          <Schedule />
          <Review />
          <Insights />
          <UseCases />
          <Control />
          <Record />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </LandingContext.Provider>
  )
}
