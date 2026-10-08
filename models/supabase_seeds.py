"""Read-only extraction of community Clash Royale tags from Supabase.

The extractor intentionally requests only ``player_tag`` columns from the
two public application tables.  It never queries auth.users, emails, names,
or application battle rows, and it does not write to Supabase.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from collect import ROOT


TABLE_COLUMNS = {
    'tracked_friends': 'friend_player_tag',
    'user_ratings': 'player_tag',
}
TAG_RE = re.compile(r'^#[A-Z0-9]{3,15}$')


def load_env(path):
    """Load only key/value names needed by this script; values stay local."""
    values = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        text = line.strip()
        if not text or text.startswith('#'):
            continue
        name, sep, value = text.partition('=')
        if sep:
            values[name.strip()] = value.strip().strip('"\'')
    return values


def config(env_file):
    file_values = load_env(env_file)

    def first(names):
        for name in names:
            value = os.environ.get(name) or file_values.get(name)
            if value:
                return value.strip()
        return None

    url = first(('supabase_url', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'))
    key = first(('supabase_api_key', 'SUPABASE_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
                 'NEXT_PUBLIC_SUPABASE_ANON_KEY'))
    if key and key.startswith('sbp_'):
        return url or '', key
    if not url or not key:
        missing = []
        if not url:
            missing.append('Supabase URL (supabase_url or NEXT_PUBLIC_SUPABASE_URL)')
        if not key:
            missing.append('Supabase API key (supabase_api_key or SUPABASE_SERVICE_ROLE_KEY)')
        raise RuntimeError('Missing ' + ' and '.join(missing) +
                           '. No Supabase request was made.')
    return url.rstrip('/'), key


def normalize_tag(value):
    if not isinstance(value, str):
        return None
    tag = value.strip().upper()
    if not tag.startswith('#'):
        tag = '#' + tag
    return tag if TAG_RE.fullmatch(tag) else None


def fetch_page(url, key, table, column, limit, offset, opener=urlopen):
    query = urlencode({
        'select': column,
        column: 'not.is.null',
        'order': f'{column}.asc',
        'limit': str(limit),
        'offset': str(offset),
    })
    if key.startswith('sbp_'):
        raise RuntimeError('This is a Supabase management token; the table API needs a project API key. No request was sent.')
    headers={'apikey': key,'Accept': 'application/json'}
    if key.count('.')==2:headers['Authorization']='Bearer '+key
    request = Request(f'{url}/rest/v1/{table}?{query}', headers=headers)
    try:
        with opener(request, timeout=30) as response:
            payload = json.load(response)
    except HTTPError as error:
        raise RuntimeError(f'Supabase {table} query returned HTTP {error.code}; response body suppressed.') from None
    except URLError as error:
        raise RuntimeError(f'Supabase {table} query failed: {error.reason}') from None
    if not isinstance(payload, list):
        raise RuntimeError(f'Supabase {table} query returned an unexpected response shape.')
    return payload


def collect_tags(url, key, page_size=1000, opener=urlopen):
    if page_size <= 0 or page_size > 1000:
        raise ValueError('page_size must be between 1 and 1000')
    tags = set()
    report = {'tables': {}, 'source_rows': 0, 'accepted_rows': 0,
              'invalid_rows': 0, 'duplicate_rows': 0, 'pages': 0}
    for table, column in TABLE_COLUMNS.items():
        offset = 0
        table_rows = table_accepted = table_invalid = table_duplicates = table_pages = 0
        while True:
            rows = fetch_page(url, key, table, column, page_size, offset, opener=opener)
            table_pages += 1
            report['pages'] += 1
            for row in rows:
                table_rows += 1
                value = row.get(column) if isinstance(row, dict) else None
                tag = normalize_tag(value)
                if tag is None:
                    table_invalid += 1
                    continue
                table_accepted += 1
                if tag in tags:
                    table_duplicates += 1
                tags.add(tag)
            if len(rows) < page_size:
                break
            offset += page_size
        report['tables'][table] = {
            'column': column, 'rows': table_rows, 'accepted': table_accepted,
            'invalid': table_invalid, 'duplicates_against_all_sources': table_duplicates,
            'pages': table_pages,
        }
        report['source_rows'] += table_rows
        report['accepted_rows'] += table_accepted
        report['invalid_rows'] += table_invalid
        report['duplicate_rows'] += table_duplicates
    report['unique_tags'] = len(tags)
    return sorted(tags), report


def write_seed_file(path, tags, report):
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'source': 'Supabase tracked_friends.friend_player_tag and user_ratings.player_tag',
        'tags': tags,
        'counts': report,
    }
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    temporary.replace(path)


def management_tags(key):
    """Use the restricted read-only SQL endpoint; never retrieve project secrets."""
    def request(endpoint, query=None):
        data=json.dumps({'query':query}).encode() if query is not None else None
        req=Request('https://api.supabase.com/v1'+endpoint,data=data,
                    headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
        try:
            with urlopen(req,timeout=45) as response:return json.load(response)
        except HTTPError as error:
            raise RuntimeError(f'Supabase management request HTTP {error.code}; response suppressed.') from None
    projects=request('/projects')
    matches=[p for p in projects if re.sub('[^a-z]','',p.get('name','').lower()) in ('clashroyale','rivalroyale')]
    if len(matches)!=1:raise RuntimeError('Cannot uniquely identify Rival/Clash Royale project.')
    ref=matches[0].get('ref') or matches[0]['id']
    tags=set();offset=0;rows_read=0
    while True:
        query=f'''SELECT DISTINCT player_tag FROM (
            SELECT player_tag FROM public.user_ratings
            UNION SELECT friend_player_tag AS player_tag FROM public.tracked_friends
        ) AS seeds WHERE player_tag IS NOT NULL ORDER BY player_tag LIMIT 1000 OFFSET {offset}'''
        rows=request(f'/projects/{ref}/database/query/read-only',query)
        if not isinstance(rows,list):raise RuntimeError('Unexpected read-only query response shape')
        for row in rows:
            tag=normalize_tag(row.get('player_tag'))
            if tag:tags.add(tag)
        rows_read+=len(rows)
        if len(rows)<1000:break
        offset+=1000
    return sorted(tags),{'unique_tags':len(tags),'source_rows':rows_read,'project_ref':ref,'access':'management read-only query; player-tag columns only'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', type=Path, default=ROOT.parent / '.env')
    parser.add_argument('--output', type=Path, default=ROOT / 'data/community/seeds.json')
    parser.add_argument('--page-size', type=int, default=1000)
    args = parser.parse_args()
    url, key = config(args.env_file)
    tags, report = management_tags(key) if key.startswith('sbp_') else collect_tags(url, key, page_size=args.page_size)
    write_seed_file(args.output, tags, report)
    print(json.dumps({'output': str(args.output), 'counts': report}, indent=2), flush=True)


if __name__ == '__main__':
    main()
