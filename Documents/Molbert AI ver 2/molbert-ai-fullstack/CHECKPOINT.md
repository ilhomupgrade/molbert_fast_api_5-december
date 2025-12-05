## Состояние проекта (локально)

- Фронт переписан на Veo-стиль (Tailwind), Chakra удалён. Экран студии: чистый Canvas, загрузка работает, история, кисть (не обязательна), настройки AR/Format/Res в нижней панели.
- Настройки: профиль/пароль + блок Billing & Usage (план, кредиты, daily лимиты, rate limit). Шапка показывает план/кредиты, кнопка «Профиль» ведёт в `/settings`.
- Бэкенд: локально отключены лимиты/кредиты в `_ensure_credits_available` для ENV=local; для edit добавлен ре-хост изображений; публичный URL избегает двойного слэша.
- История генераций доступна в студии (читает `/api/v1/images/history`).

## Что осталось / план
1) Кисть: оставить как опцию, но по умолчанию hotspot центр — готово. При необходимости: отправлять маску или bounding box в API.
2) Настройки тарифов/оплата: сейчас только отображение. Нужно подключить реальное пополнение/платежи (S3/публичный API URL для прод).
3) Визуал: довести пиксель-перфект (отступы/типографика), мобильная адаптация кисти.
4) История: добавить превью и пагинацию/фильтры.
5) Edit: при прод включить кредиты/лимиты (убрать bypass для ENV=local).

## Как выложить на GitHub
В текущей сессии пушить на `https://github.com/ilhomupgrade/molbert_fast_api.git` не могу (нет токена/доступа). Чтобы залить:
```
cd /Users/ilhomsultanov/Documents/Molbert\ AI\ ver\ 2/molbert-ai-fullstack
git remote add origin git@github.com:ilhomupgrade/molbert_fast_api.git  # или https URL
git add .
git commit -m "feat: veo UI, history, billing usage, brush tweaks"
git push origin main  # или выбранная ветка
```
