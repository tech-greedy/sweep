import axios from 'axios';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import retry from 'async-retry';
import { CacheContent } from './model';

async function exists (path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

async function fetchMessages(miner: string, method: string, last: number): Promise<any[]> {
  let page = 0;
  let response;
  let breakOuter = false;
  let result: any[] = [];
  do {
    response = await retry(
      async () => {
        const url = `https://filfox.info/api/v1/address/${ miner }/messages?pageSize=100&page=${ page }&method=${ method }`
        console.log(`Fetching ${ url }`);
        let r;
        try {
          r = await axios.get(url)
        } catch (e) {
          console.warn(e);
          throw e;
        }
        return r;
      }, {
        retries: 3,
        minTimeout: 60_000
      }
    );
    for (const message of response.data.messages) {
      if (message.height <= last) {
        breakOuter = true;
        break;
      }
      result.push(message);
    }
    page += 1;
  } while(!breakOuter && response.data.messages.length >= 100)
  return result;
}

export default async function fetch(miner: string) :Promise<CacheContent> {
  const folder = path.join(os.homedir(), '.sweep');
  await fs.mkdir(folder, {recursive: true});
  const filePath = path.join(folder, `${miner}.cached.json`);
  let cache: CacheContent = {
    last: {
      precommit: -1,
      precommitbatch: -1,
    },
    sectors: []
  };
  // Get cached state
  if (await exists(filePath)) {
    console.log(`Reading from cache ${filePath}`);
    const cachedContent = (await fs.readFile(filePath)).toString();
    cache = JSON.parse(cachedContent)
  }

  for(const message of await fetchMessages(miner, "PreCommitSector", cache.last.precommit)) {
    cache.sectors.push({
      height: message.height,
      deposit: message.value,
    })
    if (message.height > cache.last.precommit) {
      cache.last.precommit = message.height;
    }
  }
  for(const message of await fetchMessages(miner, "PreCommitSectorBatch", cache.last.precommitbatch)) {
    cache.sectors.push({
      height: message.height,
      deposit: message.value,
    })
    if (message.height > cache.last.precommitbatch) {
      cache.last.precommitbatch = message.height;
    }
  }
  console.log(`Writing to cache ${filePath}`);
  await fs.writeFile(filePath, JSON.stringify(cache));
  return cache;
}
