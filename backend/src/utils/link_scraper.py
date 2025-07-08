import asyncio
import io
import json
import re
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin, urlparse

import aiohttp
from bs4 import BeautifulSoup
from PyPDF2 import PdfReader
from docx import Document

from src.utils.logger import logger


class LinkScraper:
    """Comprehensive web link scraper with support for various content types."""
    
    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.session = None
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.timeout),
            headers=self.headers
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def scrape_link(self, url: str) -> Dict[str, Any]:
        """
        Scrape a link and extract comprehensive information.
        
        Args:
            url: The URL to scrape
            
        Returns:
            Dictionary containing scraped information
        """
        if not url:
            return {"error": "No URL provided"}
        
        try:
            logger.info(f"Scraping link: {url}")
            
            # Determine link type and use appropriate scraping strategy
            link_type = self._determine_link_type(url)
            
            if link_type == "github":
                return await self._scrape_github(url)
            elif link_type == "linkedin":
                return await self._scrape_linkedin(url)
            elif link_type == "document":
                return await self._scrape_document(url)
            elif link_type == "portfolio":
                return await self._scrape_portfolio(url)
            else:
                return await self._scrape_generic_website(url)
                
        except Exception as e:
            logger.error(f"Error scraping link {url}: {e}")
            return {"error": str(e), "url": url}
    
    def _determine_link_type(self, url: str) -> str:
        """Determine the type of link based on URL patterns."""
        url_lower = url.lower()
        
        if "github.com" in url_lower:
            return "github"
        elif "linkedin.com" in url_lower:
            return "linkedin"
        elif any(ext in url_lower for ext in ['.pdf', '.doc', '.docx', '.txt']):
            return "document"
        elif any(domain in url_lower for domain in ['portfolio', 'personal', 'resume', 'cv']):
            return "portfolio"
        else:
            return "website"
    
    async def _scrape_github(self, url: str) -> Dict[str, Any]:
        """Scrape GitHub repository or profile."""
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    return {"error": f"HTTP {response.status}", "url": url}
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                result = {
                    "type": "github",
                    "url": url,
                    "title": self._extract_title(soup),
                    "description": "",
                    "languages": [],
                    "topics": [],
                    "readme": "",
                    "stars": 0,
                    "forks": 0,
                    "files": []
                }
                
                # Extract repository information
                if "/tree/main" in url or "/tree/master" in url or url.count("/") == 4:
                    # Repository page
                    desc_elem = soup.find('p', class_='f4 my-3')
                    if desc_elem:
                        result["description"] = desc_elem.get_text(strip=True)
                    
                    # Languages
                    lang_elements = soup.find_all('span', class_='color-fg-default text-bold mr-1')
                    result["languages"] = [lang.get_text(strip=True) for lang in lang_elements]
                    
                    # Topics
                    topic_elements = soup.find_all('a', class_='topic-tag')
                    result["topics"] = [topic.get_text(strip=True) for topic in topic_elements]
                    
                    # Stars and forks
                    star_elem = soup.find('a', {'href': re.compile(r'.*/stargazers')})
                    if star_elem:
                        result["stars"] = self._extract_number(star_elem.get_text())
                    
                    fork_elem = soup.find('a', {'href': re.compile(r'.*/forks')})
                    if fork_elem:
                        result["forks"] = self._extract_number(fork_elem.get_text())
                    
                    # README content
                    readme_elem = soup.find('div', class_='Box-body px-5 pb-5')
                    if readme_elem:
                        result["readme"] = readme_elem.get_text(strip=True)[:2000]  # Limit README length
                    
                    # File structure
                    file_elements = soup.find_all('a', class_='js-navigation-open Link--primary')
                    result["files"] = [file.get_text(strip=True) for file in file_elements[:20]]  # Limit files
                
                return result
                
        except Exception as e:
            logger.error(f"Error scraping GitHub: {e}")
            return {"error": str(e), "type": "github", "url": url}
    
    async def _scrape_linkedin(self, url: str) -> Dict[str, Any]:
        """Scrape LinkedIn profile (limited due to LinkedIn's restrictions)."""
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    return {"error": f"HTTP {response.status}", "url": url}
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                result = {
                    "type": "linkedin",
                    "url": url,
                    "title": self._extract_title(soup),
                    "description": "",
                    "profile_info": {},
                    "note": "LinkedIn content is limited due to platform restrictions"
                }
                
                # Extract basic profile information (limited)
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                if meta_desc:
                    result["description"] = meta_desc.get('content', '')
                
                return result
                
        except Exception as e:
            logger.error(f"Error scraping LinkedIn: {e}")
            return {"error": str(e), "type": "linkedin", "url": url}
    
    async def _scrape_document(self, url: str) -> Dict[str, Any]:
        """Scrape document files (PDF, DOC, DOCX, TXT)."""
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    return {"error": f"HTTP {response.status}", "url": url}
                
                content_type = response.headers.get('content-type', '').lower()
                content = await response.read()
                
                result = {
                    "type": "document",
                    "url": url,
                    "content_type": content_type,
                    "size": len(content),
                    "text_content": "",
                    "summary": ""
                }
                
                # Extract text based on document type
                if 'pdf' in content_type or url.lower().endswith('.pdf'):
                    result["text_content"] = self._extract_pdf_content(content)
                elif 'docx' in content_type or url.lower().endswith('.docx'):
                    result["text_content"] = self._extract_docx_content(content)
                elif 'text' in content_type or url.lower().endswith('.txt'):
                    result["text_content"] = content.decode('utf-8', errors='ignore')
                
                # Create summary
                if result["text_content"]:
                    result["summary"] = self._create_text_summary(result["text_content"])
                
                return result
                
        except Exception as e:
            logger.error(f"Error scraping document: {e}")
            return {"error": str(e), "type": "document", "url": url}
    
    async def _scrape_portfolio(self, url: str) -> Dict[str, Any]:
        """Scrape portfolio website."""
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    return {"error": f"HTTP {response.status}", "url": url}
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                result = {
                    "type": "portfolio",
                    "url": url,
                    "title": self._extract_title(soup),
                    "description": self._extract_meta_description(soup),
                    "headings": self._extract_headings(soup),
                    "links": self._extract_links(soup, url),
                    "images": self._extract_images(soup, url),
                    "contact_info": self._extract_contact_info(soup),
                    "skills": self._extract_skills(soup),
                    "projects": self._extract_projects(soup),
                    "text_content": self._extract_text_content(soup)
                }
                
                return result
                
        except Exception as e:
            logger.error(f"Error scraping portfolio: {e}")
            return {"error": str(e), "type": "portfolio", "url": url}
    
    async def _scrape_generic_website(self, url: str) -> Dict[str, Any]:
        """Scrape generic website."""
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    return {"error": f"HTTP {response.status}", "url": url}
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                result = {
                    "type": "website",
                    "url": url,
                    "title": self._extract_title(soup),
                    "description": self._extract_meta_description(soup),
                    "headings": self._extract_headings(soup),
                    "links": self._extract_links(soup, url),
                    "images": self._extract_images(soup, url),
                    "text_content": self._extract_text_content(soup)
                }
                
                return result
                
        except Exception as e:
            logger.error(f"Error scraping website: {e}")
            return {"error": str(e), "type": "website", "url": url}
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract page title."""
        title = soup.find('title')
        return title.get_text(strip=True) if title else ""
    
    def _extract_meta_description(self, soup: BeautifulSoup) -> str:
        """Extract meta description."""
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        return meta_desc.get('content', '') if meta_desc else ""
    
    def _extract_headings(self, soup: BeautifulSoup) -> List[str]:
        """Extract all headings (h1-h6)."""
        headings = []
        for i in range(1, 7):
            for heading in soup.find_all(f'h{i}'):
                text = heading.get_text(strip=True)
                if text:
                    headings.append(text)
        return headings[:20]  # Limit headings
    
    def _extract_links(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        """Extract all links."""
        links = []
        for link in soup.find_all('a', href=True):
            href = link.get('href')
            text = link.get_text(strip=True)
            if href and text:
                full_url = urljoin(base_url, href)
                links.append({"url": full_url, "text": text})
        return links[:30]  # Limit links
    
    def _extract_images(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """Extract image URLs."""
        images = []
        for img in soup.find_all('img', src=True):
            src = img.get('src')
            if src:
                full_url = urljoin(base_url, src)
                images.append(full_url)
        return images[:20]  # Limit images
    
    def _extract_contact_info(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract contact information."""
        contact_info = {}
        text = soup.get_text()
        
        # Email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        if emails:
            contact_info["email"] = emails[0]
        
        # Phone
        phone_pattern = r'\+?1?-?\(?\d{3}\)?-?\d{3}-?\d{4}'
        phones = re.findall(phone_pattern, text)
        if phones:
            contact_info["phone"] = phones[0]
        
        return contact_info
    
    def _extract_skills(self, soup: BeautifulSoup) -> List[str]:
        """Extract skills from common patterns."""
        skills = []
        text = soup.get_text().lower()
        
        # Common skill keywords
        skill_keywords = [
            'python', 'javascript', 'react', 'node.js', 'java', 'c++', 'html', 'css',
            'sql', 'mongodb', 'postgresql', 'docker', 'kubernetes', 'aws', 'azure',
            'machine learning', 'data science', 'tensorflow', 'pytorch', 'git'
        ]
        
        for skill in skill_keywords:
            if skill in text:
                skills.append(skill)
        
        return skills[:15]  # Limit skills
    
    def _extract_projects(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """Extract project information."""
        projects = []
        
        # Look for project sections
        project_sections = soup.find_all(['div', 'section'], class_=re.compile(r'project', re.I))
        for section in project_sections:
            title = section.find(['h1', 'h2', 'h3', 'h4'])
            if title:
                project_title = title.get_text(strip=True)
                project_desc = section.get_text(strip=True)[:500]  # Limit description
                projects.append({"title": project_title, "description": project_desc})
        
        return projects[:10]  # Limit projects
    
    def _extract_text_content(self, soup: BeautifulSoup) -> str:
        """Extract clean text content."""
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        text = soup.get_text()
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return clean_text[:3000]  # Limit text content
    
    def _extract_pdf_content(self, pdf_content: bytes) -> str:
        """Extract text from PDF."""
        try:
            pdf_file = io.BytesIO(pdf_content)
            reader = PdfReader(pdf_file)
            text_content = []
            for page in reader.pages:
                text_content.append(page.extract_text())
            return '\n'.join(text_content).strip()[:3000]  # Limit content
        except Exception as e:
            logger.error(f"Error extracting PDF content: {e}")
            return ""
    
    def _extract_docx_content(self, docx_content: bytes) -> str:
        """Extract text from DOCX."""
        try:
            docx_file = io.BytesIO(docx_content)
            doc = Document(docx_file)
            text_content = []
            for paragraph in doc.paragraphs:
                text_content.append(paragraph.text)
            return '\n'.join(text_content).strip()[:3000]  # Limit content
        except Exception as e:
            logger.error(f"Error extracting DOCX content: {e}")
            return ""
    
    def _extract_number(self, text: str) -> int:
        """Extract number from text."""
        numbers = re.findall(r'\d+', text)
        return int(numbers[0]) if numbers else 0
    
    def _create_text_summary(self, text: str) -> str:
        """Create a summary of text content."""
        # Simple summary: first 500 characters
        if len(text) > 500:
            return text[:500] + "..."
        return text


async def scrape_link_async(url: str) -> Dict[str, Any]:
    """
    Async function to scrape a single link.
    
    Args:
        url: The URL to scrape
        
    Returns:
        Dictionary containing scraped information
    """
    async with LinkScraper() as scraper:
        return await scraper.scrape_link(url)


async def scrape_multiple_links_async(urls: List[str]) -> List[Dict[str, Any]]:
    """
    Async function to scrape multiple links concurrently.
    
    Args:
        urls: List of URLs to scrape
        
    Returns:
        List of dictionaries containing scraped information
    """
    async with LinkScraper() as scraper:
        tasks = [scraper.scrape_link(url) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)


def scrape_link_sync(url: str) -> Dict[str, Any]:
    """
    Synchronous wrapper for scraping a single link.
    
    Args:
        url: The URL to scrape
        
    Returns:
        Dictionary containing scraped information
    """
    try:
        # Check if there's already a running event loop
        try:
            loop = asyncio.get_running_loop()
            # If we're in an async context, we need to run in a new thread
            import concurrent.futures
            import threading
            
            def run_in_thread():
                return asyncio.run(scrape_link_async(url))
            
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_in_thread)
                return future.result()
        except RuntimeError:
            # No running event loop, safe to use asyncio.run()
            return asyncio.run(scrape_link_async(url))
    except Exception as e:
        logger.error(f"Error in sync scraping: {e}")
        return {"error": str(e), "url": url}


def scrape_multiple_links_sync(urls: List[str]) -> List[Dict[str, Any]]:
    """
    Synchronous wrapper for scraping multiple links.
    
    Args:
        urls: List of URLs to scrape
        
    Returns:
        List of dictionaries containing scraped information
    """
    try:
        # Check if there's already a running event loop
        try:
            loop = asyncio.get_running_loop()
            # If we're in an async context, we need to run in a new thread
            import concurrent.futures
            import threading
            
            def run_in_thread():
                return asyncio.run(scrape_multiple_links_async(urls))
            
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_in_thread)
                return future.result()
        except RuntimeError:
            # No running event loop, safe to use asyncio.run()
            return asyncio.run(scrape_multiple_links_async(urls))
    except Exception as e:
        logger.error(f"Error in sync scraping multiple links: {e}")
        return [{"error": str(e), "url": url} for url in urls] 