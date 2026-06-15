import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { initAnalytics, trackPageView } from '../lib/analytics'

export function Analytics() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    trackPageView(`${pathname}${search}${hash}`)
  }, [pathname, search, hash])

  return null
}
