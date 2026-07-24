const crypto = require("crypto");
const config = require("../../config");
const logger = require("../../utils/logger");
const VideoProviderInterface = require("./video.interface");

/**
 * Bunny Stream video provider.
 * 
 * Handles upload URLs, signed playback, and video metadata
 * through Bunny's Stream API. SD/HD adaptive streaming via HLS
 * is handled automatically by Bunny's transcoding pipeline.
 */
class BunnyProvider extends VideoProviderInterface {
  constructor() {
    super();
    this.apiKey = config.bunny.apiKey;
    this.libraryId = config.bunny.libraryId;
    this.cdnHostname = config.bunny.cdnHostname;
    this.baseUrl = `https://video.bunnycdn.com/library/${this.libraryId}`;
  }

  /**
   * Make an authenticated request to Bunny Stream API.
   */
  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: {
        AccessKey: this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);

    if (!response.ok) {
      const text = await response.text();
      logger.error("Bunny API error", { status: response.status, url, body: text });
      throw new Error(`Bunny API error: ${response.status} ${text}`);
    }

    return response.json();
  }

  /**
   * Create a video entry in Bunny and return the TUS upload URL.
   * The teacher's browser uploads directly to Bunny — video data
   * never touches our server.
   */
  async getUploadUrl(filename, metadata = {}) {
    // In development without real Bunny credentials, return mock
    if (!this.apiKey || !this.libraryId) {
      const mockId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      logger.info("[DEV] Mock video upload URL generated", { mockId, filename });
      return {
        uploadUrl: `https://mock-bunny.local/upload/${mockId}`,
        videoId: mockId,
        headers: {},
        isMock: true,
      };
    }

    // Create a video entry in Bunny
    const video = await this._request("POST", "/videos", {
      title: metadata.title || filename,
    });

    // Generate TUS upload URL
    const uploadUrl = `https://video.bunnycdn.com/tusupload`;
    const authHeader = this._generateTusAuthHeader(video.guid);

    return {
      uploadUrl,
      videoId: video.guid,
      headers: {
        AuthorizationSignature: authHeader.signature,
        AuthorizationExpire: authHeader.expire,
        VideoId: video.guid,
        LibraryId: this.libraryId,
      },
    };
  }

  /**
   * Generate signed playback URL with token authentication.
   * The token expires after a set period, preventing URL sharing.
   */
  async getPlaybackUrl(videoId, userId) {
    if (!this.apiKey || !this.cdnHostname) {
      return {
        playbackUrl: `https://mock-bunny.local/play/${videoId}/playlist.m3u8`,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        qualities: ["SD", "HD"],
        isMock: true,
      };
    }

    const expiresTimestamp = Math.floor(Date.now() / 1000) + 4 * 60 * 60; // 4 hours
    const playbackPath = `/${videoId}/playlist.m3u8`;

    // Generate signed URL token
    const token = this._generatePlaybackToken(playbackPath, expiresTimestamp);

    return {
      playbackUrl: `https://${this.cdnHostname}${playbackPath}?token=${token}&expires=${expiresTimestamp}`,
      expiresAt: new Date(expiresTimestamp * 1000).toISOString(),
      qualities: ["SD", "HD"],
    };
  }

  /**
   * Fetch video metadata from Bunny.
   */
  async getVideoInfo(videoId) {
    if (!this.apiKey || !this.libraryId) {
      return {
        videoId,
        status: "finished",
        duration: 0,
        qualities: ["SD", "HD"],
        isMock: true,
      };
    }

    const video = await this._request("GET", `/videos/${videoId}`);

    const statusMap = {
      0: "queued",
      1: "processing",
      2: "encoding",
      3: "finished",
      4: "error",
      5: "uploading",
      6: "uploading",
    };

    return {
      videoId: video.guid,
      status: statusMap[video.status] || "unknown",
      duration: video.length || 0,
      qualities: this._parseQualities(video),
      title: video.title,
      size: video.storageSize,
      thumbnailUrl: this.getThumbnailUrl(videoId),
    };
  }

  /**
   * Delete a video from Bunny Stream.
   */
  async deleteVideo(videoId) {
    if (!this.apiKey || !this.libraryId) {
      logger.info("[DEV] Mock video delete", { videoId });
      return { deleted: true };
    }

    await this._request("DELETE", `/videos/${videoId}`);
    return { deleted: true };
  }

  /**
   * Get a thumbnail URL for the video.
   */
  getThumbnailUrl(videoId) {
    if (!this.cdnHostname) {
      return `https://via.placeholder.com/320x180?text=Video`;
    }
    return `https://${this.cdnHostname}/${videoId}/thumbnail.jpg`;
  }

  /**
   * Generate TUS upload authentication header.
   */
  _generateTusAuthHeader(videoId) {
    const expire = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const signatureData = `${this.libraryId}${this.apiKey}${expire}${videoId}`;
    const signature = crypto
      .createHash("sha256")
      .update(signatureData)
      .digest("hex");

    return { signature, expire: expire.toString() };
  }

  /**
   * Generate a signed playback token.
   */
  _generatePlaybackToken(path, expires) {
    const hashInput = `${this.apiKey}${path}${expires}`;
    return crypto
      .createHash("sha256")
      .update(hashInput)
      .digest("hex");
  }

  /**
   * Parse available quality levels from Bunny video data.
   */
  _parseQualities(video) {
    const qualities = [];
    if (video.availableResolutions) {
      const resolutions = video.availableResolutions.split(",");
      resolutions.forEach((r) => {
        const height = parseInt(r);
        if (height <= 480) qualities.push("SD");
        else if (height <= 720) qualities.push("HD");
        else if (height <= 1080) qualities.push("FHD");
      });
    }
    return qualities.length > 0 ? [...new Set(qualities)] : ["SD", "HD"];
  }
}

// Singleton instance
let instance = null;

function getVideoProvider() {
  if (!instance) {
    instance = new BunnyProvider();
  }
  return instance;
}

module.exports = { BunnyProvider, getVideoProvider };
