import json
import re
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests
from bs4 import BeautifulSoup
from user_agent import generate_user_agent
import yt_dlp

ALLOWED_HOSTS = {
    "facebook": ("facebook.com", "fb.watch"),
    "instagram": ("instagram.com",),
    "snapchat": ("snapchat.com",),
    "pinterest": ("pinterest.com", "pin.it"),
    "youtube": ("youtube.com", "youtu.be", "music.youtube.com"),
}
TIMEOUT = 18

def valid_url(platform, value):
    try:
        parsed = urlparse(value.strip())
        host = (parsed.hostname or "").lower()
        return parsed.scheme in ("http", "https") and any(host == d or host.endswith("." + d) for d in ALLOWED_HOSTS[platform])
    except Exception:
        return False

def error_result(message):
    return {"status": "error", "message": message, "items": []}

def media_item(title, url, quality="Original", kind="video", thumbnail=None):
    return {"title": title or "Social media download", "url": url, "quality": quality, "type": kind, "thumbnail": thumbnail}

def facebook(url):
    response = requests.post("https://fbdown.blog/get.php",
        headers={"User-Agent": generate_user_agent(), "Origin": "https://fbdown.blog", "Referer": "https://fbdown.blog/"},
        data={"url": url}, timeout=TIMEOUT)
    response.raise_for_status()
    data = response.json().get("data", {})
    items = []
    for media in data.get("medias", []):
        if media.get("url"):
            items.append(media_item(data.get("title", "Facebook video"), media["url"], media.get("quality", "Original"), "video", data.get("thumbnail")))
    if not items:
        return error_result("No downloadable Facebook media was returned. The provider may be unavailable.")
    return {"status": "success", "title": data.get("title", "Facebook video"), "author": data.get("author"), "thumbnail": data.get("thumbnail"), "items": items}

def instagram(url):
    session = requests.Session()
    ua = generate_user_agent()
    page = session.get("https://snapdownloader.com/tools/instagram-reels-downloader/download",
        headers={"User-Agent": ua, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9"}, timeout=TIMEOUT)
    page.raise_for_status()
    soup = BeautifulSoup(page.text, "html.parser")
    token_tag = soup.find("meta", attrs={"name": "csrf-token"})
    if not token_tag or not token_tag.get("content"):
        return error_result("The Instagram provider changed its page; this downloader is temporarily unavailable.")
    api_tag = soup.find("meta", attrs={"name": "api-fetch-url"})
    api_url = api_tag.get("content") if api_tag else "https://grabgram.io/api/fetch/instagram"
    response = session.post(api_url,
        headers={"User-Agent": ua, "Accept": "application/json", "Content-Type": "application/json",
                 "X-CSRF-TOKEN": token_tag["content"], "X-Requested-With": "XMLHttpRequest",
                 "Origin": "https://grabgram.io", "Referer": "https://grabgram.io/en/instagram-reels-downloader"},
        json={"url": url, "tool": "reels"}, timeout=TIMEOUT)
    response.raise_for_status()
    payload = response.json()
    if not payload.get("ok"):
        return error_result(payload.get("error") or "Instagram could not return public media for this link.")
    data = payload.get("data") or {}
    items = []
    for entry in data.get("items", []):
        for download in entry.get("downloads", []):
            if download.get("url"):
                items.append(media_item(data.get("caption") or "Instagram media", download["url"],
                    download.get("label") or download.get("ext") or "Original", entry.get("kind", "media")))
                break
    if not items:
        return error_result("No public downloadable media was found for this Instagram link.")
    user = data.get("user") or {}
    return {"status": "success", "title": data.get("caption") or "Instagram media", "author": user.get("username"), "items": items}

def snapchat(url):
    response = requests.post("https://www.expertstool.com/converter.php",
        headers={"User-Agent": generate_user_agent(), "Accept": "text/html,application/xhtml+xml",
                 "Content-Type": "application/x-www-form-urlencoded", "Origin": "https://www.expertstool.com",
                 "Referer": "https://www.expertstool.com/snapchat-video-downloader/"},
        data={"url": url}, timeout=TIMEOUT)
    response.raise_for_status()
    links = re.findall(r'<source[^>]+src=["\'](https?://[^"\']+)["\']', response.text, re.I)
    items = [media_item("Snapchat video", link.replace("\\u0026", "&"), "Original", "video") for link in links]
    if not items:
        return error_result("No public Snapchat media was found. Login-required stories are not supported.")
    return {"status": "success", "title": "Snapchat media", "items": items}

def pinterest(url):
    response = requests.post("https://www.expertstool.com/pinterest-video-download/",
        headers={"User-Agent": generate_user_agent(), "Accept": "text/html,application/xhtml+xml",
                 "Content-Type": "application/x-www-form-urlencoded", "Origin": "https://www.expertstool.com",
                 "Referer": "https://www.expertstool.com/pinterest-video-download/"},
        data={"url": url}, timeout=TIMEOUT)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    for anchor in soup.find_all("a", href=True):
        link = anchor["href"]
        if link.startswith("https://") and (".mp4" in link.lower() or "pinimg.com" in link.lower()):
            kind = "video" if ".mp4" in link.lower() else "image"
            return {"status": "success", "title": "Pinterest media", "items": [media_item("Pinterest media", link, "Original", kind)]}
    return error_result("No public downloadable Pinterest media was found.")

def youtube(url):
    options = {"quiet": True, "no_warnings": True, "skip_download": True, "noplaylist": True,
               "socket_timeout": TIMEOUT, "extractor_retries": 1, "format": "best[ext=mp4]/best"}
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(url, download=False)
    items, seen = [], set()
    for media in info.get("formats", []):
        link = media.get("url")
        if not link or link in seen or media.get("vcodec") == "none":
            continue
        seen.add(link)
        items.append(media_item(info.get("title", "YouTube video"), link,
            media.get("format_note") or media.get("resolution") or "Original", "video", info.get("thumbnail")))
    if not items:
        return error_result("YouTube did not provide a downloadable format for this video.")
    return {"status": "success", "title": info.get("title", "YouTube video"), "author": info.get("uploader"),
            "duration": info.get("duration"), "thumbnail": info.get("thumbnail"), "items": items[:12]}

FUNCTIONS = {"facebook": facebook, "instagram": instagram, "snapchat": snapchat, "pinterest": pinterest, "youtube": youtube}

class handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_json(204, {})

    def do_GET(self):
        try:
            query = parse_qs(urlparse(self.path).query)
            platform = (query.get("platform", [""])[0] or "").lower()
            url = (query.get("url", [""])[0] or "").strip()
            if platform not in FUNCTIONS:
                return self.send_json(400, error_result("Choose a supported platform."))
            if not valid_url(platform, url):
                return self.send_json(400, error_result("Enter a valid public URL from the selected platform."))
            result = FUNCTIONS[platform](url)
            status = 200 if result.get("status") == "success" else 422
            return self.send_json(status, result)
        except requests.Timeout:
            return self.send_json(504, error_result("The media provider took too long to respond. Try again later."))
        except Exception as exc:
            message = str(exc)
            if len(message) > 180:
                message = message[:180] + "…"
            return self.send_json(502, error_result("The provider could not process this link. " + message))

    def do_POST(self):
        return self.do_GET()

    def log_message(self, format, *args):
        return
