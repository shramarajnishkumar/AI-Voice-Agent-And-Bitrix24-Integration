@echo off
echo ========================================================
echo Starting Cloudflare Tunnel for AI Voice Telephony Agent
echo Forwarding public HTTPS traffic to http://localhost:8000
echo ========================================================
echo.
echo NOTE: Do NOT close or press Ctrl+C in this window while
echo       making phone calls, or the tunnel will stop!
echo.
echo Look for the line below:
echo "Your quick Tunnel has been created! Visit it at: https://....trycloudflare.com"
echo.
cloudflared tunnel --url http://localhost:8000
pause
