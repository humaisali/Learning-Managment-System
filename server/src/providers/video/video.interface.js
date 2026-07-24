/**
 * Video Provider Interface
 * 
 * All video operations go through this abstraction.
 * Swap implementations by changing the provider in config
 * without touching any business logic.
 */

class VideoProviderInterface {
  /**
   * Get a pre-signed upload URL for the teacher's browser to upload directly.
   * @returns {{ uploadUrl: string, videoId: string, headers?: object }}
   */
  async getUploadUrl(filename, metadata = {}) {
    throw new Error("getUploadUrl not implemented");
  }

  /**
   * Get a signed playback URL for a specific video.
   * Token-authenticated, time-limited.
   * @returns {{ playbackUrl: string, expiresAt: string, qualities: string[] }}
   */
  async getPlaybackUrl(videoId, userId) {
    throw new Error("getPlaybackUrl not implemented");
  }

  /**
   * Get video metadata (duration, status, available qualities).
   * @returns {{ videoId: string, status: string, duration: number, qualities: string[] }}
   */
  async getVideoInfo(videoId) {
    throw new Error("getVideoInfo not implemented");
  }

  /**
   * Delete a video from the provider.
   */
  async deleteVideo(videoId) {
    throw new Error("deleteVideo not implemented");
  }

  /**
   * Get a thumbnail URL for a video.
   * @returns {string}
   */
  getThumbnailUrl(videoId) {
    throw new Error("getThumbnailUrl not implemented");
  }
}

module.exports = VideoProviderInterface;
