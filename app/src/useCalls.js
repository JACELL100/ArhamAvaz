import { useCallback, useEffect, useState } from 'react'
import { listCalls } from './bolna'

// `enabled` is off on the public landing page so visitors don't trigger Bolna API calls
export default function useCalls(enabled = true) {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setCalls(await listCalls())
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    refresh()
    const id = setInterval(() => document.visibilityState === 'visible' && refresh(), 15000)
    return () => clearInterval(id)
  }, [refresh, enabled])

  return { calls, loading, error, refresh }
}
