export enum ProviderConnectionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class ProviderConnectionResultDto {
  status: ProviderConnectionStatus;

  provider: string;

  channel: string;

  message: string;

  testedAt: string;
}