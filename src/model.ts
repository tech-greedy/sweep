export enum MethodType {
  PreCommitSector = 'PreCommitSector',
  PreCommitSectorBatch = 'PreCommitSectorBatch',
  ProveCommitSector = 'ProveCommitSector',
  ProveCommitAggregate = 'ProveCommitAggregate',
}

export interface Message {
  cid: string,
  from: string,
  height: number,
  method: MethodType,
  nonce: number,
  Receipt: {
    exitCode: number
  },
  timestamp: number,
  to: string,
  value: string
}

export interface SectorOnChainInfo {
  Activation: number,
  InitialPledge: string,
}
