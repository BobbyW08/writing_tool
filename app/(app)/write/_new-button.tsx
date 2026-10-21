'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createWriting } from '@/lib/studio/actions'
import { Button } from '@/components/ui/button'

export function NewWritingButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleNew() {
    startTransition(async () => {
      const result = await createWriting('Untitled')
      if (result.code) router.push(`/write/${result.code}`)
    })
  }

  return (
    <Button onClick={handleNew} disabled={pending}>
      {pending ? 'Creating...' : 'New'}
    </Button>
  )
}
