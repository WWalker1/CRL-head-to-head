import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'codex/editorial-meta-pipeline-20261122') {
  execFileSync('python3', ['-m','unittest','discover','-s','scripts/editorial'], {stdio:'inherit'});
  mkdirSync('public/editorial-preview', {recursive:true});
  execFileSync('python3', ['scripts/editorial/weekly_meta.py','--top','250','--out','public/editorial-preview/latest.json','--archive-dir','public/editorial-preview'], {stdio:'inherit'});
}
