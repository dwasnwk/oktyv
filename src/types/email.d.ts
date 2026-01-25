// Type declarations for imap (no @types available)
declare module 'imap' {
  export default class Imap {
    constructor(config: any);
    connect(): void;
    end(): void;
    openBox(name: string, readOnly: boolean, callback: (err: Error | null) => void): void;
    search(criteria: string[], callback: (err: Error | null, results: number[]) => void): void;
    fetch(source: number[], options: any): any;
    once(event: string, callback: (...args: any[]) => void): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }
}

// Type declarations for mailparser (basic types)
declare module 'mailparser' {
  export function simpleParser(source: string | Buffer): Promise<any>;
}

// Type declarations for nodemailer (basic types)
declare module 'nodemailer' {
  export interface Transporter {
    sendMail(options: any): Promise<any>;
    verify(): Promise<boolean>;
    close(): void;
  }
  
  function createTransport(config: any): Transporter;
  
  export default {
    createTransport
  };
}
