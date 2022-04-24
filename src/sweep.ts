#!/usr/bin/env node
import { Command } from 'commander';
import packageJson from '../package.json';
import { MethodType } from './model';
import { fetch, getSectors } from './util';

const program = new Command();
const version = packageJson.version;
program.name('sweep')
  .version(version)
  .description('A tool to get transfer amount for precommits and provecommits');

program.option('--from <height_or_date>', "Height or Date as start range (inclusive)", "0")
  .option('--to <height_or_date>', "Height or Date as end range (exclusive)", "999999999")
  .requiredOption('--miner <address>')

program.parse();
const options = program.opts();
const miner = options.miner;

function toHeight(date: string) {
  const genesisTimestamp = 1598306400;
  if (/^\d+$/.test(date)) {
    return date;
  }

  const timestamp = Date.parse(date) / 1000;
  return Math.floor((timestamp - genesisTimestamp) / 30);
}

(async () => {
  const pre = (await fetch(miner, MethodType.PreCommitSector)).concat(await fetch(miner, MethodType.PreCommitSectorBatch));
  const prove = (await fetch(miner, MethodType.ProveCommitSector)).concat(await fetch(miner, MethodType.ProveCommitAggregate));
  const sectors = await getSectors(miner);
  const from = toHeight(options.from);
  const to = toHeight(options.to);
  const depositTransfered = pre.filter((message) => message.height >= from && message.height < to)
    .reduce((sum, message) => sum + BigInt(message.value), BigInt(0));
  const collateralTransfered = prove.filter((message) => message.height >= from && message.height < to)
    .reduce((sum, message) => sum + BigInt(message.value), BigInt(0));
  const collateralRequired = sectors.filter((sector) => sector.Activation >= from && sector.Activation < to)
    .reduce((sum, sector) => sum + BigInt(sector.InitialPledge), BigInt(0));

  console.log(`[A] Precommit deposit transfered: ${Number(depositTransfered) / 1e18}`);
  console.log(`[B] ProveCommit collateral transfered: ${Number(collateralTransfered) / 1e18}`);
  console.log(`[C] ProveCommit collateral required: ${Number(collateralRequired) / 1e18}`);
  console.log(`To return: [A] + [B] - [C] = ${Number(depositTransfered + collateralTransfered - collateralRequired) / 1e18}`)
})();
