import asyncio
import random
import httpx
import feedparser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from email.utils import parsedate_to_datetime
from textblob import TextBlob
from datetime import datetime, timezone, timedelta
from bs4 import BeautifulSoup

from app import models

# Updated Feeds: TechCrunch, Investing.com, Medium, UDN (Taiwan), CNA (Taiwan)
# User specifically requested removing Yahoo/MarketWatch in favor of these.
# Updated Feeds: TechCrunch, Investing.com, Medium, UDN, CNA, Yahoo TW, Anue, Google News
# Updated Feeds: TechCrunch, Investing.com, Medium, UDN, CNA, Yahoo TW, Anue, Google News
RSS_FEEDS = [
    # Global
    {"url": "https://techcrunch.com/feed/", "source": "TechCrunch", "expect": 30},
    {"url": "https://www.investing.com/rss/news.rss", "source": "Investing.com", "expect": 30},
    
    # Taiwan / Chinese (High Volume)
    {"url": "https://money.udn.com/rssfeed/news/1001/5588/5588.xml", "source": "UDN Money", "expect": 30},
    {"url": "https://feeds.feedburner.com/rsscna/finance", "source": "CNA Taiwan", "expect": 30},
    {"url": "https://news.cnyes.com/rss/headline", "source": "Anue 鉅亨網", "expect": 30},
    {"url": "https://tw.stock.yahoo.com/news/rss", "source": "Yahoo Stock TW", "expect": 30},
    # Backfill attempt: Google News (Last 7 days of Stock Market news)
    {"url": "https://news.google.com/rss/search?q=台股+when:7d&hl=zh-TW&gl=TW&ceid=TW:zh-Hant", "source": "Google News (7d)", "expect": 50},
]

# User-Agent List for Rotation (Anti-Scraping)
USER_AGENTS = [
    # Chrome Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    # Chrome MacOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    # Firefox Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    # Safari MacOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    # Edge Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
]

BLACKLIST_IMAGES = [
    "https://imgcdn.cna.com.tw/www/images/pic_fb.jpg", # CNA Generic Logo
    "https://s.yimg.com/cv/apiv2/default/20200827/Yahoo_Finance_Logo_1200x630.jpg", # Yahoo Generic
    "https://money.udn.com/static/img/money_fb.jpg", # Possible UDN Generic
    "https://imgcdn.cna.com.tw/www/website/img/ad300x223.jpg", # CNA Ad
    "https://imgcdn.cna.com.tw/www/website/img/ad_all.jpg", # Possible variants
    "https://lh3.googleusercontent.com/J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7z0cNNfDvGUmWUy20nuUhkREQyrpY4bEeIBuc=s0-w300-rw", # The specific "GE" logo
]

BAD_KEYWORDS = ["logo", "avatar", "icon", "share", "fb_", "google", "line", "twitter", "facebook", "ad300", "placeholder", "default", "width", "unknown"]

def is_bad_image(url):
    if not url: return True
    lower = url.lower()
    # 1. Exact Match
    if url in BLACKLIST_IMAGES:
        return True
    # 2. Keyword Match
    if any(k in lower for k in BAD_KEYWORDS):
        return True
    return False


# ... (skip to fetch_and_process_news)





def parse_feed_sync(xml_content):
    return feedparser.parse(xml_content)

def log_debug(msg):
    print(f"{datetime.now()}: {msg}") # Use stdout for proper container logging


def clean_html_static(html_content):
    if not html_content:
        return "<p>內容暫時無法取得</p>"
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 1. Broad tag removal
        for tag in soup(['script', 'iframe', 'object', 'embed', 'style', 'head', 'meta', 'link', 'nav', 'footer', 'header', 'form', 'button', 'noscript', 'aside']):
            tag.decompose()
            
        # 2. Locate main content
        article = soup.find('article') or \
                 soup.find(class_='article-body') or \
                 soup.find(class_='story-body') or \
                 soup.find(class_='caas-body') or \
                 soup.select_one('.ArticleBody-articleBody') or \
                 soup.select_one('.RichTextArticleBody-body') or \
                 soup.select_one('.group') or \
                 soup.find(class_='paragraph') or \
                 soup.find(id='article_body') or \
                 soup.find(class_='article-content')

        target = article if article else soup.body
        if not target:
            return "<p>內容暫時無法取得</p>"

        # 3. Aggressive Cleaning within Target
        # Remove known junk classes/ids
        junk_selectors = [
            '.ad', '.advertisement', '.social-share', '.share-tools', '.tools', 
            '.author-bio', '.copyright', '.disclaimer', '.related-content', 
            '.related-news', '.read-more', '.subscription', '.newsletter',
            '.app-download', '.download-banner', '[class*="share"]', '[class*="social"]',
            '[id*="ad-"]', '[class*="banner"]'
        ]
        for sel in junk_selectors:
            for bad in target.select(sel):
                bad.decompose()

        # 4. Text-based Removals (for CNA, UDN, etc specific boilerplate)
        # We iterate over all P and Div elements and check text content
        junk_phrases = [
            "App下載", "延伸閱讀", "版權所有", "未經授權", "轉載", "隱私權", 
            "訂閱", "相關新聞", "點擊連結", "立刻加入", "好友", "追蹤",
            "本網站之文字", "公開播送", "公開傳輸", "中央社「一手新聞」",
            "請繼續下滑閱讀", "More from TechCrunch", "Sent from my iPhone"
        ]
        
        # New: Remove elements that are just a list of links (common in footers)
        # e.g. "Author Name" repeated
        link_spam_detected = False
        
        for tag in target.find_all(['p', 'div', 'span', 'strong', 'h2', 'h3', 'li']):
            text = tag.get_text().strip()
            
            # SAFEGUARD: If the tag is huge (likely a wrapper), do not delete it based on a substring match.
            # We only want to target specific junk paragraphs/elements.
            if len(text) > 200: 
                continue
                
            # If the tag contains ONLY junk phrases
            if any(phrase in text for phrase in junk_phrases):
                tag.decompose()
                continue
                
            # Heuristic for Author Lists / Related Links at bottom:
            # If a tag is short (< 30 chars) and contains a known author name or looks like a byline
            # We can't list all authors, but we can detect patterns.
            # For now, let's explicitly block the "More from" container if found (via selector)
            # or rely on the loop below.

        # 5. Extract only Paragraphs, Headers, and Images (Allowlisting)
        clean_content = []
        seen_lines = set()
        for tag in target.find_all(['p', 'div', 'h2', 'h3', 'blockquote', 'img']):
            # Special handling for images
            if tag.name == 'img':
                src = tag.get('src')
                if not src: continue
                # Basic filter for bad images
                lower_src = src.lower()
                if any(bad in lower_src for bad in ["logo", "avatar", "icon", "share", "fb_", "ad", "doubleclick", "pixel"]):
                    continue
                # If image is very small (tracking pixel), usually handled by 'width' attr check but beautifulsoup makes it hard.
                # Just add it.
                clean_content.append(f'<img src="{src}" class="w-full rounded-lg my-4" alt="{tag.get("alt", "")}" />')
                continue

            # Use separator to avoid "HelloWorld" effect when spans are concatenated
            text = tag.get_text(separator=" ", strip=True)
            if not text:
                continue
            
            # Additional heuristic: If DIV is very short or looks like navigation, skip it.
            if tag.name == 'div':
                if len(text) < 30: continue
                # Skip divs that contain mostly links
                if len(tag.find_all('a')) > 0 and len(text) < 100:
                    continue
                # NEW: Skip DIVs that contain paragraph tags
                if tag.find('p'):
                    continue
            
            # Filter repeated short lines (Author spam)
            if len(text) < 40 and "TechCrunch" not in text: 
                 # Only strict filter for very short lines in English content
                 is_english = all(ord(c) < 128 for c in text.replace(' ', ''))
                 if is_english:
                     continue
            
            # Deduplication: If we have seen this exact text line before, skip it.
            # This fixes issues where "2026/01/28 16:19" appears multiple times.
            if text in seen_lines:
                continue
            seen_lines.add(text)

            # Logic to keep the tag structure but strip attributes (classes/styles)
            tag_name = tag.name if tag.name != 'div' else 'p'
            
            clean_content.append(f"<{tag_name}>{text}</{tag_name}>")
            
        if not clean_content:
             # Fallback: if we filtered everything, try raw body text extraction
             body_text = target.get_text(separator="\n", strip=True)
             if len(body_text) > 100:
                  # Return roughly split paragraphs
                  return "".join([f"<p>{line}</p>" for line in body_text.split("\n") if len(line) > 30])
             
             return "<p>無法提取內文，請詳見原連結。</p>"

        return "\n".join(clean_content)

    except Exception as e:
        log_debug(f"Error cleaning HTML: {e}")
        return "<p>內容暫時無法取得</p>"

async def fetch_rss_xml(client, url):
    try:
        response = await client.get(url, timeout=15.0, follow_redirects=True)
        return response.text
    except Exception as e:
        log_debug(f"Error fetching RSS {url}: {e}")
        return None

async def fetch_and_process_news(db: AsyncSession):
    log_debug("Starting Playwright Crawler...")
    
    # 1. Fetch RSS XMLs using HTTPX (Fast)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    rss_data = []
    
    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        for feed_info in RSS_FEEDS:
            xml = await fetch_rss_xml(client, feed_info['url'])
            if xml:
                rss_data.append((feed_info, xml))

    total_added = 0
    
    # 2. Fetch Content and Process (Using HTTPX to avoid browser overhead/hangs)
    async with httpx.AsyncClient(follow_redirects=True) as client:
        for feed_info, xml_content in rss_data:
            feed = await asyncio.to_thread(parse_feed_sync, xml_content)
            log_debug(f"Processing {feed_info['source']}: {len(feed.entries)} entries found.")
            
            count = 0
            # Limit to 'expect' count (20) per source
            entries_to_process = feed.entries[:feed_info['expect']]
            
            for entry in entries_to_process:
                try:
                    link = entry.get('link')
                    if not link: continue

                    # Check duplicate (simple link check)
                    stmt = select(models.News).where(models.News.link == link)
                    result = await db.execute(stmt)
                    existing_item = result.scalars().first()
                    
                    # Decide whether to process:
                    # 1. New item (not existing)
                    # 2. Existing item but missing content or image (Retry)
                    should_process = False
                    if not existing_item:
                        should_process = True
                    elif (not existing_item.image_url) or (not existing_item.content_html) or ("無法取得" in existing_item.content_html):
                         should_process = True
                    elif existing_item.image_url and (existing_item.image_url in BLACKLIST_IMAGES or "pic_fb" in existing_item.image_url):
                         # Force update if image is blacklisted
                         should_process = True
                    
                    if not should_process:
                        continue

                    # Fetch Content and Image
                    content_html = "<p>內容暫時無法取得</p>"
                    image_url = None
                    try:
                        # Implement Exponential Backoff & User-Agent Rotation
                        max_retries = 3
                        resp = None
                        
                        for attempt in range(max_retries):
                            try:
                                # Rotate User-Agent per request
                                current_headers = {"User-Agent": random.choice(USER_AGENTS)}
                                
                                resp = await client.get(link, headers=current_headers, timeout=10.0)
                                
                                if resp.status_code == 200:
                                    break # Success
                                elif resp.status_code == 429:
                                    # Too Many Requests - Wait longer
                                    wait = 2 ** attempt # 1s, 2s, 4s
                                    # log_debug(f"Rate limited on {link}, waiting {wait}s...")
                                    await asyncio.sleep(wait)
                                else:
                                    # Other errors (404, 500) - maybe retry?
                                    pass
                            except Exception as req_err:
                                # Network error - Wait and retry
                                wait = 2 ** attempt
                                await asyncio.sleep(wait)
                        
                        if resp and resp.status_code == 200:
                            content_html = clean_html_static(resp.text)
                            
                            # Simple Image Extraction (OG Image -> Body Image)
                            try:
                                soup = BeautifulSoup(resp.text, 'html.parser')
                                
                                # 1. Check OG Image first, but validate it against generic patterns
                                og_image = soup.find("meta", property="og:image")
                                if og_image:
                                    candidate_url = og_image.get("content", "")
                                    # If candidate looks generic, ignore it to force body search
                                    lower_url = candidate_url.lower()
                                    if any(bad in lower_url for bad in ["pic_fb", "logo", "default", "placeholder", "share", "googleusercontent", "gstatic"]):
                                       image_url = None
                                    else:
                                       image_url = candidate_url

                                else:
                                    twitter_image = soup.find("meta", name="twitter:image")
                                    if twitter_image:
                                        image_url = twitter_image.get("content")
                                
                                # 2. Body Image Search (Fallback or if OG was generic)
                                if not image_url:
                                    # Reuse targeting logic
                                    article = soup.find('article') or \
                                             soup.find(class_='article-body') or \
                                             soup.find(class_='story-body') or \
                                             soup.find(class_='caas-body') or \
                                             soup.select_one('.ArticleBody-articleBody') or \
                                             soup.select_one('.RichTextArticleBody-body') or \
                                             soup.select_one('.group') or \
                                             soup.find(class_='paragraph')
                                    
                                    target = article if article else soup.body
                                    if target:
                                        # Find all images
                                        images = target.find_all('img')
                                        best_image = None
                                        best_score = -1
                                        
                                        article_title_words = set(entry.get('title', '').lower().split())

                                        for img in images:
                                            src = img.get('src', '')
                                            if not src or "http" not in src or "svg" in src or "icon" in src:
                                                continue
                                                
                                            # Skip blacklisted keywords in URL
                                            if any(bad in src.lower() for bad in ["logo", "avatar", "icon", "share", "fb_", "google", "line", "twitter", "facebook"]):
                                                continue
                                            
                                            alt_text = img.get('alt', '').lower()
                                            
                                            # Skip blacklisted keywords in Alt Text (e.g. "Join LINE", "Follow us")
                                            if any(bad in alt_text for bad in ["line", "facebook", "twitter", "追蹤", "官方帳號", "加入", "社群"]):
                                                continue

                                            score = 0
                                            alt_text = img.get('alt', '').lower()
                                            
                                            # Bonus for meaningful alt text
                                            if len(alt_text) > 5:
                                                score += 1
                                            
                                            # Bonus for matching title words (Semantic approximation)
                                            matches = sum(1 for word in article_title_words if len(word) > 1 and word in alt_text)
                                            score += matches * 2

                                            # Penalty for matching source name strictly (likely a specific source logo)
                                            if feed_info['source'].lower() in alt_text:
                                                score -= 5

                                            if score > best_score:
                                                best_score = score
                                                best_image = src
                                        
                                        if best_image:
                                            image_url = best_image
                            except:
                                pass
                            
                            # Final Blacklist Check
                            if image_url and (image_url in BLACKLIST_IMAGES):
                                image_url = None
                    except Exception as e:
                        pass

                    # Sentiment Analysis
                    title = entry.get('title', '')
                    summary = entry.get('summary', '')
                    blob = TextBlob(f"{title} {summary}")
                    sentiment = blob.sentiment.polarity
                    
                    # Simple Chinese Sentiment Filter
                    if sentiment == 0:
                        text_content = f"{title} {summary}"
                        positive_keywords = ["漲", "升", "高", "紅", "旺", "熱", "強", "增", "盈", "利", "好", "優", "勝", "賺", "發", "多"]
                        negative_keywords = ["跌", "降", "低", "綠", "冷", "弱", "減", "虧", "損", "壞", "劣", "敗", "賠", "去", "空"]
                        
                        pos_score = sum(1 for k in positive_keywords if k in text_content)
                        neg_score = sum(1 for k in negative_keywords if k in text_content)
                        
                        # Dynamic Scoring
                        # Calculate net score and scale it. 
                        # Assuming each keyword carries some weight.
                        # We use 0.15 as a multiplier, so +3 net keywords = 0.45, +7 = >1.0
                        net_score = pos_score - neg_score
                        if net_score != 0:
                            raw_sentiment = net_score * 0.15
                            # Clamp between -1.0 and 1.0
                            sentiment = max(-1.0, min(1.0, raw_sentiment))
                    
                    # Date
                    pub_date_str = entry.get('published')
                    published_at = datetime.utcnow()
                    if pub_date_str:
                        try:
                            dt = parsedate_to_datetime(pub_date_str)
                            # Convert to simplified UTC naive datetime for Postgres TIMESTAMP compatibility
                            if dt.tzinfo:
                                dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
                            published_at = dt
                        except: pass

                    if existing_item:
                        # Update existing
                        existing_item.content_html = content_html
                        # ALWAYS update image_url to allow clearing bad images (set to None)
                        existing_item.image_url = image_url
                        
                        # Re-run sentiment if it was 0 (fix for Chinese)
                        if existing_item.sentiment == 0 and sentiment != 0:
                            existing_item.sentiment = sentiment
                        # Don't overwrite title/date/source as they are likely fine
                    else:
                        # Create new
                        news_item = models.News(
                            title=title,
                            summary=summary,
                            link=link,
                            source=feed_info['source'],
                            published_at=published_at,
                            sentiment=sentiment,
                            entities={},
                            relevance=1,
                            content_html=content_html,
                            image_url=image_url
                        )
                        db.add(news_item)
                    
                    count += 1
                except Exception as e:
                    log_debug(f"Error processing entry: {e}")
            
            total_added += count
            
            await db.commit()

    # 3. Cleanup Old News (Retention Policy: 30 Days)
    try:
        await cleanup_old_news(db, days=30)
    except Exception as e:
        log_debug(f"Cleanup error: {e}")

    log_debug("News crawling completed.")
    return {"feeds_fetched": len(rss_data), "total_added": total_added}

async def cleanup_old_news(db: AsyncSession, days: int = 30):
    """
    Maintenance task to keep the database size under control (Free Tier Friendly).
    Policy:
    1. Time-based: Delete news older than 'days' (default 30).
    2. Size-based (FIFO): Keep max 10,000 records (approx 50MB-100MB).
       If count > 10,000, delete the oldest records regardless of time.
    """
    # 1. Time-based Cleanup
    cutoff = datetime.utcnow() - timedelta(days=days)
    log_debug(f"Cleanup: Removing news older than {days} days (before {cutoff})...")
    
    from sqlalchemy import delete, func, select
    
    # Execute Time Cleanup
    stmt_time = delete(models.News).where(models.News.published_at < cutoff)
    result_time = await db.execute(stmt_time)
    log_debug(f"Cleanup (Time): Deleted {result_time.rowcount} expired items.")
    
    # 2. Size-based Cleanup (Max Limit)
    MAX_ITEMS = 10000 
    # Calculation: 10,000 records * ~10KB/record = ~100MB. 
    # This is well within the 500MB-1GB free tier limit.
    
    # Get current count
    count_res = await db.execute(select(func.count(models.News.id)))
    total_count = count_res.scalar()
    
    if total_count > MAX_ITEMS:
        excess = total_count - MAX_ITEMS
        log_debug(f"Cleanup (Size): Count {total_count} exceeds limit {MAX_ITEMS}. Deleting {excess} oldest items...")
        
        # Identify IDs to delete (Oldest First)
        # Subquery to find the IDs of the oldest 'excess' rows
        subquery = (
            select(models.News.id)
            .order_by(models.News.published_at.asc())
            .limit(excess)
        )
        
        # Delete them
        stmt_size = delete(models.News).where(models.News.id.in_(subquery))
        result_size = await db.execute(stmt_size)
        log_debug(f"Cleanup (Size): Deleted {result_size.rowcount} old items to free space.")
    
    await db.commit()
