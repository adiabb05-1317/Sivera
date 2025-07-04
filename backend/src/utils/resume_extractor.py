"""
Resume content extraction utility.
Supports PDF, DOCX, HTML, and plain text formats.
"""

import io
from typing import Optional

from bs4 import BeautifulSoup
from docx import Document
from PyPDF2 import PdfReader
import requests

from src.utils.logger import logger


def extract_resume_content(url: str) -> str:
    """
    Extract text content from a resume URL.
    Supports PDF, DOCX, HTML, and plain text formats.

    Args:
        url: The URL to fetch the resume from

    Returns:
        Extracted text content or empty string if extraction fails
    """
    if not url:
        return ""

    try:
        logger.info(f"Fetching resume from URL: {url}")

        response = requests.get(
            url,
            timeout=30,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        )
        response.raise_for_status()

        # Determine file type from URL or content type
        content_type = response.headers.get("content-type", "").lower()
        url_lower = url.lower()

        if "application/pdf" in content_type or url_lower.endswith(".pdf"):
            return _extract_pdf_content(response.content)

        elif (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            in content_type
            or url_lower.endswith(".docx")
        ):
            return _extract_docx_content(response.content)

        elif "text/html" in content_type or url_lower.endswith(".html"):
            return _extract_html_content(response.text)

        elif "text/plain" in content_type or url_lower.endswith(".txt"):
            return response.text

        else:
            # Try to extract as text first, fallback to PDF
            try:
                return response.text
            except:
                return _extract_pdf_content(response.content)

    except Exception as e:
        logger.error(f"Failed to extract resume content from {url}: {e}")
        return ""


def _extract_pdf_content(pdf_content: bytes) -> str:
    """Extract text content from PDF bytes."""
    try:
        pdf_file = io.BytesIO(pdf_content)
        reader = PdfReader(pdf_file)

        text_content = []
        for page in reader.pages:
            text_content.append(page.extract_text())

        return "\n".join(text_content).strip()
    except Exception as e:
        logger.error(f"Failed to extract PDF content: {e}")
        return ""


def _extract_docx_content(docx_content: bytes) -> str:
    """Extract text content from DOCX bytes."""
    try:
        docx_file = io.BytesIO(docx_content)
        doc = Document(docx_file)

        text_content = []
        for paragraph in doc.paragraphs:
            text_content.append(paragraph.text)

        return "\n".join(text_content).strip()
    except Exception as e:
        logger.error(f"Failed to extract DOCX content: {e}")
        return ""


def _extract_html_content(html_content: str) -> str:
    """Extract text content from HTML."""
    try:
        soup = BeautifulSoup(html_content, "html.parser")

        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()

        # Get text and clean it up
        text = soup.get_text()
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = "\n".join(chunk for chunk in chunks if chunk)

        return text
    except Exception as e:
        logger.error(f"Failed to extract HTML content: {e}")
        return ""


def process_resume_content(content: str, max_length: int = 5000) -> str:
    """
    Process and optionally truncate resume content.

    Args:
        content: Raw resume content
        max_length: Maximum character length (default: 5000)

    Returns:
        Processed resume content
    """
    if not content or not content.strip():
        return ""

    content = content.strip()

    if len(content) > max_length:
        content = content[:max_length] + "...[truncated]"
        logger.info(f"Resume content truncated to {max_length} characters")

    return content


def fetch_and_process_resume(url: Optional[str], candidate_name: str = "") -> str:
    """
    Main function to fetch and process resume content.

    Args:
        url: Resume URL
        candidate_name: Candidate name for logging

    Returns:
        Processed resume content
    """
    if not url:
        logger.info("No resume URL provided")
        return ""

    logger.info(f"Fetching resume content for candidate: {candidate_name}")

    try:
        content = extract_resume_content(url)

        if content:
            processed_content = process_resume_content(content)
            logger.info(
                f"Successfully extracted resume content ({len(processed_content)} characters)"
            )
            return processed_content
        else:
            logger.warning("No content extracted from resume URL")
            return ""

    except Exception as e:
        logger.error(f"Error fetching resume content: {e}")
        return ""
