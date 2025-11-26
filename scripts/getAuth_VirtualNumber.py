# scripts/get_token_and_virtual_numbers.py
import requests
import sys
from typing import Optional

# === CONFIG: put your credentials here ===
CLIENT_ID = "Add-your_client_id_here"
CLIENT_SECRET = "Add-your_client_secret_here"

# Token endpoint (products api v2 token)
TOKEN_URL = "https://products.api.telstra.com/v2/oauth/token"

# Virtual numbers endpoint you requested
VIRTUAL_NUMBERS_URL = "https://products.api.telstra.com/messaging/v3/virtual-numbers"

# === FUNCTIONS ===
def get_token(client_id: str, client_secret: str) -> dict:
    """
    Obtain OAuth2 client_credentials token.
    Returns the parsed JSON token response.
    """
    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "free-trial-numbers:read free-trial-numbers:write messages:read messages:write reports:read reports:write virtual-numbers:read virtual-numbers:write"
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    print("Requesting OAuth token...")
    r = requests.post(TOKEN_URL, data=payload, headers=headers, timeout=10)
    print("Token Status:", r.status_code)
    print("Token Response:", r.text)
    r.raise_for_status()
    return r.json()

def list_virtual_numbers(access_token: str) -> Optional[dict]:
    """
    GET the virtual numbers from Telstra messaging v3 endpoint.
    Returns parsed JSON or None if 204/empty.
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    print("\nRequesting virtual numbers...")
    r = requests.get(VIRTUAL_NUMBERS_URL, headers=headers, timeout=10)
    print("Virtual Numbers Status:", r.status_code)
    print("Response:", r.text)
    if r.status_code in (204,):
        return None
    if r.status_code == 404:
        # Helpful early return for debugging: endpoint/host mismatch or not available
        return None
    r.raise_for_status()
    return r.json()

# === MAIN ===
if __name__ == "__main__":
    try:
        token_data = get_token(CLIENT_ID, CLIENT_SECRET)
        access_token = token_data.get("access_token")
        if not access_token:
            print("No access_token in token response. Check CLIENT_ID/CLIENT_SECRET and token response above.")
            sys.exit(1)

        vnums = list_virtual_numbers(access_token)
        if vnums:
            print("\n✅ Virtual numbers retrieved:")
            print(vnums)
        else:
            print("\n⚠️ No virtual numbers returned (empty/404/204). See the Response printed above for details.")

    except requests.HTTPError as e:
        print("\n❌ HTTP Error:", e)
        if e.response is not None:
            try:
                print("Details:", e.response.json())
            except Exception:
                print("Details:", e.response.text)
        sys.exit(1)
    except Exception as ex:
        print("\n❌ Error:", ex)
        sys.exit(1)
