declare module 'node-red-contrib-bravia2' {
  export interface BraviaDevice {
    host: string;
    port: number;
    friendlyName: string;
    manufacturer: string;
    manufacturerURL: string;
    modelName: string;
    UDN: string;
  }

  export interface IRCCCode {
    name: string;
    value: string;
  }

  export interface MethodVersion {
    version: string;
    methods: unknown[];
  }

  export class ServiceProtocol {
    constructor(bravia: Bravia, protocol: string);
    getVersions(): Promise<string[]>;
    getMethodTypes(version?: string): Promise<MethodVersion | MethodVersion[]>;
    invoke(method: string, version?: string, params?: unknown): Promise<unknown>;
  }

  export class Bravia {
    constructor(host: string, port?: number, psk?: string, timeout?: number);
    
    host: string;
    port: number;
    psk: string;
    timeout: number;
    protocols: string[];
    delay: number;

    // Service protocols
    accessControl: ServiceProtocol;
    appControl: ServiceProtocol;
    audio: ServiceProtocol;
    avContent: ServiceProtocol;
    browser: ServiceProtocol;
    cec: ServiceProtocol;
    encryption: ServiceProtocol;
    guide: ServiceProtocol;
    recording: ServiceProtocol;
    system: ServiceProtocol;
    videoScreen: ServiceProtocol;

    static discover(timeout?: number): Promise<BraviaDevice[]>;
    getIRCCCodes(): Promise<IRCCCode[]>;
    send(codes: string | string[]): Promise<void>;
  }

  export default Bravia;
}
