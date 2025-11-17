import requests
import os
from dotenv import load_dotenv
import time 

# Load environment variables from .env.local
load_dotenv('.env.local')

# Example: Get a key called 'MY_API_KEY' from .env.local
rl_key = os.getenv('RATE_LIMIT_TESTING_KEY')


# send initial request to crl api
player_tag_list = ["#8PU82CPP", "#208L9JQV9", '#LCQVUU2PP', '#8VLCRQ9R9', '#RCUCC9JG8', '#VG0U9PQ9R', 
    '#LCR9PLVC', '#9VRLPRC0V', '#29JYUGJRQ', '#YPV02J880', '#2QP8RPV9', '#8YQUYPJ', '#U8RP8G2VY', '#PVCGPVYGR']


header = { "Authorization": f"Bearer {rl_key}" }

p1_req = requests.get(url=f"https://api.clashroyale.com/v1/players/%23{player_tag_list[0][1:]}/battlelog", 
        headers=header)


# succesfully makes 140 requests using synchronous -> now will move to test asynch speed 
print(p1_req.status_code)
for i in range (10): 
    for tag in player_tag_list: 
        req = requests.get(url=f"https://api.clashroyale.com/v1/players/%23{tag[1:]}/battlelog", headers=header)
        print(req.status_code)

