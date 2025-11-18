import os
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")

# Validate that environment variables are loaded
if not URL:
    raise ValueError(
        "NEXT_PUBLIC_SUPABASE_URL is not set. "
        "Please create a .env file with your Supabase credentials. "
        "You can use env.template as a reference."
    )

if not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError(
        "SUPABASE_SERVICE_ROLE_KEY is not set. "
        "Please create a .env file with your Supabase credentials. "
        "You can use env.template as a reference."
    )

# The correct signature for create_client is: create_client(url: str, key: str) -> Client
supabase: Client = create_client(URL, SUPABASE_SERVICE_ROLE_KEY)

supabase.auth.admin.delete_user(
    "5902983b-27bc-4edc-9b22-e14467c9275a"
)