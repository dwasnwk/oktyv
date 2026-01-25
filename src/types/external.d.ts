declare module 'archiver' {
  import { Stream } from 'stream';

  interface Archiver {
    append(source: Stream | Buffer | string, data?: any): Archiver;
    directory(dirpath: string, destpath: string | boolean): Archiver;
    file(filepath: string, data?: any): Archiver;
    finalize(): Promise<void>;
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
    on(event: string, callback: (...args: any[]) => void): this;
  }

  interface ArchiverOptions {
    zlib?: { level: number };
  }

  function archiver(format: string, options?: ArchiverOptions): Archiver;

  export = archiver;
}

declare module 'unzipper' {
  import { Stream } from 'stream';

  interface Entry {
    path: string;
    type: string;
    size: number;
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
    autodrain(): Promise<void>;
  }

  interface ParseOptions {
    path?: string;
  }

  export function Parse(options?: ParseOptions): Stream;
  export function Extract(options?: ParseOptions): Stream;
}
