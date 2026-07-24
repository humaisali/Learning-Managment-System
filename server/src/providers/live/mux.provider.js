const config = require("../../config");
const logger = require("../../utils/logger");

/**
 * Mux Live provider for teacher broadcast micro sessions.
 * 
 * Flow:
 * 1. Teacher creates a session → we create a Mux Live Stream
 * 2. Teacher goes live → streams via RTMP using the stream key
 * 3. Students watch via HLS playback URL
 * 4. Teacher ends → stream stops, recording is auto-saved
 */

class MuxLiveProvider {
  constructor() {
    this.tokenId = config.mux.tokenId;
    this.tokenSecret = config.mux.tokenSecret;
    this.baseUrl = "https://api.mux.com";
  }

  _getAuthHeader() {
    const credentials = Buffer.from(`${this.tokenId}:${this.tokenSecret}`).toString("base64");
    return `Basic ${credentials}`;
  }

  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: {
        Authorization: this._getAuthHeader(),
        "Content-Type": "application/json",
      },
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);

    if (!response.ok) {
      const text = await response.text();
      logger.error("Mux API error", { status: response.status, url, body: text });
      throw new Error(`Mux API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create a new live stream on Mux.
   * Returns stream key (for teacher's OBS/browser) and playback ID.
   */
  async createLiveStream(metadata = {}) {
    if (!this.tokenId || !this.tokenSecret) {
      const mockId = `mock_stream_${Date.now()}`;
      logger.info("[DEV] Mock Mux live stream created", { mockId });
      return {
        streamId: mockId,
        streamKey: `mock_key_${mockId}`,
        playbackId: `mock_playback_${mockId}`,
        rtmpUrl: "rtmp://mock-mux.local/app",
        playbackUrl: `https://stream.mux.com/mock_playback_${mockId}.m3u8`,
        isMock: true,
      };
    }

    const response = await this._request("POST", "/video/v1/live-streams", {
      playback_policy: ["public"],
      new_asset_settings: {
        playback_policy: ["public"],
      },
      reduced_latency: true,
      test: config.env !== "production",
    });

    const stream = response.data;

    return {
      streamId: stream.id,
      streamKey: stream.stream_key,
      playbackId: stream.playback_ids?.[0]?.id,
      rtmpUrl: "rtmps://global-live.mux.com:443/app",
      playbackUrl: `https://stream.mux.com/${stream.playback_ids?.[0]?.id}.m3u8`,
    };
  }

  /**
   * Get the current status of a live stream.
   */
  async getStreamStatus(streamId) {
    if (!this.tokenId || streamId.startsWith("mock_")) {
      return { status: "idle", isMock: true };
    }

    const response = await this._request("GET", `/video/v1/live-streams/${streamId}`);
    return {
      status: response.data.status, // idle, active, disabled
      activeAssetId: response.data.active_asset_id,
      recentAssetIds: response.data.recent_asset_ids,
    };
  }

  /**
   * Get recording (asset) info after a stream ends.
   * Mux automatically creates an asset from the live stream recording.
   */
  async getRecording(assetId) {
    if (!this.tokenId || assetId?.startsWith("mock_")) {
      return {
        assetId: assetId || "mock_asset",
        playbackUrl: "https://stream.mux.com/mock_recording.m3u8",
        duration: 600,
        status: "ready",
        isMock: true,
      };
    }

    const response = await this._request("GET", `/video/v1/assets/${assetId}`);
    const asset = response.data;

    return {
      assetId: asset.id,
      playbackUrl: asset.playback_ids?.[0]
        ? `https://stream.mux.com/${asset.playback_ids[0].id}.m3u8`
        : null,
      duration: asset.duration,
      status: asset.status,
    };
  }

  /**
   * Disable/delete a live stream.
   */
  async disableStream(streamId) {
    if (!this.tokenId || streamId.startsWith("mock_")) {
      return { disabled: true };
    }

    await this._request("PUT", `/video/v1/live-streams/${streamId}/disable`);
    return { disabled: true };
  }
}

let instance = null;

function getLiveProvider() {
  if (!instance) instance = new MuxLiveProvider();
  return instance;
}

module.exports = { MuxLiveProvider, getLiveProvider };
