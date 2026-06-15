export interface Serializer {
  parse(text: string): unknown;
  stringify(value: unknown): string;
}

type Widen<T> =
  T extends string ? string :
  T extends number ? number :
  T extends boolean ? boolean :
  T extends bigint ? bigint :
  T extends symbol ? symbol :
  T;

export class WebStorage {
  constructor(storageKey: "localStorage" | "sessionStorage", serializer?: Serializer);

  get<T = unknown>(key: string): T | null;
  get<T>(key: string, defaultValue: T): Widen<T>;

  set(key: string, value: unknown): void;

  remove(key: string): void;
}

export function createWebStorage(serializer?: Serializer): {
  LocalStorage: WebStorage;
  SessionStorage: WebStorage;
};

export const LocalStorage: WebStorage;
export const SessionStorage: WebStorage;
