"""
Email Service — Send weather alerts and notifications via Brevo (Sendinblue) API.
"""

import os
import requests
import json

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "smartcrop.alerts@gmail.com")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "SmartCrop Advisory")


def send_weather_alert(to_email: str, user_name: str, alerts: list) -> bool:
    """
    Send a weather alert email via Brevo API.
    Returns True if email was sent successfully.
    """
    if not BREVO_API_KEY or not to_email:
        return False

    # Build alert HTML
    alerts_html = ""
    for alert in alerts:
        severity_color = {
            "severe": "#D32F2F",
            "warning": "#F57C00",
            "advisory": "#FBC02D",
            "critical": "#B71C1C",
        }.get(alert.get("severity", "warning"), "#F57C00")

        alert_icon = {
            "rain": "🌧️",
            "storm": "🌪️",
            "heatwave": "🌡️",
        }.get(alert.get("type", "rain"), "⚠️")

        alerts_html += f"""
        <div style="background: #FFF3E0; border-left: 4px solid {severity_color}; padding: 16px; margin: 12px 0; border-radius: 8px;">
            <div style="font-size: 18px; font-weight: 700; color: {severity_color};">
                {alert_icon} {alert.get('type', 'Weather').upper()} ALERT — {alert.get('severity', 'warning').upper()}
            </div>
            <div style="margin-top: 8px; font-size: 14px; color: #333;">
                {alert.get('message', '')}
            </div>
            <div style="margin-top: 4px; font-size: 12px; color: #777;">
                Date: {alert.get('date', '')} ({alert.get('day_name', '')})
            </div>
        </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #F5F5F5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1B5E20, #43A047); padding: 32px; text-align: center; color: white;">
                <div style="font-size: 28px; margin-bottom: 8px;">🌾 SmartCrop Advisory</div>
                <div style="font-size: 16px; opacity: 0.9;">Weather Alert for Your Farm</div>
            </div>
            
            <!-- Body -->
            <div style="padding: 24px;">
                <p style="font-size: 16px; color: #333;">
                    Hello <strong>{user_name or 'Farmer'}</strong>,
                </p>
                <p style="font-size: 14px; color: #555;">
                    Our weather monitoring system has detected the following alerts for your area:
                </p>
                
                {alerts_html}
                
                <div style="background: #E8F5E9; padding: 16px; border-radius: 8px; margin-top: 20px;">
                    <div style="font-weight: 700; color: #2E7D32; margin-bottom: 8px;">Recommended Actions:</div>
                    <ul style="font-size: 13px; color: #333; padding-left: 20px; margin: 0;">
                        <li>Secure harvested crops and farming equipment</li>
                        <li>Check irrigation and drainage systems</li>
                        <li>Avoid open-field operations during severe weather</li>
                        <li>Monitor your crops after the weather event</li>
                    </ul>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #F5F5F5; padding: 16px; text-align: center; font-size: 11px; color: #999;">
                SmartCrop Advisory | AI-Powered Farming Assistant<br>
                You received this alert because you enabled weather notifications in your profile.
            </div>
        </div>
    </body>
    </html>
    """

    subject = "Weather Alert"
    alert_types = set(a.get("type", "") for a in alerts)
    if "storm" in alert_types:
        subject = "Storm Warning for Your Farm Area"
    elif "rain" in alert_types:
        subject = "Rain Alert for Your Farm Area"
    elif "heatwave" in alert_types:
        subject = "Heatwave Warning for Your Farm Area"

    try:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": BREVO_API_KEY,
        }
        payload = {
            "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
            "to": [{"email": to_email, "name": user_name or "Farmer"}],
            "subject": f"SmartCrop: {subject}",
            "htmlContent": html_content,
        }

        resp = requests.post(url, headers=headers, json=payload, timeout=10)

        if resp.status_code in (200, 201):
            print(f"  [EMAIL] Alert sent to {to_email}")
            return True
        else:
            print(f"  [EMAIL ERROR] Status {resp.status_code}: {resp.text[:200]}")
            return False

    except Exception as e:
        print(f"  [EMAIL ERROR] Failed to send: {e}")
        return False


def check_and_send_alerts_for_all_users():
    """
    Check weather for all users with email + location and send alerts if severe weather detected.
    Called by the background scheduler.
    """
    from db import get_supabase
    from weather_service import check_severe_weather

    try:
        sb = get_supabase()

        # Get all users with email and location set in profiles
        result = sb.table("profiles").select(
            "user_id, name, email, latitude, longitude"
        ).neq("email", "").not_.is_("latitude", "null").not_.is_("longitude", "null").execute()

        if not result.data:
            print("  [ALERTS] No users with email + location configured")
            return 0

        alerts_sent = 0
        for profile in result.data:
            email = profile.get("email", "")
            lat = profile.get("latitude")
            lon = profile.get("longitude")
            name = profile.get("name", "Farmer")
            user_id = profile.get("user_id")

            if not email or not lat or not lon:
                continue

            # Check for severe weather
            alerts = check_severe_weather(float(lat), float(lon), days_ahead=2)

            if alerts:
                # Send email
                sent = send_weather_alert(email, name, alerts)

                # Save to weather_alerts table
                for alert in alerts:
                    try:
                        sb.table("weather_alerts").insert({
                            "user_id": user_id,
                            "alert_type": alert.get("type", "rain"),
                            "severity": alert.get("severity", "warning"),
                            "message": alert.get("message", ""),
                            "weather_data": alert,
                            "email_sent": sent,
                        }).execute()
                    except Exception:
                        pass

                if sent:
                    alerts_sent += 1

        print(f"  [ALERTS] Checked {len(result.data)} users, sent {alerts_sent} alert emails")
        return alerts_sent

    except Exception as e:
        print(f"  [ALERTS ERROR] {e}")
        return 0
