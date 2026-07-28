/**
 * `hostIdentity` domain (L3) — runtime identity of the embedding host.
 *
 * Composition roots may provide a product name and reply-style guide for the
 * system prompt. The registered default leaves both unset so standalone engine
 * consumers retain the existing CLI defaults.
 */

import { createDecorator, type ServiceIdentifier } from '#/_base/di/instantiation';
import { InstantiationType } from '#/_base/di/extensions';
import {
  LifecycleScope,
  registerScopedService,
  type ScopeSeed,
} from '#/_base/di/scope';

export interface HostIdentityOverrides {
  readonly productName?: string;
  readonly replyStyleGuide?: string;
}

export interface IHostIdentity {
  readonly _serviceBrand: undefined;
  readonly productName?: string;
  readonly replyStyleGuide?: string;
}

export const IHostIdentity: ServiceIdentifier<IHostIdentity> =
  createDecorator<IHostIdentity>('hostIdentity');

export class HostIdentity implements IHostIdentity {
  declare readonly _serviceBrand: undefined;

  constructor(
    readonly productName?: string,
    readonly replyStyleGuide?: string,
  ) {}
}

export function hostIdentitySeed(overrides: HostIdentityOverrides | undefined): ScopeSeed {
  if (overrides === undefined) return [];
  if (overrides.productName === undefined && overrides.replyStyleGuide === undefined) return [];
  return [
    [
      IHostIdentity as ServiceIdentifier<unknown>,
      new HostIdentity(overrides.productName, overrides.replyStyleGuide),
    ],
  ];
}

registerScopedService(
  LifecycleScope.App,
  IHostIdentity,
  HostIdentity,
  InstantiationType.Eager,
  'hostIdentity',
);
