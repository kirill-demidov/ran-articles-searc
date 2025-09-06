/**
 * RAN Articles Search - Поисковая система для статей РАН
 */
class RANArticleSearch {
    constructor() {
        this.articles = [];
        this.searchIndex = null;
        this.filteredResults = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentQuery = '';
        this.currentFilters = {};
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Инициализация поисковой системы...');
            
            // Загружаем данные параллельно
            const [articlesData, searchIndexData] = await Promise.all([
                this.loadArticles(),
                this.loadSearchIndex()
            ]);
            
            this.articles = articlesData.articles || [];
            this.searchIndex = lunr.Index.load(searchIndexData);
            
            console.log(`📚 Загружено ${this.articles.length} статей`);
            
            // Обновляем статистику
            this.updateStats(articlesData.stats);
            
            // Настраиваем UI
            this.setupUI();
            this.setupEventListeners();
            this.populateFilters();
            
            // Скрываем загрузку
            document.getElementById('loading').classList.add('hidden');
            
            console.log('✅ Инициализация завершена');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showError('Ошибка загрузки данных. Попробуйте перезагрузить страницу.');
        }
    }
    
    async loadArticles() {
        try {
            console.log('📥 Загружаем articles.json...');
            const response = await fetch(`data/articles.json?v=${Date.now()}`);
            console.log('📡 Ответ сервера:', response.status, response.statusText);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Загружено статей:', data.articles?.length || 0);
                return data;
            } else {
                console.warn('❌ Файл articles.json не найден, используем тестовые данные');
                return this.generateTestData();
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки articles.json:', error);
            return this.generateTestData();
        }
    }
    
    async loadSearchIndex() {
        try {
            console.log('📥 Загружаем search-index.json...');
            const response = await fetch(`data/search-index.json?v=${Date.now()}`);
            console.log('📡 Ответ сервера для индекса:', response.status, response.statusText);
            
            if (response.ok) {
                const indexData = await response.json();
                console.log('📊 Загружен индекс версии:', indexData.version);
                
                // Проверяем, что это правильный формат Lunr индекса
                if (indexData && indexData.version && indexData.fields) {
                    return indexData; // Возвращаем готовый индекс для lunr.Index.load()
                } else {
                    console.warn('❌ Некорректный формат search-index.json, используем тестовый индекс');
                    return this.buildTestSearchIndex();
                }
            } else {
                console.warn('❌ Файл search-index.json не найден, используем тестовый индекс');
                return this.buildTestSearchIndex();
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки search-index.json:', error);
            return this.buildTestSearchIndex();
        }
    }
    
    generateTestData() {
        // Тестовые данные для демонстрации
        const testArticles = [];
        const journals = [
            { id: '2075-8251', title: 'Acta Naturae' },
            { id: '1234-5678', title: 'Российский журнал биомеханики' },
            { id: '9876-5432', title: 'Журнал вычислительной математики' }
        ];
        
        const authors = [
            'А. А. Иванов', 'В. С. Петров', 'Е. И. Сидорова', 
            'М. П. Козлов', 'Н. В. Смирнов', 'О. А. Федоров'
        ];
        
        const keywords = [
            'машинное обучение', 'нейронные сети', 'биоинформатика',
            'квантовая физика', 'молекулярная биология', 'математическое моделирование'
        ];
        
        for (let i = 1; i <= 100; i++) {
            const journal = journals[Math.floor(Math.random() * journals.length)];
            const articleAuthors = authors.slice(0, Math.floor(Math.random() * 3) + 1);
            const articleKeywords = keywords.slice(0, Math.floor(Math.random() * 4) + 1);
            
            testArticles.push({
                id: `${journal.id}_${2024}_${i}`,
                journal: journal,
                issue: {
                    id: `issue_${i}`,
                    title: `Том ${Math.floor(i/10) + 1}, №${i % 4 + 1}`,
                    year: 2024 - Math.floor(Math.random() * 5)
                },
                article: {
                    id: `article_${i}`,
                    title: `Исследование ${i}: Инновационные подходы в области науки и технологий`,
                    authors: articleAuthors,
                    abstract: `Аннотация статьи ${i}. В данной работе представлены результаты исследования современных методов и подходов. Рассматриваются теоретические основы и практические применения разработанных методов. Полученные результаты показывают высокую эффективность предложенного подхода.`,
                    keywords: articleKeywords,
                    doi: `10.12345/test.${i}`,
                    pages: `${i}-${i + 10}`
                },
                files: {
                    pdf_ru: `gs://test-bucket/article_${i}_ru.pdf`,
                    pdf_en: `gs://test-bucket/article_${i}_en.pdf`,
                    xml: `gs://test-bucket/article_${i}.xml`
                },
                download_urls: {
                    pdf_ru: `#download_${i}_ru`,
                    pdf_en: `#download_${i}_en`
                },
                indexed_date: new Date().toISOString()
            });
        }
        
        return {
            articles: testArticles,
            stats: {
                total_articles: testArticles.length,
                total_journals: journals.length,
                last_updated: new Date().toISOString()
            }
        };
    }
    
    buildTestSearchIndex() {
        const documents = this.articles.map((article, index) => ({
            id: index.toString(),
            title: article.article.title,
            authors: article.article.authors.join(' '),
            abstract: article.article.abstract,
            keywords: article.article.keywords.join(' '),
            journal: article.journal.title,
            doi: article.article.doi
        }));
        
        const idx = lunr(function() {
            this.ref('id');
            this.field('title', { boost: 10 });
            this.field('authors', { boost: 5 });
            this.field('keywords', { boost: 8 });
            this.field('abstract', { boost: 2 });
            this.field('journal', { boost: 3 });
            this.field('doi', { boost: 15 });
            
            documents.forEach((doc) => {
                this.add(doc);
            });
        });
        
        return idx.serialize();
    }
    
    buildSearchIndexFromDocuments(documents) {
        const idx = lunr(function() {
            this.ref('id');
            this.field('title', { boost: 10 });
            this.field('authors', { boost: 5 });
            this.field('keywords', { boost: 8 });
            this.field('abstract', { boost: 2 });
            this.field('journal', { boost: 3 });
            this.field('doi', { boost: 15 });
            
            documents.forEach((doc) => {
                this.add(doc);
            });
        });
        
        return idx.serialize();
    }
    
    updateStats(stats) {
        const totalCountEl = document.getElementById('total-count');
        const journalCountEl = document.getElementById('journal-count');
        
        if (totalCountEl) totalCountEl.textContent = stats.total_articles.toLocaleString();
        if (journalCountEl) journalCountEl.textContent = stats.total_journals;
    }
    
    setupUI() {
        // Настраиваем интерфейс
        this.resultsContainer = document.getElementById('results');
        this.searchInput = document.getElementById('search-query');
        this.resultsCountEl = document.getElementById('results-count');
        this.searchTimeEl = document.getElementById('search-time');
    }
    
    setupEventListeners() {
        // Поиск
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-query');
        
        searchBtn?.addEventListener('click', () => this.performSearch());
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
        
        // Автодополнение
        searchInput?.addEventListener('input', (e) => {
            this.handleAutocomplete(e.target.value);
        });
        
        // Фильтры
        document.getElementById('journal-filter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('year-filter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('author-filter')?.addEventListener('input', () => this.applyFilters());
        
        // Очистка фильтров
        document.getElementById('clear-filters')?.addEventListener('click', () => this.clearFilters());
        
        // Сортировка
        document.getElementById('sort-select')?.addEventListener('change', (e) => {
            this.sortResults(e.target.value);
        });
        
        // Экспорт
        document.getElementById('export-btn')?.addEventListener('click', () => this.showExportModal());
        
        // Модальные окна
        this.setupModalListeners();
    }
    
    setupModalListeners() {
        // Экспорт модал
        const exportModal = document.getElementById('export-modal');
        const modalClose = exportModal?.querySelector('.modal-close');
        
        modalClose?.addEventListener('click', () => this.hideModal('export-modal'));
        
        // Закрытие по клику вне модала
        exportModal?.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                this.hideModal('export-modal');
            }
        });
        
        // Экспорт кнопки
        document.getElementById('export-csv')?.addEventListener('click', () => this.exportResults('csv'));
        document.getElementById('export-bibtex')?.addEventListener('click', () => this.exportResults('bibtex'));
        document.getElementById('export-json')?.addEventListener('click', () => this.exportResults('json'));
    }
    
    populateFilters() {
        // Заполняем фильтр журналов
        const journalFilter = document.getElementById('journal-filter');
        const yearFilter = document.getElementById('year-filter');
        
        if (journalFilter) {
            const journals = [...new Set(this.articles.map(a => a.journal.title))].sort();
            journalFilter.innerHTML = '<option value="">Все журналы</option>' +
                journals.map(journal => `<option value="${journal}">${journal}</option>`).join('');
        }
        
        if (yearFilter) {
            const years = [...new Set(this.articles.map(a => a.issue.year))].sort((a, b) => b - a);
            yearFilter.innerHTML = '<option value="">Все годы</option>' +
                years.map(year => `<option value="${year}">${year}</option>`).join('');
        }
    }
    
    performSearch() {
        const query = this.searchInput?.value.trim() || '';
        const startTime = performance.now();
        
        console.log(`🔍 Поиск: "${query}"`);
        
        this.currentQuery = query;
        this.currentPage = 1;
        
        if (!query) {
            this.showWelcomeMessage();
            return;
        }
        
        try {
            // Поиск через Lunr.js
            const searchResults = this.searchIndex.search(query);
            
            // Преобразуем результаты в статьи
            this.filteredResults = searchResults.map(result => {
                const articleIndex = parseInt(result.ref);
                const article = this.articles[articleIndex];
                return {
                    ...article,
                    score: result.score
                };
            });
            
            // Применяем фильтры
            this.applyCurrentFilters();
            
            const endTime = performance.now();
            const searchTime = ((endTime - startTime) / 1000).toFixed(3);
            
            this.updateSearchTime(searchTime);
            this.renderResults();
            
        } catch (error) {
            console.error('Ошибка поиска:', error);
            this.showError('Ошибка поиска. Попробуйте изменить запрос.');
        }
    }
    
    applyFilters() {
        this.currentFilters = {
            journal: document.getElementById('journal-filter')?.value || '',
            year: document.getElementById('year-filter')?.value || '',
            author: document.getElementById('author-filter')?.value.trim() || ''
        };
        
        this.currentPage = 1;
        this.applyCurrentFilters();
        this.renderResults();
    }
    
    applyCurrentFilters() {
        let results = [...this.filteredResults];
        
        // Фильтр по журналу
        if (this.currentFilters.journal) {
            results = results.filter(article => 
                article.journal.title === this.currentFilters.journal
            );
        }
        
        // Фильтр по году
        if (this.currentFilters.year) {
            results = results.filter(article => 
                article.issue.year.toString() === this.currentFilters.year
            );
        }
        
        // Фильтр по автору
        if (this.currentFilters.author) {
            results = results.filter(article =>
                article.article.authors.some(author =>
                    author.toLowerCase().includes(this.currentFilters.author.toLowerCase())
                )
            );
        }
        
        this.filteredResults = results;
    }
    
    clearFilters() {
        document.getElementById('journal-filter').value = '';
        document.getElementById('year-filter').value = '';
        document.getElementById('author-filter').value = '';
        
        this.currentFilters = {};
        this.applyFilters();
    }
    
    sortResults(sortBy) {
        switch (sortBy) {
            case 'relevance':
                this.filteredResults.sort((a, b) => (b.score || 0) - (a.score || 0));
                break;
            case 'date':
                this.filteredResults.sort((a, b) => b.issue.year - a.issue.year);
                break;
            case 'title':
                this.filteredResults.sort((a, b) => 
                    a.article.title.localeCompare(b.article.title, 'ru')
                );
                break;
            case 'journal':
                this.filteredResults.sort((a, b) => 
                    a.journal.title.localeCompare(b.journal.title, 'ru')
                );
                break;
        }
        
        this.renderResults();
    }
    
    renderResults() {
        const totalResults = this.filteredResults.length;
        
        // Обновляем счетчик
        if (this.resultsCountEl) {
            this.resultsCountEl.textContent = totalResults.toLocaleString();
        }
        
        if (totalResults === 0) {
            this.showNoResults();
            return;
        }
        
        // Пагинация
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageResults = this.filteredResults.slice(startIndex, endIndex);
        
        // Рендерим результаты
        this.resultsContainer.innerHTML = pageResults.map(article => 
            this.renderArticleCard(article)
        ).join('');
        
        // Обновляем пагинацию
        this.updatePagination(totalResults);
    }
    
    renderArticleCard(article) {
        const keywordTags = article.article.keywords.map(keyword => 
            `<span class="keyword-tag">${keyword}</span>`
        ).join('');
        
        const downloadButtons = [];
        if (article.download_urls.pdf_ru) {
            downloadButtons.push(`<a href="${article.download_urls.pdf_ru}" class="download-btn">📄 PDF (RU)</a>`);
        }
        if (article.download_urls.pdf_en) {
            downloadButtons.push(`<a href="${article.download_urls.pdf_en}" class="download-btn secondary">📄 PDF (EN)</a>`);
        }
        
        return `
            <article class="article-card">
                <h3 class="article-title">
                    <a href="#article-${article.id}">${article.article.title}</a>
                </h3>
                <p class="article-authors">${article.article.authors.join(', ')}</p>
                <p class="article-journal">
                    ${article.journal.title} — ${article.issue.title} (${article.issue.year})
                </p>
                <p class="article-abstract">${article.article.abstract}</p>
                <div class="article-keywords">${keywordTags}</div>
                <div class="article-footer">
                    <div class="download-links">
                        ${downloadButtons.join('')}
                    </div>
                    <div class="article-doi">
                        DOI: <a href="https://doi.org/${article.article.doi}" target="_blank">${article.article.doi}</a>
                    </div>
                </div>
            </article>
        `;
    }
    
    updatePagination(totalResults) {
        const paginationEl = document.getElementById('pagination');
        if (!paginationEl) return;
        
        const totalPages = Math.ceil(totalResults / this.itemsPerPage);
        
        if (totalPages <= 1) {
            paginationEl.classList.add('hidden');
            return;
        }
        
        paginationEl.classList.remove('hidden');
        
        let paginationHTML = '';
        
        // Предыдущая страница
        if (this.currentPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="search.goToPage(${this.currentPage - 1})">‹ Назад</button>`;
        }
        
        // Номера страниц
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="search.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span>...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            paginationHTML += `<button class="pagination-btn ${activeClass}" onclick="search.goToPage(${i})">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span>...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="search.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Следующая страница
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="pagination-btn" onclick="search.goToPage(${this.currentPage + 1})">Вперед ›</button>`;
        }
        
        paginationEl.innerHTML = paginationHTML;
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.renderResults();
        
        // Скроллим к началу результатов
        document.querySelector('.results-section')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
    
    showWelcomeMessage() {
        this.resultsContainer.innerHTML = `
            <div id="welcome-message" class="welcome-message">
                <h2>🎯 Добро пожаловать в библиотеку РАН!</h2>
                <p>Введите поисковый запрос выше, чтобы найти научные статьи:</p>
                <ul class="search-tips">
                    <li><strong>Поиск по названию:</strong> "машинное обучение"</li>
                    <li><strong>Поиск по автору:</strong> "Иванов"</li>
                    <li><strong>Поиск по DOI:</strong> "10.32607/actanaturae"</li>
                    <li><strong>Поиск по ключевым словам:</strong> "нейронные сети"</li>
                </ul>
            </div>
        `;
        
        if (this.resultsCountEl) {
            this.resultsCountEl.textContent = '0';
        }
        
        document.getElementById('pagination')?.classList.add('hidden');
    }
    
    showNoResults() {
        this.resultsContainer.innerHTML = `
            <div class="welcome-message">
                <h2>🔍 Ничего не найдено</h2>
                <p>По вашему запросу "${this.currentQuery}" ничего не найдено.</p>
                <p>Попробуйте:</p>
                <ul class="search-tips">
                    <li>Проверить правописание</li>
                    <li>Использовать более общие термины</li>
                    <li>Удалить фильтры</li>
                    <li>Попробовать синонимы</li>
                </ul>
            </div>
        `;
        
        document.getElementById('pagination')?.classList.add('hidden');
    }
    
    updateSearchTime(time) {
        if (this.searchTimeEl) {
            this.searchTimeEl.textContent = `(${time} сек)`;
        }
    }
    
    handleAutocomplete(query) {
        // Простая реализация автодополнения
        const autocompleteEl = document.getElementById('autocomplete');
        if (!autocompleteEl || query.length < 2) {
            autocompleteEl?.classList.add('hidden');
            return;
        }
        
        // Ищем совпадения в названиях и ключевых словах
        const suggestions = new Set();
        
        this.articles.forEach(article => {
            // Проверяем ключевые слова
            article.article.keywords.forEach(keyword => {
                if (keyword.toLowerCase().includes(query.toLowerCase())) {
                    suggestions.add(keyword);
                }
            });
            
            // Проверяем авторов
            article.article.authors.forEach(author => {
                if (author.toLowerCase().includes(query.toLowerCase())) {
                    suggestions.add(author);
                }
            });
        });
        
        const suggestionArray = Array.from(suggestions).slice(0, 5);
        
        if (suggestionArray.length > 0) {
            autocompleteEl.innerHTML = suggestionArray.map(suggestion => 
                `<div class="autocomplete-item" onclick="search.selectSuggestion('${suggestion}')">${suggestion}</div>`
            ).join('');
            autocompleteEl.classList.remove('hidden');
        } else {
            autocompleteEl.classList.add('hidden');
        }
    }
    
    selectSuggestion(suggestion) {
        if (this.searchInput) {
            this.searchInput.value = suggestion;
        }
        document.getElementById('autocomplete')?.classList.add('hidden');
        this.performSearch();
    }
    
    showExportModal() {
        document.getElementById('export-modal')?.classList.remove('hidden');
    }
    
    hideModal(modalId) {
        document.getElementById(modalId)?.classList.add('hidden');
    }
    
    exportResults(format) {
        const data = this.filteredResults.slice(0, 1000); // Ограничиваем экспорт
        
        let content, filename, mimeType;
        
        switch (format) {
            case 'csv':
                content = this.exportToCSV(data);
                filename = 'ran_articles.csv';
                mimeType = 'text/csv';
                break;
            case 'bibtex':
                content = this.exportToBibTeX(data);
                filename = 'ran_articles.bib';
                mimeType = 'text/plain';
                break;
            case 'json':
                content = JSON.stringify(data, null, 2);
                filename = 'ran_articles.json';
                mimeType = 'application/json';
                break;
        }
        
        this.downloadFile(content, filename, mimeType);
        this.hideModal('export-modal');
    }
    
    exportToCSV(data) {
        const headers = ['Title', 'Authors', 'Journal', 'Year', 'DOI', 'Keywords', 'Abstract'];
        const rows = data.map(article => [
            `"${article.article.title.replace(/"/g, '""')}"`,
            `"${article.article.authors.join('; ')}"`,
            `"${article.journal.title}"`,
            article.issue.year,
            `"${article.article.doi}"`,
            `"${article.article.keywords.join('; ')}"`,
            `"${article.article.abstract.replace(/"/g, '""')}"`
        ]);
        
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    
    exportToBibTeX(data) {
        return data.map((article, index) => `
@article{article${index + 1},
    title={${article.article.title}},
    author={${article.article.authors.join(' and ')}},
    journal={${article.journal.title}},
    year={${article.issue.year}},
    doi={${article.article.doi}},
    keywords={${article.article.keywords.join(', ')}},
    abstract={${article.article.abstract}}
}
        `.trim()).join('\n\n');
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    showError(message) {
        this.resultsContainer.innerHTML = `
            <div class="welcome-message">
                <h2>❌ Ошибка</h2>
                <p>${message}</p>
            </div>
        `;
        
        document.getElementById('loading')?.classList.add('hidden');
    }
}

// Глобальная переменная для доступа к поиску
let search;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    search = new RANArticleSearch();
});