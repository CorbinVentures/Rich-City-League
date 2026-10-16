/**
 * UI events for the optional, owner-only account-level location preference.
 * Do not persist account-specific state to browser storage. The only disk marker
 * records whether the current coarse local preference came from account sync.
 */
export const GRAVITY_ACCOUNT_STATUS_EVENT = 'rch:gravity-account-status';
export const GRAVITY_ACCOUNT_REQUEST_EVENT = 'rch:gravity-account-sync-request';
export const GRAVITY_ACCOUNT_REFRESH_EVENT = 'rch:gravity-account-refresh-request';
export const GRAVITY_ACCOUNT_APPLIED_KEY = 'rch:gravity-account-location-applied-v1';

export type GravityAccountStatus = {
  authenticated: boolean;
  loading: boolean;
  enabled: boolean;
  saving: boolean;
  error: string | null;
};

const DEFAULT: GravityAccountStatus = {
  authenticated:false,loading:true,enabled:false,saving:false,error:null,
};
let current: GravityAccountStatus = {...DEFAULT};

export function readGravityAccountStatus(): GravityAccountStatus {
  return {...current};
}
export function publishGravityAccountStatus(changes: Partial<GravityAccountStatus>) {
  current = {...current,...changes};
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GRAVITY_ACCOUNT_STATUS_EVENT,{detail:readGravityAccountStatus()}));
  }
}
export function requestGravityAccountSync(enabled: boolean) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GRAVITY_ACCOUNT_REQUEST_EVENT,{detail:{enabled}}));
  }
}
export function requestGravityAccountRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(GRAVITY_ACCOUNT_REFRESH_EVENT));
  }
}
