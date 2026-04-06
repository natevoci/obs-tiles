// Extracts individual JPEG frames from an mjpeg byte stream
export class JpegFrameParser {
  private buffer: Buffer = Buffer.alloc(0)
  private inFrame = false
  private frameStart = 0

  push(chunk: Buffer): Buffer[] {
    this.buffer = Buffer.concat([this.buffer, chunk])
    const frames: Buffer[] = []

    let i = this.inFrame ? 0 : 0
    while (i < this.buffer.length - 1) {
      if (!this.inFrame) {
        if (this.buffer[i] === 0xFF && this.buffer[i + 1] === 0xD8) {
          this.inFrame = true
          this.frameStart = i
          i += 2
        } else {
          i++
        }
      } else {
        if (this.buffer[i] === 0xFF && this.buffer[i + 1] === 0xD9) {
          const frameEnd = i + 2
          frames.push(Buffer.from(this.buffer.slice(this.frameStart, frameEnd)))
          this.buffer = this.buffer.slice(frameEnd)
          this.frameStart = 0
          this.inFrame = false
          i = 0
        } else {
          i++
        }
      }
    }

    // Trim leading garbage when not in a frame
    if (!this.inFrame && this.buffer.length > 2) {
      // Keep last byte in case it starts FF of next SOI marker
      this.buffer = this.buffer.slice(-1)
    } else if (this.inFrame) {
      // Rebase to frameStart
      this.buffer = this.buffer.slice(this.frameStart)
      this.frameStart = 0
    }

    return frames
  }

  reset(): void {
    this.buffer = Buffer.alloc(0)
    this.inFrame = false
    this.frameStart = 0
  }
}
