# mi.net — Realtime Direct v1

Это первый настоящий серверный слой сообщений mi.net.

## Что теперь хранится в Supabase

Для Direct:

- `conversations`
- `conversation_members`
- `messages`
- `message_reactions`
- read state (`last_read_at`)
- private message media in Supabase Storage

## Что работает между двумя аккаунтами

- создание / получение одного Direct между двумя пользователями;
- список существующих Direct после входа;
- отправка текста;
- получение нового сообщения без перезагрузки;
- replies;
- edit;
- delete через RLS-safe soft delete;
- reactions;
- sent / read;
- unread counter;
- фото;
- видео;
- обычные файлы;
- link previews продолжают строиться frontend-ом из текста сообщения.

## Что пока остаётся локальным

- Groups;
- Publics;
- звонки;
- typing indicator;
- online Presence;
- закрепление диалога/сообщения как личная UI-настройка;
- пересылка media в server-backed Direct.

## Установка

### 1. Сначала должна работать текущая Supabase Auth/Profile система

В `public.profiles` должны существовать оба тестовых пользователя.

### 2. SQL

Открой:

Supabase Dashboard → SQL Editor

и запусти:

`supabase/realtime_direct_v1.sql`

SQL создаёт таблицы, RLS, RPC, Realtime publication и private Storage bucket `message-media`.

В конце запроса должны появиться:

```text
conversation_members
message_reactions
messages
```

Это означает, что нужные таблицы находятся в publication `supabase_realtime`.

### 3. Замени frontend-файлы

Распакуй ZIP поверх репозитория с заменой файлов.

### 4. Hard refresh

После GitHub Pages deployment:

`Ctrl + Shift + R`

Проверяй Network:

```text
realtime.js?v=20260810-5
navigation.js?v=20260810-5
chat.js?v=20260810-5
app.js?v=20260810-5
auth.js?v=20260810-5
```

## Проверка двумя аккаунтами

Удобнее всего:

1. Обычное окно браузера → Account A.
2. Incognito / другой браузер → Account B.
3. A → New message → найти username B.
4. Открыть Direct.
5. Отправить `hello`.
6. У B Direct должен появиться автоматически, а сообщение — без refresh.
7. Открыть чат у B.
8. У A две галочки должны переключиться в read после обновления `last_read_at`.
9. Проверить reaction, edit и delete.

## Архитектура

Direct имеет стабильный Supabase UUID.

Frontend всё ещё хранит небольшой локальный cache для быстрого UI, но Supabase является источником истины для server-backed Direct.

### Security

Все messaging-таблицы используют RLS.

Пользователь может читать сообщения только тех conversations, где находится в `conversation_members`.

Сообщение может создать только его собственный `auth.uid()`.

Редактировать/удалять сообщение может только sender.

Reaction принадлежит конкретному `auth.uid()`.

Media bucket private; чтение доступно только участникам conversation.

## Realtime delete

В этой версии message/reaction delete реализован как `UPDATE deleted_at`.

Это сделано намеренно: realtime UPDATE остаётся в обычной RLS-модели и корректно синхронизируется обоим участникам.

## Следующий этап

После проверки Direct можно переводить на ту же модель:

- Groups;
- Public discussions;
- notifications;
- typing;
- Presence / online;
- Push/Web Push.
