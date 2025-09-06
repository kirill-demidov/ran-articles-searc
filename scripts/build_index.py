#!/usr/bin/env python3
"""
Генератор поискового индекса из данных в GCS для GitHub Pages
"""

import json
import os
import re
from datetime import datetime
from typing import List, Dict, Any
from google.cloud import storage
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RANIndexBuilder:
    def __init__(self, bucket_name: str = "journals-ran", output_dir: str = "data"):
        """
        Инициализация билдера индекса
        
        Args:
            bucket_name: Имя GCS bucket
            output_dir: Директория для сохранения файлов
        """
        self.bucket_name = bucket_name
        self.output_dir = output_dir
        
        # Подключение к GCS
        try:
            self.storage_client = storage.Client()
            self.bucket = self.storage_client.bucket(bucket_name)
            logger.info(f"✅ Подключен к GCS bucket: {bucket_name}")
        except Exception as e:
            logger.error(f"❌ Ошибка подключения к GCS: {e}")
            self.bucket = None
    
    def collect_all_metadata(self) -> List[Dict[str, Any]]:
        """Собираем все metadata.json файлы из GCS"""
        if not self.bucket:
            logger.error("Нет подключения к GCS")
            return []
        
        articles = []
        processed_count = 0
        error_count = 0
        
        logger.info("🔍 Собираем метаданные из GCS...")
        
        # Получаем все metadata.json файлы
        blobs = self.bucket.list_blobs(prefix="journals/")
        
        for blob in blobs:
            if blob.name.endswith("metadata.json"):
                try:
                    # Скачиваем и парсим метаданные
                    metadata_content = blob.download_as_text()
                    metadata = json.loads(metadata_content)
                    
                    # Обрабатываем метаданные
                    article = self.process_metadata(metadata, blob.name)
                    if article:
                        articles.append(article)
                        processed_count += 1
                        
                        if processed_count % 100 == 0:
                            logger.info(f"📄 Обработано {processed_count} статей...")
                
                except Exception as e:
                    error_count += 1
                    logger.warning(f"⚠️ Ошибка обработки {blob.name}: {e}")
        
        logger.info(f"✅ Собрано {processed_count} статей, ошибок: {error_count}")
        return articles
    
    def process_metadata(self, metadata: Dict, blob_path: str) -> Dict[str, Any]:
        """
        Преобразуем metadata.json в формат для индекса
        
        Args:
            metadata: Содержимое metadata.json
            blob_path: Путь к файлу в GCS
            
        Returns:
            Обработанные данные статьи
        """
        try:
            # Извлекаем путь: journals/2075-8251/19395/293590/metadata.json
            path_parts = blob_path.split('/')
            if len(path_parts) < 5:
                logger.warning(f"Неправильная структура пути: {blob_path}")
                return None
            
            journal_id = path_parts[1]
            issue_id = path_parts[2] 
            article_id = path_parts[3]
            
            # Извлекаем данные
            journal_info = metadata.get("journal", {})
            issue_info = metadata.get("issue", {})
            article_info = metadata.get("metadata", {})
            download_links = metadata.get("download_links", {})
            
            # Извлекаем год из названия выпуска или issue_info
            year = self.extract_year(issue_info.get("title", ""), issue_info.get("year"))
            
            # Очищаем и нормализуем данные
            authors = self.clean_authors(article_info.get("authors", []))
            keywords = self.clean_keywords(article_info.get("keywords", []))
            abstract = self.clean_text(article_info.get("abstract", ""))
            title = self.clean_text(article_info.get("title", ""))
            
            # Создаем структуру статьи
            article = {
                "id": f"{journal_id}_{issue_id}_{article_id}",
                "journal": {
                    "id": journal_id,
                    "title": journal_info.get("title", "").strip(),
                    "url": journal_info.get("url", "")
                },
                "issue": {
                    "id": issue_id,
                    "title": issue_info.get("title", "").strip(),
                    "year": year,
                    "url": issue_info.get("url", "")
                },
                "article": {
                    "id": article_id,
                    "title": title,
                    "authors": authors,
                    "abstract": abstract,
                    "keywords": keywords,
                    "doi": article_info.get("doi", "").strip(),
                    "pages": article_info.get("pages", "").strip()
                },
                "files": {
                    "pdf_ru": f"gs://{self.bucket_name}/journals/{journal_id}/{issue_id}/{article_id}/article_ru.pdf",
                    "pdf_en": f"gs://{self.bucket_name}/journals/{journal_id}/{issue_id}/{article_id}/article_en.pdf",
                    "xml": f"gs://{self.bucket_name}/journals/{journal_id}/{issue_id}/{article_id}/article.xml"
                },
                "download_links": {
                    "pdf_ru": download_links.get("pdf_ru"),
                    "pdf_en": download_links.get("pdf_en"),
                    "xml": download_links.get("xml")
                },
                "indexed_date": datetime.now().isoformat()
            }
            
            return article
            
        except Exception as e:
            logger.error(f"Ошибка обработки метаданных из {blob_path}: {e}")
            return None
    
    def extract_year(self, issue_title: str, year_field: Any = None) -> int:
        """Извлекает год из названия выпуска или поля года"""
        # Сначала пробуем поле year
        if year_field:
            try:
                return int(year_field)
            except:
                pass
        
        # Ищем год в названии выпуска
        if issue_title:
            year_match = re.search(r'20\d{2}', issue_title)
            if year_match:
                return int(year_match.group())
        
        # По умолчанию текущий год
        return datetime.now().year
    
    def clean_authors(self, authors: List[str]) -> List[str]:
        """Очищает список авторов от дубликатов и лишних символов"""
        if not authors:
            return []
        
        cleaned = []
        seen = set()
        
        for author in authors:
            if not author:
                continue
                
            # Очищаем от лишних пробелов
            author = author.strip()
            
            # Убираем дубликаты (игнорируем регистр)
            author_lower = author.lower()
            if author_lower not in seen:
                cleaned.append(author)
                seen.add(author_lower)
        
        return cleaned
    
    def clean_keywords(self, keywords: List[str]) -> List[str]:
        """Очищает ключевые слова"""
        if not keywords:
            return []
        
        cleaned = []
        for keyword in keywords:
            if keyword and keyword.strip():
                cleaned.append(keyword.strip())
        
        return list(set(cleaned))  # Убираем дубликаты
    
    def clean_text(self, text: str) -> str:
        """Очищает текст от лишних символов и пробелов"""
        if not text:
            return ""
        
        # Убираем лишние пробелы и переносы
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Убираем HTML теги если есть
        text = re.sub(r'<[^>]+>', '', text)
        
        return text
    
    def build_lunr_index(self, articles: List[Dict]) -> Dict:
        """
        Строит поисковый индекс для Lunr.js
        
        Args:
            articles: Список статей
            
        Returns:
            Сериализованный индекс Lunr.js
        """
        logger.info("🔧 Строим поисковый индекс...")
        
        # Подготавливаем документы для индексации
        documents = []
        for i, article in enumerate(articles):
            doc = {
                'id': str(i),
                'title': article['article'].get('title', ''),
                'authors': ' '.join(article['article'].get('authors', [])),
                'abstract': article['article'].get('abstract', ''),
                'keywords': ' '.join(article['article'].get('keywords', [])),
                'journal': article['journal'].get('title', ''),
                'doi': article['article'].get('doi', ''),
                'year': str(article['issue'].get('year', ''))
            }
            documents.append(doc)
        
        # Создаем конфигурацию индекса для lunr.js
        index_config = {
            "version": "2.3.9",
            "fields": [
                {"fieldName": "title", "boost": 10},
                {"fieldName": "authors", "boost": 5},
                {"fieldName": "keywords", "boost": 8},
                {"fieldName": "abstract", "boost": 2},
                {"fieldName": "journal", "boost": 3},
                {"fieldName": "doi", "boost": 15},
                {"fieldName": "year", "boost": 1}
            ],
            "ref": "id",
            "documents": documents
        }
        
        logger.info(f"✅ Индекс построен для {len(documents)} документов")
        return index_config
    
    def generate_website_data(self) -> None:
        """Генерируем все данные для веб-сайта"""
        logger.info("🚀 Начинаем генерацию данных для сайта...")
        
        # Создаем директорию для данных
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Собираем статьи
        articles = self.collect_all_metadata()
        
        if not articles:
            logger.error("❌ Не удалось собрать данные о статьях")
            return
        
        # Генерируем статистику
        stats = self.generate_stats(articles)
        
        # Сохраняем основные данные
        articles_data = {
            "articles": articles,
            "stats": stats
        }
        
        articles_file = os.path.join(self.output_dir, "articles.json")
        with open(articles_file, 'w', encoding='utf-8') as f:
            json.dump(articles_data, f, ensure_ascii=False, indent=None, separators=(',', ':'))
        
        logger.info(f"💾 Сохранены данные о статьях: {articles_file}")
        
        # Строим и сохраняем поисковый индекс  
        search_index = self.build_lunr_index(articles)
        
        index_file = os.path.join(self.output_dir, "search-index.json")
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(search_index, f, separators=(',', ':'))
        
        logger.info(f"🔍 Сохранен поисковый индекс: {index_file}")
        
        # Генерируем дополнительные файлы
        self.generate_journals_list(articles)
        self.generate_sitemap(articles)
        
        logger.info("🎉 Генерация данных завершена!")
        logger.info(f"📊 Статистика:")
        logger.info(f"   📚 Статей: {stats['total_articles']}")
        logger.info(f"   🏛️ Журналов: {stats['total_journals']}")
        logger.info(f"   📅 Годы: {stats['year_range'][0]}-{stats['year_range'][1]}")
    
    def generate_stats(self, articles: List[Dict]) -> Dict:
        """Генерирует статистику по статьям"""
        journals = set()
        years = []
        authors = set()
        keywords = set()
        
        for article in articles:
            journals.add(article['journal']['id'])
            years.append(article['issue']['year'])
            
            for author in article['article']['authors']:
                authors.add(author)
            
            for keyword in article['article']['keywords']:
                keywords.add(keyword)
        
        return {
            "total_articles": len(articles),
            "total_journals": len(journals),
            "total_authors": len(authors),
            "total_keywords": len(keywords),
            "year_range": [min(years) if years else 2020, max(years) if years else 2025],
            "last_updated": datetime.now().isoformat()
        }
    
    def generate_journals_list(self, articles: List[Dict]) -> None:
        """Генерирует список журналов"""
        journals_map = {}
        
        for article in articles:
            journal_id = article['journal']['id']
            if journal_id not in journals_map:
                journals_map[journal_id] = {
                    "id": journal_id,
                    "title": article['journal']['title'],
                    "url": article['journal']['url'],
                    "article_count": 0
                }
            journals_map[journal_id]["article_count"] += 1
        
        journals_list = list(journals_map.values())
        journals_list.sort(key=lambda x: x['title'])
        
        journals_file = os.path.join(self.output_dir, "journals.json")
        with open(journals_file, 'w', encoding='utf-8') as f:
            json.dump({
                "journals": journals_list,
                "total": len(journals_list)
            }, f, ensure_ascii=False, indent=2)
        
        logger.info(f"📋 Сохранен список журналов: {journals_file}")
    
    def generate_sitemap(self, articles: List[Dict]) -> None:
        """Генерирует sitemap.xml"""
        sitemap_content = ['<?xml version="1.0" encoding="UTF-8"?>']
        sitemap_content.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
        
        # Главная страница
        sitemap_content.append('  <url>')
        sitemap_content.append('    <loc>https://username.github.io/ran-articles-search/</loc>')
        sitemap_content.append('    <changefreq>daily</changefreq>')
        sitemap_content.append('    <priority>1.0</priority>')
        sitemap_content.append('  </url>')
        
        # Страницы статей (для первых 1000)
        for article in articles[:1000]:
            sitemap_content.append('  <url>')
            sitemap_content.append(f'    <loc>https://username.github.io/ran-articles-search/#article-{article["id"]}</loc>')
            sitemap_content.append('    <changefreq>monthly</changefreq>')
            sitemap_content.append('    <priority>0.7</priority>')
            sitemap_content.append('  </url>')
        
        sitemap_content.append('</urlset>')
        
        sitemap_file = "sitemap.xml"
        with open(sitemap_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(sitemap_content))
        
        logger.info(f"🗺️ Сохранен sitemap: {sitemap_file}")

def main():
    """Основная функция"""
    # Получаем параметры из окружения
    bucket_name = os.getenv("GCS_BUCKET_NAME", "journals-ran")
    output_dir = os.getenv("OUTPUT_DIR", "data")
    
    # Создаем билдер и генерируем данные
    builder = RANIndexBuilder(bucket_name, output_dir)
    builder.generate_website_data()

if __name__ == "__main__":
    main()