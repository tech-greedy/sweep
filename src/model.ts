export interface LastProcessed {
  precommit: number,
  precommitbatch: number,
}

export interface SectorInfo {
  height: number,
  deposit: string,
}

export interface CacheContent {
  last: LastProcessed,
  sectors: SectorInfo[],
}
