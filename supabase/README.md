# mi.net Auth v2 fix

Эта версия полностью убирает `is_username_available()` из критического пути
регистрации.

## Почему

Frontend-проверка доступности username — только удобство интерфейса.
Уникальность и допустимость username должны проверяться атомарно в PostgreSQL.

Теперь регистрацию защищают:

- `profiles_username_lower_unique`
- `profiles_username_allowed`
- `handle_new_user()` trigger

## Установка

1. Замени `index.html`.
2. Замени `js/auth.js`.
3. Запусти `supabase/auth_v2_db_fix.sql` в Supabase SQL Editor.
4. Сделай hard refresh сайта: `Ctrl + Shift + R`.

В `index.html` уже добавлен cache-busting:

```html
<script src="js/auth.js?v=20260810-2"></script>
```

Поэтому старый `auth.js` не должен оставаться в кэше.

## Проверка

Открой DevTools → Sources / Network и найди `auth.js?v=20260810-2`.

В первой строке файла должно быть:

```js
// mi.net auth build: 2026-08-10-v2-no-rpc-block
```
