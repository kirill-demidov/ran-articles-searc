/**
 * Минимальная исправленная версия поиска
 */
class FixedRANSearch {
    constructor() {
        this.articles = [];
        this.searchIndex = null;
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Фиксированная инициализация...');
            
            // Загружаем articles.json
            const articlesResponse = await fetch(`data/articles.json?v=${Date.now()}`);
            if (!articlesResponse.ok) throw new Error(`Articles HTTP ${articlesResponse.status}`);
            const articlesData = await articlesResponse.json();
            this.articles = articlesData.articles || [];
            console.log(`📚 Загружено статей: ${this.articles.length}`);
            
            // Загружаем search-index.json
            const indexResponse = await fetch(`data/search-index.json?v=${Date.now()}`);
            if (!indexResponse.ok) throw new Error(`Index HTTP ${indexResponse.status}`);
            const indexData = await indexResponse.json();
            console.log(`📊 Загружен индекс с ${indexData.documents?.length || 0} документами`);
            
            // Создаем Lunr.js индекс из документов
            if (indexData.documents && indexData.documents.length > 0) {
                this.searchIndex = lunr(function() {
                    this.ref('id');
                    this.field('title', { boost: 10 });
                    this.field('authors', { boost: 5 });
                    this.field('keywords', { boost: 8 });
                    this.field('abstract', { boost: 2 });
                    this.field('journal', { boost: 3 });
                    this.field('doi', { boost: 15 });
                    
                    indexData.documents.forEach((doc) => {
                        this.add(doc);
                    });
                });
                console.log('✅ Lunr.js индекс создан');
            } else {
                throw new Error('Нет документов в индексе');
            }
            
            // Обновляем статистику
            this.updateStats(articlesData.stats);
            
            // Убираем загрузочный экран
            document.getElementById('loading').classList.add('hidden');
            
            // Показываем результаты (все статьи)
            this.displayResults(this.articles);
            
            console.log('✅ Инициализация завершена');
            
        } catch (error) {
            console.error('❌ Ошибка:', error);
            document.getElementById('loading').innerHTML = `
                <div style="text-align: center; color: #e74c3c;">
                    <h3>❌ Ошибка загрузки</h3>
                    <p>${error.message}</p>
                    <p>Попробуйте перезагрузить страницу</p>
                </div>
            `;
        }
    }
    
    updateStats(stats) {
        const totalCountEl = document.getElementById('total-count');
        const journalCountEl = document.getElementById('journal-count');
        
        if (totalCountEl) totalCountEl.textContent = (stats?.total_articles || this.articles.length).toLocaleString();
        if (journalCountEl) journalCountEl.textContent = stats?.total_journals || '1';
    }
    
    displayResults(articles) {
        const resultsContainer = document.getElementById('results');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = articles.slice(0, 20).map((article, index) => `
            <div class="result-item">
                <h3>${article.article?.title || 'No title'}</h3>
                <p><strong>Авторы:</strong> ${(article.article?.authors || []).join(', ')}</p>
                <p><strong>Журнал:</strong> ${article.journal?.title || 'Unknown'} (${article.issue?.year || 'Unknown'})</p>
                <p><strong>DOI:</strong> ${article.article?.doi || 'Not available'}</p>
                ${article.download_urls?.pdf_ru ? `<a href="${article.download_urls.pdf_ru}" target="_blank">📄 PDF (RU)</a>` : ''}
            </div>
        `).join('');
    }
}

// Инициализируем при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    new FixedRANSearch();
});