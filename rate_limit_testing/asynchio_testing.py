import asyncio
import time
from dotenv import load_dotenv
import os
import httpx

# Load environment variables from .env.local
load_dotenv('.env.local')

rl_key = os.getenv('RATE_LIMIT_TESTING_KEY')
player_tag_list = [
    "#8PU82CPP", "#208L9JQV9", '#LCQVUU2PP', '#8VLCRQ9R9', '#RCUCC9JG8',
    '#VG0U9PQ9R', '#LCR9PLVC', '#9VRLPRC0V', '#29JYUGJRQ', '#YPV02J880',
    '#2QP8RPV9', '#8YQUYPJ', '#U8RP8G2VY', '#PVCGPVYGR', '#L2UP9GP9J'
]

header = {"Authorization": f"Bearer {rl_key}"}


async def fetch_status(client, tag):
    url = f"https://api.clashroyale.com/v1/players/%23{tag[1:]}/battlelog"
    resp = await client.get(url, headers=header)
    print(resp.status_code)
    return resp

async def main():
    total_duration = 300  # Run for 10 seconds
    start_time = time.time()
    round_count = 0
    async with httpx.AsyncClient() as client:
        while True:
            now = time.time()
            elapsed = now - start_time
            if elapsed >= total_duration:
                break
            batch_start = time.time()
            print(f"\n=== Starting batch {round_count+1} at {elapsed:.2f}s ===")
            tasks = [fetch_status(client, tag) for tag in player_tag_list]
            status_codes = await asyncio.gather(*tasks)
            print(status_codes)
            round_count += 1
            for resp in status_codes: 
                print(resp.status_code)
                if resp.status_code == 429: 
                    break 
            # Ensure each run takes at least half a second
            batch_elapsed = time.time() - batch_start
            if batch_elapsed < 0.5:
                await asyncio.sleep(0.5 - batch_elapsed)
    end_time = time.time()
    print(f"Total time taken: {end_time - start_time:.2f} seconds, Batches run: {round_count}")
    print(f"Total requests made: {round_count * 15}")

if __name__ == "__main__":
    asyncio.run(main())
