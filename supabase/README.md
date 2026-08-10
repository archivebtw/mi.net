# mi.net Realtime Direct v1.1 SQL fix

Исправлена ошибка:

```text
ERROR: 42P01: relation "public.message_reactions" does not exist
```

Причина была в порядке SQL-команд: `ALTER TABLE public.message_reactions`
выполнялся до `CREATE TABLE public.message_reactions`.

## Что делать

1. Не нужно вручную удалять созданные таблицы.
2. Открой Supabase → SQL Editor.
3. Создай новый query.
4. Вставь весь файл:

`supabase/realtime_direct_v1_1_fix.sql`

5. Нажми Run.

Предыдущий запрос был обёрнут в `BEGIN ... COMMIT`. Если он остановился на
42P01, транзакция не должна была закоммитить изменения этого запуска.

## Что должно появиться в конце

Первая диагностическая выборка:

```text
conversation_members
message_reactions
messages
```

Вторая:

```text
conversations          public.conversations
conversation_members   public.conversation_members
messages               public.messages
message_reactions       public.message_reactions
```

После успешного выполнения SQL frontend-файлы повторно менять не нужно.
