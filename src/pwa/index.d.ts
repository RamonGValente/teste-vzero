export interface RegisterSWOptions {
  swUrl?: string;
  onNeedRefresh?: (refresh: () => void) => void;
  onOfflineReady?: () => void;
  onUpdated?: () => void;
  onRegisterError?: (err: any) => void;
}

export declare function registerSW(options?: RegisterSWOptions): void;

export declare function setupInstallDetector(opts?: {
  onChange?: (state: { canInstall?: boolean; installed?: boolean; iosA2HS?: boolean }) => void
}): void;

export declare function promptInstall(): Promise<{ outcome: 'accepted' | 'dismissed' | 'unsupported' }>;
