import '../../landing.css'
import '../../landing2.css'
import { useMemo, useState } from 'react'
import BookDemoModal from './BookDemoModal'
import Features from './Features'
import ProductDemo from './ProductDemo'
import FinalCTA from './FinalCTA'
import Footer from './Footer'
import Hero from './Hero'
import HowItWorks from './HowItWorks'
import Language from './Language'
import { LandingContext } from './LandingContext'
import Navbar from './Navbar'
import Overview from './Overview'
import UseCases from './UseCases'
import { reducedMotion } from './motion'

export default function LandingPage({ onLaunchApp }) {
  const [isBookDemoOpen, setIsBookDemoOpen] = useState(false)

  const value = useMemo(() => ({
    launch: (tab) => onLaunchApp(tab),
    openBookDemo: () => setIsBookDemoOpen(true),
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
          <HowItWorks />
          <Features />
          <ProductDemo />
          <UseCases />
          <Language />
          <Overview />
          <FinalCTA />
        </main>
        <Footer />
        <BookDemoModal isOpen={isBookDemoOpen} onClose={() => setIsBookDemoOpen(false)} />
      </div>
    </LandingContext.Provider>
  )
}

