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
    # Try yt-dlp first. Instagram increasingly restricts anonymous datacenter requests.
    last_error = ""
    for client in (None, "web"):
        options = {
            "quiet": True, "no_warnings": True, "skip_download": True,
            "noplaylist": True, "socket_timeout": TIMEOUT,
            "extractor_retries": 1, "format": "best",
        }
        if client:
            options["extractor_args"] = {"instagram": {"api": [client]}}
        try:
            with yt_dlp.YoutubeDL(options) as ydl:
                info = ydl.extract_info(url, download=False)
            if info:
                entries = info.get("entries") or [info]
                items, seen = [], set()
                for entry in entries:
                    if not entry:
                        continue
                    for media in (entry.get("formats") or [entry]):
                        link = media.get("url")
                        if not link or link in seen or media.get("vcodec") == "none":
                            continue
                        seen.add(link)
                        items.append(media_item(
                            entry.get("title") or info.get("title") or "Instagram media",
                            link, media.get("format_note") or media.get("resolution") or "Original",
                            "video" if media.get("vcodec") not in (None, "none") else "image",
                            entry.get("thumbnail") or info.get("thumbnail"),
                        ))
                        if len(items) >= 12:
                            break
                    if len(items) >= 12:
                        break
                if items:
                    return {"status": "success", "title": info.get("title") or "Instagram media",
                            "author": info.get("uploader") or info.get("channel"),
                            "thumbnail": info.get("thumbnail"), "items": items}
        except Exception as exc:
            last_error = str(exc).lower()

    # Fallback to Instagram's public embed page for posts that expose embed metadata.
    # This does not bypass private posts, login walls, or other access controls.
    try:
        parsed = urlparse(url)
        match = re.search(r"/(?:p|reel|tv)/([A-Za-z0-9_-]+)", parsed.path)
        paths = [url]
        if match:
            shortcode = match.group(1)
            for kind in ("p", "reel", "tv"):
                paths.append(f"https://www.instagram.com/{kind}/{shortcode}/embed/captioned/")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.8",
        }
        for page_url in paths:
            response = requests.get(page_url, headers=headers, timeout=TIMEOUT, allow_redirects=True)
            if response.status_code >= 400:
                continue
            html = response.text
            soup = BeautifulSoup(html, "html.parser")
            def meta(*keys):
                for key in keys:
                    tag = soup.find("meta", attrs={"property": key}) or soup.find("meta", attrs={"name": key})
                    if tag and tag.get("content"):
                        return tag["content"]
                return None
            title = meta("og:title", "twitter:title") or "Instagram media"
            thumbnail = meta("og:image", "twitter:image")
            video = meta("og:video", "og:video:secure_url", "twitter:player:stream")
            if not video:
                source = soup.find("video")
                if source:
                    video = source.get("src") or (source.find("source").get("src") if source.find("source") else None)
            # Instagram embed HTML sometimes contains JSON-escaped media URLs rather than tags.
            if not video:
                match_video = re.search(r'"video_url"\\s*:\\s*"([^"]+)"', html)
                if match_video:
                    video = match_video.group(1).replace("\\u0026", "&").replace("\\/", "/").replace("\\u003D", "=")
            if not thumbnail:
                match_image = re.search(r'"display_url"\\s*:\\s*"([^"]+)"', html)
                if match_image:
                    thumbnail = match_image.group(1).replace("\\u0026", "&").replace("\\/", "/").replace("\\u003D", "=")
            if video and video.startswith("https://"):
                return {"status": "success", "title": title,
                        "items": [media_item(title, video, "Original", "video", thumbnail)]}
            if thumbnail and thumbnail.startswith("https://"):
                return {"status": "success", "title": title,
                        "items": [media_item(title, thumbnail, "Original", "image", thumbnail)]}
    except Exception:
        pass

    if any(term in last_error for term in ("login", "cookie", "private", "sign in")):
        return error_result("Instagram requires login or is restricting access. Only public media accessible without login can be downloaded.")
    return error_result("Instagram did not expose media through its extractor or public embed page. The post may be restricted, or Instagram may be blocking server requests.")

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
    # Try multiple public YouTube player clients. Datacenter IPs may still be challenged.
    base_options = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "socket_timeout": TIMEOUT,
        "extractor_retries": 1,
        "format": "best[ext=mp4]/best",
    }
    info = None
    last_error = ""
    # Embedded and mobile clients can work for videos where the default web client is challenged.
    for client in ("web_embedded", "tv_embedded", "mweb", "android", "ios", "web_safari", "android_vr"):
        options = dict(base_options)
        options["extractor_args"] = {"youtube": {"player_client": [client]}}
        try:
            with yt_dlp.YoutubeDL(options) as ydl:
                candidate = ydl.extract_info(url, download=False)
            if candidate:
                info = candidate
                break
        except Exception as exc:
            last_error = str(exc).lower()
    if not info:
        if any(term in last_error for term in ("sign in to confirm", "not a bot", "cookies", "bot verification")):
            return error_result(
                "YouTube is rejecting requests from this server even after trying several public player clients. "
                "This is a hosting/IP restriction. This deployment cannot safely sign in as a user; "
                "videos that require account verification are unavailable through this downloader."
            )
        return error_result("YouTube could not provide this video. It may be private, age-restricted, removed, or temporarily unavailable.")
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
