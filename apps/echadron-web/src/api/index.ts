// apps/echadron-web/src/api/index.ts
// Singleton factory for the EchadronWebApi daemon client.

import { readEchadronApiConfig } from './config';
import type { EchadronWebApi } from './types';
import { DaemonEchadronWebApi } from './daemon/client';

let singleton: EchadronWebApi | undefined;

export function getEchadronWebApi(): EchadronWebApi {
  singleton ??= new DaemonEchadronWebApi(readEchadronApiConfig());
  return singleton;
}
