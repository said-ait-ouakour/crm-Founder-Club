import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

interface TrainingStatus {
  systemLookedUp: boolean
  loading: boolean
  error: string | null
  message?: string
}

export function useTrainingStatus() {
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    systemLookedUp: false,
    loading: true,
    error: null
  })
  const { user, isAdvisor } = useAuth()

  useEffect(() => {
    async function checkTrainingStatus() {
      if (!user || !isAdvisor) {
        setTrainingStatus({
          systemLookedUp: true, // Non-advisors are always unlocked
          loading: false,
          error: null
        })
        return
      }

      try {
        setTrainingStatus(prev => ({ ...prev, loading: true, error: null }))
        
        const response = await fetch(`/api/training/check-completion?userId=${user.id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check training status')
        }

        setTrainingStatus({
          systemLookedUp: data.systemLookedUp,
          loading: false,
          error: null,
          message: data.message
        })
      } catch (error) {
        console.error('Error checking training status:', error)
        setTrainingStatus({
          systemLookedUp: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    checkTrainingStatus()
  }, [user, isAdvisor])

  return trainingStatus
}
