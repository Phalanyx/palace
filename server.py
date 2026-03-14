#!/usr/bin/env python3
"""
WebSocket Proxy Server for Gemini Live API
Handles authentication and proxies WebSocket connections.

Supports both:
  - API key auth (key in service_url query param, no Authorization header needed)
  - Google Cloud default credentials (bearer_token in first message)
"""

import asyncio
import websockets
import json
import ssl
import certifi
import os
from websockets.legacy.server import WebSocketServerProtocol
from websockets.legacy.protocol import WebSocketCommonProtocol
from websockets.exceptions import ConnectionClosed

# Google auth imports (optional - used if no API key)
try:
    import google.auth
    from google.auth.transport.requests import Request
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False

DEBUG = False  # Set to True for verbose logging
WS_PORT = 8080    # Port for WebSocket server

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")


def generate_access_token():
    """Retrieves an access token using Google Cloud default credentials."""
    if not GOOGLE_AUTH_AVAILABLE:
        return None
    try:
        creds, _ = google.auth.default()
        if not creds.valid:
            creds.refresh(Request())
        return creds.token
    except Exception as e:
        print(f"Error generating access token: {e}")
        return None


async def proxy_task(
    source_websocket: WebSocketCommonProtocol,
    destination_websocket: WebSocketCommonProtocol,
    is_server: bool,
) -> None:
    try:
        async for message in source_websocket:
            try:
                data = json.loads(message)
                if DEBUG:
                    print(f"Proxying from {'server' if is_server else 'client'}: {data}")
                await destination_websocket.send(json.dumps(data))
            except Exception as e:
                print(f"Error processing message: {e}")
    except ConnectionClosed as e:
        print(f"{'Server' if is_server else 'Client'} connection closed: {e.code} - {e.reason}")
    except Exception as e:
        print(f"Unexpected error in proxy_task: {e}")
    finally:
        await destination_websocket.close()


async def create_proxy(
    client_websocket: WebSocketCommonProtocol, bearer_token: str | None, service_url: str
) -> None:
    ssl_context = ssl.create_default_context(cafile=certifi.where())

    # Only add Authorization header if we have a bearer token
    headers = {"Content-Type": "application/json"}
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"

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

            client_to_server_task = asyncio.create_task(
                proxy_task(client_websocket, server_websocket, is_server=False)
            )
            server_to_client_task = asyncio.create_task(
                proxy_task(server_websocket, client_websocket, is_server=True)
            )

            done, pending = await asyncio.wait(
                [client_to_server_task, server_to_client_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

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
    print("🔌 New WebSocket client connection...")
    try:
        service_setup_message = await asyncio.wait_for(
            client_websocket.recv(), timeout=10.0
        )
        service_setup_message_data = json.loads(service_setup_message)

        bearer_token = service_setup_message_data.get("bearer_token")
        service_url = service_setup_message_data.get("service_url")

        if not service_url:
            # Build default Gemini API URL if API key is available
            if GEMINI_API_KEY:
                service_url = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={GEMINI_API_KEY}"
                print("🔑 Using GEMINI_API_KEY for authentication")
            else:
                print("❌ Error: Service URL is missing and no GEMINI_API_KEY set")
                await client_websocket.close(code=1008, reason="Service URL is required")
                return

        # If no bearer token and no API key in URL, try Google default credentials
        if not bearer_token and "key=" not in service_url:
            print("🔑 Generating access token using default credentials...")
            bearer_token = generate_access_token()
            if not bearer_token:
                print("❌ Failed to generate access token")
                await client_websocket.close(code=1008, reason="Authentication failed")
                return
            print("✅ Access token generated")

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
    async with websockets.serve(handle_websocket_client, "0.0.0.0", WS_PORT):
        print(f"🔌 WebSocket proxy running on ws://localhost:{WS_PORT}")
        await asyncio.Future()


async def main():
    auth_mode = "GEMINI_API_KEY" if GEMINI_API_KEY else "Google Cloud default credentials"
    print(f"""
╔════════════════════════════════════════════════════════════╗
║     Gemini Live API Proxy Server                          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  🔌 WebSocket Proxy: ws://localhost:{WS_PORT:<5}                   ║
║  🔑 Auth: {auth_mode:<49} ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
""")
    await start_websocket_server()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
