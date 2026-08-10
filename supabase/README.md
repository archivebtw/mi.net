# mi.net username verification hotfix

Ошибка `Could not verify username` означает, что браузер не смог вызвать
Supabase RPC `public.is_username_available(candidate text)`.

## Что сделать

1. Открой Supabase Dashboard → SQL Editor.
2. Запусти `supabase/username_rpc_hotfix.sql`.
3. Подожди несколько секунд и обнови сайт.
4. Замени `js/auth.js` файлом из этого патча.

SQL заново создаёт функцию, выдаёт `anon`/`authenticated` право на её вызов
и выполняет:

```sql
notify pgrst, 'reload schema';
```

Frontend-патч также делает проверку доступности username только предварительной:
временная ошибка RPC больше не блокирует регистрацию. Финальная уникальность и
валидность username всё равно проверяются PostgreSQL.
