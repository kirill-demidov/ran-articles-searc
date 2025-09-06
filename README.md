# 🔍 RAN Articles Search

**Поисковая система для научных статей Российской академии наук**

[![Deploy](https://github.com/username/ran-articles-search/actions/workflows/deploy.yml/badge.svg)](https://github.com/username/ran-articles-search/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Возможности

- 🔍 **Полнотекстовый поиск** по названиям, авторам, аннотациям и ключевым словам
- 🏛️ **Фильтрация** по журналам, годам публикации и авторам  
- 📊 **Сортировка** результатов по релевантности, дате, названию
- 💡 **Автодополнение** поисковых запросов
- 📄 **Экспорт** результатов в CSV, BibTeX и JSON форматы
- 📱 **Адаптивный дизайн** для всех устройств
- ⚡ **Быстрый поиск** с использованием Lunr.js

## 🚀 Демо

[**Открыть поисковую систему →**](https://username.github.io/ran-articles-search/)

## 📊 Статистика

- **📚 Статей:** 15,000+
- **🏛️ Журналов:** 100+
- **📅 Обновление:** Ежедневно
- **🔍 Время поиска:** < 0.1 сек

## 🛠️ Технический стек

### Frontend
- **HTML5/CSS3** с современным адаптивным дизайном
- **Vanilla JavaScript** для максимальной производительности
- **Lunr.js** для клиентского полнотекстового поиска
- **GitHub Pages** для хостинга

### Backend/Data Pipeline
- **Python 3.11** для обработки данных
- **Google Cloud Storage** для хранения статей
- **GitHub Actions** для автоматизации CI/CD
- **JSON** для индексации и метаданных

## 📁 Структура проекта

```
ran-articles-search/
├── 🌐 index.html              # Главная страница
├── 🎨 assets/
│   ├── css/app.css           # Стили
│   └── js/search.js          # Логика поиска
├── 📊 data/
│   ├── articles.json         # База статей
│   ├── search-index.json     # Поисковый индекс
│   └── journals.json         # Список журналов
├── 🔧 scripts/
│   └── build_index.py        # Генератор индекса
├── ⚙️ .github/workflows/
│   └── deploy.yml            # CI/CD пайплайн
└── 📋 README.md
```

## 🔄 Автоматическое обновление

Система автоматически обновляется каждый день:

1. **02:00 UTC** - Скачиваются новые статьи с сайта РАН
2. **06:00 UTC** - Перестраивается поисковый индекс
3. **06:30 UTC** - Деплой обновленного сайта на GitHub Pages

## 🔍 Как пользоваться

### Основной поиск
```
машинное обучение
```

### Поиск по автору
```
Иванов А.А.
```

### Поиск по DOI
```
10.32607/actanaturae.27547
```

### Комбинированный поиск
```
"нейронные сети" автор:Петров
```

### Фильтры
- **Журнал:** Выберите конкретный журнал
- **Год:** Ограничьте поиск по году публикации
- **Автор:** Поиск по фамилии автора

## 📄 Экспорт результатов

Поддерживаемые форматы:

- **CSV** - для таблиц и анализа данных
- **BibTeX** - для библиографических менеджеров
- **JSON** - для программного использования

## 🧪 Локальная разработка

### Предварительные требования
- Python 3.11+
- Node.js 18+ (для загрузки зависимостей)
- Доступ к Google Cloud Storage

### Установка
```bash
# Клонируем репозиторий
git clone https://github.com/username/ran-articles-search.git
cd ran-articles-search

# Устанавливаем зависимости
pip install google-cloud-storage

# Загружаем Lunr.js
curl -L -o assets/js/lunr.min.js https://cdn.jsdelivr.net/npm/lunr@2.3.9/lunr.min.js
```

### Генерация данных
```bash
# Настройка аутентификации GCP
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"

# Генерация поискового индекса
python scripts/build_index.py
```

### Локальный сервер
```bash
# Простой HTTP сервер
python -m http.server 8000

# Или с Node.js
npx serve .
```

Откройте http://localhost:8000 в браузере.

## 📈 Производительность

- **Размер индекса:** ~5 МБ для 15,000 статей
- **Время загрузки:** < 2 секунды
- **Время поиска:** < 100 мс
- **Поддержка:** До 50,000 статей без потери производительности

## 🤝 Участие в разработке

Мы приветствуем вклад в развитие проекта!

### Как помочь:
1. 🐛 **Сообщить об ошибке** через Issues
2. 💡 **Предложить улучшение** через Issues
3. 🔧 **Исправить проблему** через Pull Request
4. 📖 **Улучшить документацию**

### Процесс разработки:
1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Создайте Pull Request

## 📊 Источники данных

Данные берутся с официального сайта журналов РАН:
- **Источник:** [journals.rcsi.science](https://journals.rcsi.science/)
- **Лицензия:** Открытый доступ
- **Обновление:** Ежедневно в автоматическом режиме

## 📄 Лицензия

Этот проект распространяется под лицензией MIT - подробности в файле [LICENSE](LICENSE).

## 🙏 Благодарности

- **РАН** за предоставление открытого доступа к научным публикациям
- **Lunr.js** за быстрый клиентский поиск
- **GitHub Pages** за бесплатный хостинг
- **Google Cloud Platform** за надежное хранение данных

## 📞 Контакты

- **Issues:** [GitHub Issues](https://github.com/username/ran-articles-search/issues)
- **Email:** your-email@example.com
- **Telegram:** @your-telegram

---

<div align="center">

**🔬 Наука должна быть доступной для всех!**

[Поиск статей](https://username.github.io/ran-articles-search/) • [Документация](https://github.com/username/ran-articles-search/wiki) • [API](https://github.com/username/ran-articles-search/blob/main/API.md)

</div>