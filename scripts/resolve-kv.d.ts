export function parseJsonc(content: string): any;
export function maskId(id: string): string;
export function validateCloudflareInputs(env: Record<string, string | undefined>): any;
export function cfFetch(url: string, options: any, fetchImpl?: typeof fetch): Promise<any>;
export function fetchKvNamespaces(accountId: string, token: string, fetchImpl?: typeof fetch): Promise<any[]>;
export function fetchWorkerBindings(accountId: string, scriptName: string, token: string, fetchImpl?: typeof fetch): Promise<any[]>;
export function createKvNamespace(accountId: string, title: string, token: string, fetchImpl?: typeof fetch): Promise<any>;
export function resolveKvNamespace(options: any): Promise<any>;
export function generateProductionConfig(baseConfig: any, kvNamespaceId: string, outputPath: string): void;
