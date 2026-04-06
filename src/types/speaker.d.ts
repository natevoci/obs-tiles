/**
 * Minimal type declaration for the `speaker` npm package.
 * Full @types/speaker package is not available; this covers the subset used by RtspManager.
 */
declare module 'speaker' {
  import { Writable } from 'stream'

  interface SpeakerOptions {
    channels?: number
    bitDepth?: number
    sampleRate?: number
    signed?: boolean
    float?: boolean
    samplesPerFrame?: number
    device?: string
  }

  class Speaker extends Writable {
    constructor(options?: SpeakerOptions)
    closed: boolean
    on(event: 'error', listener: (err: Error) => void): this
    on(event: 'close', listener: () => void): this
    on(event: string, listener: (...args: any[]) => void): this
  }

  export = Speaker
}
