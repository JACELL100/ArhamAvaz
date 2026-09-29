import { useCallback, useEffect, useState } from 'react'
import { listCalls } from './bolna'
import { getAgents } from './api'

export default function useCalls() {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      // Fetch calls for all Bolna language agents
      setCalls(await listCalls())
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(() => document.visibilityState === 'visible' && refresh(), 15000)
    return () => clearInterval(id)
  }, [refresh])

  return { calls, loading, error, refresh }
}
