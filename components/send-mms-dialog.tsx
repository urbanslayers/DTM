"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, X, ImageIcon, FileText, AlertTriangle } from "lucide-react"

interface SendMMSDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (data: {
    to: string[]
    subject: string
    body: string
    media: Array<{ type: string; filename: string; data: string }>
  }) => void
}

export function SendMMSDialog({ open, onOpenChange, onSend }: SendMMSDialogProps) {
  const [recipients, setRecipients] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [media, setMedia] = useState<Array<{ type: string; filename: string; data: string }>>([])
  const [dragOver, setDragOver] = useState(false)

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.size > 500000) {
        alert(`File ${file.name} is too large. Maximum size is 500KB.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setMedia((prev) => [
          ...prev,
          {
            type: file.type,
            filename: file.name,
            data: result,
          },
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = () => {
    if (!recipients.trim()) {
      alert("Please enter recipients")
      return
    }

    if (!body.trim() && media.length === 0) {
      alert("Please enter a message or attach media")
      return
    }

    const recipientList = recipients
      .split(/[;,\n]/)
      .map((r) => r.trim())
      .filter((r) => r.length > 0)

    onSend({
      to: recipientList,
      subject,
      body,
      media,
    })

    // Reset form
    setRecipients("")
    setSubject("")
    setBody("")
    setMedia([])
    onOpenChange(false)
  }

  const totalSize = media.reduce((sum, item) => sum + (item.data?.length || 0), 0)
  const sizeInKB = Math.round(totalSize / 1024)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send MMS Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="mms-recipients">Recipients</Label>
            <Textarea
              id="mms-recipients"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="Enter mobile numbers separated by semicolons"
              className="h-20"
            />
          </div>

          <div>
            <Label htmlFor="mms-subject">Subject (Optional)</Label>
            <Input
              id="mms-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject"
            />
          </div>

          <div>
            <Label htmlFor="mms-body">Message</Label>
            <Textarea
              id="mms-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter your message"
              className="h-24"
            />
          </div>

          {/* Media Upload */}
          <div>
            <Label>Media Attachments</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                handleFileUpload(e.dataTransfer.files)
              }}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Drag and drop files here, or click to select</p>
              <Input
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <Button variant="outline" onClick={() => document.getElementById("file-upload")?.click()}>
                Select Files
              </Button>
            </div>

            {/* Media Preview */}
            {media.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Attached Files ({media.length})</span>
                  <span className="text-sm text-gray-600">{sizeInKB}KB / 500KB</span>
                </div>
                {media.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 border rounded">
                    {item.type.startsWith("image/") ? (
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-gray-600" />
                    )}
                    <span className="flex-1 text-sm">{item.filename}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeMedia(index)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {sizeInKB > 500 && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Total file size exceeds 500KB limit. Please remove some files.</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sizeInKB > 500} className="flex-1">
              Send MMS
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
