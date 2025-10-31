# scripts/free_trial_numbers.py
"""
Get OAuth token, list Free Trial Numbers, and register new Free Trial Numbers
Telstra endpoints:
 - Token:  POST https://products.api.telstra.com/v2/oauth/token
 - Free-trial numbers: GET/POST https://products.api.telstra.com/messaging/v3/free-trial-numbers
Headers required for messaging v3 calls:
 - Telstra-api-version: 3.1.0
 - Content-Language: en-au
 - Accept: application/json
 - Accept-Charset: utf-8
 - Content-Type: application/json
"""
import os
import sys
import requests
from typing import List, Optional

# === CONFIG ===
CLIENT_ID = os.environ.get("TELSTRA_CLIENT_ID", "HvMPGqRoiELfaNLmGRfCqhlv5AXCzpGd")
CLIENT_SECRET = os.environ.get("TELSTRA_CLIENT_SECRET", "wN3g8Pi6JpxP6AZP")

TOKEN_URL = "https://products.api.telstra.com/v2/oauth/token"
FREE_TRIAL_URL = "https://products.api.telstra.com/messaging/v3/free-trial-numbers"

# Required scope for free-trial operations (as you provided)
SCOPE = ("free-trial-numbers:read free-trial-numbers:write messages:read "
         "messages:write reports:read reports:write virtual-numbers:read virtual-numbers:write")

HEADERS_V3 = {
    "Telstra-api-version": "3.1.0",
    "Content-Language": "en-au",
    "Accept": "application/json",
    "Accept-Charset": "utf-8",
    "Content-Type": "application/json",
}

# === UTIL ===
def get_token(client_id: str, client_secret: str) -> str:
    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": SCOPE,
    }
    r = requests.post(TOKEN_URL, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=15)
    print("Token Status:", r.status_code)
    print("Token Response:", r.text)
    r.raise_for_status()
    token = r.json().get("access_token")
    if not token:
        raise RuntimeError("No access_token in token response. Check credentials and scope.")
    return token

def list_free_trial_numbers(access_token: str) -> dict:
    headers = {**HEADERS_V3, "Authorization": f"Bearer {access_token}"}
    r = requests.get(FREE_TRIAL_URL, headers=headers, timeout=15)
    print("\nList Free Trial Numbers Status:", r.status_code)
    print("Response:", r.text)
    if r.status_code == 204:
        return {"freeTrialNumbers": []}
    if r.status_code == 404:
        # endpoint not found or account not enabled - return empty for caller to inspect printed response
        return {"freeTrialNumbers": []}
    r.raise_for_status()
    return r.json()

def register_free_trial_numbers(access_token: str, numbers: List[str]) -> dict:
    """
    Register one or more Australian mobile numbers for Free Trial.
    Numbers must be in national format (e.g. "0412345678").
    You can register up to the remaining available slots (max total 10).
    """
    if not numbers:
        raise ValueError("No numbers provided to register.")
    headers = {**HEADERS_V3, "Authorization": f"Bearer {access_token}"}
    body = {"freeTrialNumbers": numbers if len(numbers) > 1 else numbers[0]}
    r = requests.post(FREE_TRIAL_URL, headers=headers, json=body, timeout=15)
    print("\nRegister Free Trial Numbers Status:", r.status_code)
    print("Response:", r.text)
    r.raise_for_status()
    return r.json()

# === CLI ===
def print_usage():
    print("Usage:")
    print("  python free_trial_numbers.py list")
    print('  python free_trial_numbers.py register 0412345678 0487654321')
    print("")
    print("You can also set TELSTRA_CLIENT_ID and TELSTRA_CLIENT_SECRET env vars instead of editing the file.")

if __name__ == "__main__":
    if CLIENT_ID.startswith("YOUR_") or CLIENT_SECRET.startswith("YOUR_"):
        print("Please set CLIENT_ID and CLIENT_SECRET in the script or set TELSTRA_CLIENT_ID and TELSTRA_CLIENT_SECRET env vars.")
        sys.exit(1)

    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    action = sys.argv[1].lower()
    try:
        token = get_token(CLIENT_ID, CLIENT_SECRET)
    except Exception as e:
        print("\nFailed to get token:", e)
        sys.exit(1)

    try:
        if action == "list":
            resp = list_free_trial_numbers(token)
            print("\nFree Trial Numbers:", resp.get("freeTrialNumbers") or resp)
        elif action == "register":
            nums = sys.argv[2:]
            if not nums:
                print("No numbers provided to register.")
                print_usage()
                sys.exit(1)
            # validate simple format (Australian national numbers starting with 04)
            for n in nums:
                if not (n.isdigit() and (n.startswith("04") and 9 <= len(n) <= 10 or len(n) == 10)):
                    print(f"Warning: '{n}' may not be a valid national-format Australian mobile (e.g. 0412345678)")
            resp = register_free_trial_numbers(token, nums)
            print("\nRegister response:", resp)
        else:
            print("Unknown action:", action)
            print_usage()
            sys.exit(1)
    except requests.HTTPError as e:
        print("\nHTTP error:", e)
        if e.response is not None:
            try:
                print("Details:", e.response.json())
            except Exception:
                print("Details:", e.response.text)
        sys.exit(1)
    except Exception as ex:
        print("\nError:", ex)
        sys.exit(1)
