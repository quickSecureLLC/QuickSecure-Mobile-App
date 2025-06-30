declare module './KeychainManager' {
  export class KeychainManager {
    static getToken(): Promise<string | null>;
    static setToken(token: string): Promise<void>;
    static removeToken(): Promise<void>;
  }
}

declare module './LocationService' {
  interface Coordinates {
    latitude: number;
    longitude: number;
  }

  export class LocationService {
    static init(): Promise<void>;
    static getLastKnownCoords(): Promise<Coordinates | null>;
  }
} 