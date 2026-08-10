# mi.net

Минималистичный интерактивный прототип социальной сети в чёрно-белой стилистике.

## Сегменты проекта

1. `index.html`
   - оболочка приложения
   - левая навигация
   - центральная область
   - правая колонка
   - мобильная навигация
   - модальное окно создания поста

2. `styles.css`
   - дизайн-токены
   - desktop layout
   - лента и публикации
   - Explore
   - Communities
   - Profile
   - Notifications
   - Messages
   - modal/toasts
   - tablet/mobile responsive

3. `app.js`
   - SVG-иконки
   - mock data
   - SPA-router
   - рендер всех экранов
   - публикация постов
   - лайки/reposts/bookmarks/share
   - follow/join
   - поиск
   - сообщения
   - modal/toast interactions

## Запуск

Самый простой вариант: открыть `index.html` в браузере.

Для корректной работы как локального сайта лучше запустить статический сервер:

```bash
python -m http.server 8080
```

После этого открыть:

`http://localhost:8080`

## Что уже работает

- переключение между разделами
- For you / Following
- создание новых постов
- счётчик символов
- лайки
- repost
- bookmarks
- copy-link share
- поиск
- Communities + Join
- Notifications
- Messages + отправка локальных сообщений
- Profile
- Follow
- responsive mobile navigation
- mobile post modal
- toast notifications

## Следующий этап для production

Для реального продукта потребуется backend:
- auth
- PostgreSQL / Supabase
- real users
- media uploads
- API
- realtime messages
- server-side notifications
- moderation
- rate limiting
- deployment
