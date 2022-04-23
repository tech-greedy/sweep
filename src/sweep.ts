#!/usr/bin/env node
import { Command } from 'commander';
import packageJson from '../package.json';
import fetch from './util';

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
  const cache = await fetch(miner);
  const from = toHeight(options.from);
  const to = toHeight(options.to);
  let deposit = BigInt(0);
  for(const sector of cache.sectors) {
    if (sector.height >= from && sector.height < to) {
      deposit += BigInt(sector.deposit);
    }
  }

  console.log(Number(deposit) / 1e18);
})();
