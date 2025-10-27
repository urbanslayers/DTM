import type { MediaFile } from "./types"
import { authService } from "./auth"

class MediaService {
  async getMediaFiles(): Promise<MediaFile[]> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return []

      const response = await fetch(`/api/media?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.files || [];
      }
    } catch (error) {
      console.error("[MediaService] Error getting media files:", error);
    }

    return []
  }

  async uploadFile(file: File): Promise<MediaFile | null> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return null

      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.file;
      }
    } catch (error) {
      console.error("[MediaService] Error uploading file:", error);
    }

    return null
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const user = authService.getCurrentUser()
      if (!user) return false

      const response = await fetch(`/api/media/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer user_${user.id}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("[MediaService] Error deleting file:", error);
      return false
    }
  }
}

export const mediaService = new MediaService()
