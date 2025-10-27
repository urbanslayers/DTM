"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Clock } from "lucide-react"

interface SendLaterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSchedule: (scheduledAt: Date) => void
}

export function SendLaterDialog({ open, onOpenChange, onSchedule }: SendLaterDialogProps) {
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")

  const handleSchedule = () => {
    if (date && time) {
      const scheduledAt = new Date(`${date}T${time}`)
      onSchedule(scheduledAt)
      onOpenChange(false)
      setDate("")
      setTime("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Schedule Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time
            </Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={!date || !time} className="flex-1">
              Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
