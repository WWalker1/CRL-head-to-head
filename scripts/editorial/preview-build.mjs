// Run explicitly on a development host with a read-only Clash Royale API key.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
if (process.env.VERCEL_ENV === 'production') throw new Error('Development only');
mkdirSync('.local/editorial-preview', {recursive:true});
execFileSync('python3', ['scripts/editorial/weekly_meta.py','--top','250','--out','.local/editorial-preview/latest.json','--archive-dir','.local/editorial-preview'], {stdio:'inherit'});
