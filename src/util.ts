import axios from 'axios';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import retry from 'async-retry';
import { Message, MethodType, SectorOnChainInfo } from './model';

async function exists (path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

async function fetchMessages(miner: string, method: MethodType, lastHeight: number): Promise<Message[]> {
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
          console.warn('Fetch failed, retry in 60 secs...');
          throw e;
        }
        return r;
      }, {
        retries: 3,
        minTimeout: 60_000
      }
    );
    for (const message of response.data.messages) {
      if (message.height <= lastHeight) {
        breakOuter = true;
        break;
      }
      result.push(message);
    }
    page += 1;
  } while(!breakOuter && response.data.messages.length >= 100)
  return result;
}

export async function fetch(miner: string, method: MethodType) :Promise<Message[]> {
  const folder = path.join(os.homedir(), '.sweep');
  await fs.mkdir(folder, {recursive: true});
  const filePath = path.join(folder, `${miner}.${method}.json`);
  let cache: Message[] = []
  // Get cached state
  if (await exists(filePath)) {
    console.log(`Reading from cache ${filePath}`);
    const cachedContent = (await fs.readFile(filePath)).toString();
    cache = JSON.parse(cachedContent)
  }

  const lastHeight = Math.max(...cache.map((message) => message.height));
  cache.push(... await fetchMessages(miner, method, lastHeight));
  console.log(`Writing to cache ${filePath}`);
  await fs.writeFile(filePath, JSON.stringify(cache));
  return cache;
}

export async function getSectors(miner: string) : Promise<SectorOnChainInfo[]>{
  const url = 'https://api.node.glif.io/rpc/v0';
  const method = "Filecoin.StateMinerSectors";
  console.warn(`Fetching ${url} with ${method}`);
  const response = await axios.post(url, {
    "id":1,
    "jsonrpc":"2.0",
    "method":"Filecoin.StateMinerSectors",
    "params":[miner, null, null]
  });
  return response.data.result;
}
