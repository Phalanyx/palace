#!/usr/bin/env python3
"""
WebSocket Proxy Server for Gemini Live API
Handles authentication and proxies WebSocket connections.

This server acts as a bridge between the browser client and Gemini API,
handling Google Cloud authentication automatically using default credentials.
"""

import asyncio
import websockets
import json
import ssl
import certifi
import os
import google.auth
from dotenv import load_dotenv
import traceback
import urllib.request
import urllib.error
from websockets.legacy.server import WebSocketServerProtocol
from websockets.legacy.protocol import WebSocketCommonProtocol
from websockets.exceptions import ConnectionClosed
from moorcheh_sdk import MoorchehClient

from google.oauth2 import service_account
from google.auth.transport.requests import Request

# Set to True for verbose logging
DEBUG = False
WS_PORT = int(os.environ.get("PORT", "8080"))

# Load environment variables from .env file
load_dotenv(override=True)

# MOORCHEH SETUP
MOORCHEH_API_URL = "https://api.moorcheh.ai/v1"
MOORCHEH_API_KEY = os.environ.get("MOORCHEH_API_KEY", "")

if MOORCHEH_API_KEY and len(MOORCHEH_API_KEY) > 4:
    print(f"✅ [MOORCHEH] API Key loaded (starts with {MOORCHEH_API_KEY[:4]}...)")
elif MOORCHEH_API_KEY:
    print(f"✅ [MOORCHEH] API Key loaded (too short to mask)")
else:
    print("⚠️ [MOORCHEH] No API Key found in environment or .env file")

# Initialize Moorcheh Client
moorcheh_client = MoorchehClient(api_key=MOORCHEH_API_KEY) if MOORCHEH_API_KEY else None

def handle_moorcheh_tool(tool_name: str, args: dict) -> dict:
    namespace = args.get("namespace", "")
    query = args.get("query", "")
    
    if not moorcheh_client:
        return {"error": "Moorcheh Client not initialized (missing API key)"}
    
    if not namespace or not query:
        return {"error": "Missing namespace or query"}
        
    print(f"🐜 [MOORCHEH SDK] Executing Tool: {tool_name} | Namespace: {namespace} | Query: {query}")
        
    try:
        if tool_name == "askMoorcheh":
            # Using get_generative_answer from SDK
            # Note: SDK currently uses 'namespace' and 'query'
            response = moorcheh_client.get_generative_answer(
                namespace=namespace,
                query=query
            )
            return response
        elif tool_name == "searchMoorcheh":
            # Using get_search_results from SDK
            response = moorcheh_client.get_search_results(
                namespace=namespace,
                query=query,
                top_k=3,
                threshold=0.70
            )
            return response
        else:
            return {"error": f"Unknown tool: {tool_name}"}
    except Exception as e:
        print(f"❌ [MOORCHEH SDK ERROR] {e}")
        return {"error": str(e)}

# NEXT.JS APP URL (for calling API routes like search-rooms)
NEXTJS_URL = os.environ.get("NEXTJS_URL", "http://localhost:3000")

async def handle_search_rooms(args: dict) -> dict:
    """Calls the Next.js /api/palaces/[id]/search-rooms endpoint."""
    palace_id = args.get("palaceId", "")
    query = args.get("query", "")

    if not palace_id or not query:
        return {"error": f"Missing palaceId or query. Got palaceId='{palace_id}', query='{query}'"}

    print(f"🔍 [SEARCH ROOMS] Palace: {palace_id} | Query: {query} | URL: {NEXTJS_URL}/api/palaces/{palace_id}/search-rooms")

    url = f"{NEXTJS_URL}/api/palaces/{palace_id}/search-rooms"
    payload = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        loop = asyncio.get_running_loop()
        # Run the blocking HTTP call in a thread so we don't block the event loop
        def _fetch():
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8"))

        result = await loop.run_in_executor(None, _fetch)
        print(f"🔍 [SEARCH ROOMS] Result: {result}")
        return result
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"❌ [SEARCH ROOMS HTTP ERROR] {e.code}: {body}")
        return {"error": f"HTTP {e.code}: {body}"}
    except Exception as e:
        print(f"❌ [SEARCH ROOMS ERROR] {e}")
        return {"error": str(e)}


SEARCH_ROOMS_TOOL = {
    "name": "searchRooms",
    "description": "Search across all rooms in the palace to find where a specific topic was discussed. Use this when the user asks something like 'Where did we talk about X?' or 'Which room has Y?'. Returns the best matching room and object with 0-based roomIndex and objectIndex. Use these indices EXACTLY as returned (they are 0-based, do NOT add 1).",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "palaceId": {
                "type": "STRING",
                "description": "The palace ID (extract from the namespace in the system prompt, e.g. namespace 'albertPalaceABC123' means palaceId is 'ABC123')."
            },
            "query": {
                "type": "STRING",
                "description": "The topic or question the user wants to locate in the palace."
            }
        },
        "required": ["palaceId", "query"]
    }
}

ALL_TOOLS = [SEARCH_ROOMS_TOOL]

MOORCHEH_TOOLS = [
    {
        "name": "askMoorcheh",
        "description": "Ask a question to the Moorcheh knowledge base. This is the primary way to get answers from the course material. Returns a generated answer based on the documents.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "namespace": {
                    "type": "STRING",
                    "description": "The namespace to search in (provided in the system prompt)."
                },
                "query": {
                    "type": "STRING",
                    "description": "The specific question to ask based on the user's inquiry."
                }
            },
            "required": ["namespace", "query"]
        }
    },
    {
        "name": "searchMoorcheh",
        "description": "Search the Moorcheh knowledge base for specific facts or excerpts. Returns search results rather than a synthesized answer.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "namespace": {
                    "type": "STRING",
                    "description": "The namespace to search in (provided in the system prompt)."
                },
                "query": {
                    "type": "STRING",
                    "description": "The specific search query or keywords."
                }
            },
            "required": ["namespace", "query"]
        }
    }
]

ALL_TOOLS.extend(MOORCHEH_TOOLS)


def generate_access_token():
    """Retrieves an access token from the available Google auth source."""
    try:
        scopes = ['https://www.googleapis.com/auth/cloud-platform']
        creds = None

        # 1. Cloud runtime: use Application Default Credentials if available.
        try:
            creds, _ = google.auth.default(scopes=scopes)
            print("🔑 Using Application Default Credentials")
        except Exception:
            creds = None

        # 2. Explicit env credentials for non-ADC environments.
        env_creds = os.environ.get("GOOGLE_CREDENTIALS")
        if env_creds and not creds:
            print("🔑 Using Service Account from GOOGLE_CREDENTIALS environment variable")
            try:
                creds_info = json.loads(env_creds)
                creds = service_account.Credentials.from_service_account_info(
                    creds_info, scopes=scopes)
            except json.JSONDecodeError:
                print("❌ Invalid JSON in GOOGLE_CREDENTIALS environment variable.")
                return None

        # 3. Local fallback for development.
        if not creds:
            creds_path = os.path.join(os.path.dirname(__file__), 'credentials.json')
            if os.path.exists(creds_path):
                print(f"🔑 Using Service Account from local {creds_path} file")
                creds = service_account.Credentials.from_service_account_file(
                    creds_path, scopes=scopes)
            else:
                 print("❌ Authentication Error:")
                 print("   1. In production: attach a service account or provide GOOGLE_CREDENTIALS.")
                 print("   2. In local dev: set GOOGLE_CREDENTIALS or place a 'credentials.json' file in this folder.")
                 return None

        # Mint the actual short-lived access token
        creds.refresh(Request())
        return creds.token
    except Exception as e:
        import traceback
        print(f"Error generating access token: {e}")
        traceback.print_exc()
        return None


async def proxy_task(
    source_websocket: WebSocketCommonProtocol,
    destination_websocket: WebSocketCommonProtocol,
    is_server: bool,
) -> None:
    """
    Forwards messages from source_websocket to destination_websocket.
    Intercepts client tool setup and server tool calls.
    """
    try:
        async for message in source_websocket:
            try:
                data = json.loads(message)
                
                # [CLIENT -> SERVER] Inject tools into the setup message
                if not is_server and "setup" in data:
                    print("🔧 [SETUP] Intercepting setup message to inject tools")
                    if "tools" not in data["setup"]:
                        data["setup"]["tools"] = []
                    
                    # Add function declarations array if missing
                    found_funcs = False
                    if isinstance(data["setup"]["tools"], list):
                        for t in data["setup"]["tools"]:
                            if "function_declarations" in t:
                                t["function_declarations"].extend(ALL_TOOLS)
                                found_funcs = True
                        if not found_funcs:
                            data["setup"]["tools"].append({"function_declarations": ALL_TOOLS})
                    elif isinstance(data["setup"]["tools"], dict):
                        if "function_declarations" not in data["setup"]["tools"]:
                            data["setup"]["tools"]["function_declarations"] = []
                        data["setup"]["tools"]["function_declarations"].extend(ALL_TOOLS)
                    
                # [SERVER -> CLIENT] Intercept tool calls
                if is_server and "toolCall" in data:
                    function_calls = data["toolCall"].get("functionCalls", [])
                    tool_responses = []

                    for call in function_calls:
                        call_id = call.get("id")
                        name = call.get("name")
                        args = call.get("args", {})

                        if name in ["askMoorcheh", "searchMoorcheh"]:
                            result = handle_moorcheh_tool(name, args)
                            tool_responses.append({
                                "id": call_id,
                                "name": name,
                                "response": result
                            })
                        elif name == "searchRooms":
                            result = await handle_search_rooms(args)
                            tool_responses.append({
                                "id": call_id,
                                "name": name,
                                "response": result
                            })

                    if tool_responses:
                        print(f"🔧 [TOOL RESPONSE] Sending {len(tool_responses)} tool responses back to Gemini")
                        tool_response_msg = {
                            "tool_response": {
                                "function_responses": tool_responses
                            }
                        }
                        await source_websocket.send(json.dumps(tool_response_msg))

                if DEBUG:
                    print(f"Proxying from {'server' if is_server else 'client'}: {data}")
                    
                await destination_websocket.send(json.dumps(data))
            except Exception as e:
                print(f"Error processing message: {e}")
                traceback.print_exc()
    except ConnectionClosed as e:
        print(
            f"{'Server' if is_server else 'Client'} connection closed: {e.code} - {e.reason}"
        )
    except Exception as e:
        print(f"Unexpected error in proxy_task: {e}")
    finally:
        await destination_websocket.close()


async def create_proxy(
    client_websocket: WebSocketCommonProtocol, bearer_token: str, service_url: str
) -> None:
    """
    Establishes a WebSocket connection to the Gemini server and creates bidirectional proxy.

    Args:
        client_websocket: The WebSocket connection of the client.
        bearer_token: The bearer token for authentication with the server.
        service_url: The url of the service to connect to.
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {bearer_token}",
    }

    # Create SSL context with certifi certificates
    ssl_context = ssl.create_default_context(cafile=certifi.where())

    print(f"Connecting to Gemini API...")
    if DEBUG:
        print(f"Service URL: {service_url}")

    try:
        async with websockets.connect(
            service_url,
            additional_headers=headers,
            ssl=ssl_context
        ) as server_websocket:
            print(f"✅ Connected to Gemini API")

            # Create bidirectional proxy tasks
            client_to_server_task = asyncio.create_task(
                proxy_task(client_websocket, server_websocket, is_server=False)
            )
            server_to_client_task = asyncio.create_task(
                proxy_task(server_websocket, client_websocket, is_server=True)
            )

            # Wait for either task to complete
            done, pending = await asyncio.wait(
                [client_to_server_task, server_to_client_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            # Cancel the remaining task
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

            # Close connections
            try:
                await server_websocket.close()
            except:
                pass

            try:
                await client_websocket.close()
            except:
                pass

    except ConnectionClosed as e:
        print(f"Server connection closed unexpectedly: {e.code} - {e.reason}")
        if not client_websocket.closed:
            await client_websocket.close(code=e.code, reason=e.reason)
    except Exception as e:
        print(f"Failed to connect to Gemini API: {e}")
        if not client_websocket.closed:
            await client_websocket.close(code=1008, reason="Upstream connection failed")


async def handle_websocket_client(client_websocket: WebSocketServerProtocol) -> None:
    """
    Handles a new WebSocket client connection.

    Expects first message with optional bearer_token and service_url.
    If no bearer_token provided, generates one using Google default credentials.

    Args:
        client_websocket: The WebSocket connection of the client.
    """
    print("🔌 New WebSocket client connection...")
    try:
        # Wait for the first message from the client
        service_setup_message = await asyncio.wait_for(
            client_websocket.recv(), timeout=10.0
        )
        service_setup_message_data = json.loads(service_setup_message)

        bearer_token = service_setup_message_data.get("bearer_token")
        service_url = service_setup_message_data.get("service_url")

        # If no bearer token provided, mint one using the active Google auth source.
        if not bearer_token:
            print("🔑 Generating access token using Google credentials...")
            bearer_token = generate_access_token()
            if not bearer_token:
                print("❌ Failed to generate access token")
                await client_websocket.close(
                    code=1008, reason="Authentication failed"
                )
                return
            print("✅ Access token generated")

        if not service_url:
            print("❌ Error: Service URL is missing")
            await client_websocket.close(
                code=1008, reason="Service URL is required"
            )
            return

        await create_proxy(client_websocket, bearer_token, service_url)

    except asyncio.TimeoutError:
        print("⏱️ Timeout waiting for the first message from the client")
        await client_websocket.close(code=1008, reason="Timeout")
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in first message: {e}")
        await client_websocket.close(code=1008, reason="Invalid JSON")
    except Exception as e:
        print(f"❌ Error handling client: {e}")
        if not client_websocket.closed:
            await client_websocket.close(code=1011, reason="Internal error")


async def start_websocket_server():
    """Start the WebSocket proxy server."""
    async with websockets.serve(handle_websocket_client, "0.0.0.0", WS_PORT):
        print(f"🔌 WebSocket proxy listening on 0.0.0.0:{WS_PORT}")
        # Run forever
        await asyncio.Future()


async def main():
    """
    Starts the WebSocket server.
    """
    print(f"""
╔════════════════════════════════════════════════════════════╗
║     Gemini Live API Proxy Server                          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  🔌 WebSocket Proxy Port: {WS_PORT:<5}                            ║
║                                                            ║
║  Authentication:                                           ║
║  1. Application Default Credentials                        ║
║  2. GOOGLE_CREDENTIALS env var                             ║
║  3. Local credentials.json file                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
""")

    await start_websocket_server()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Servers stopped")
