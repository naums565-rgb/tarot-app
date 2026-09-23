"""
Бот для Таро Mini App.

Что делает этот файл:
1. Отвечает на /start кнопкой, которая открывает мини-приложение (index.html).
2. Принимает данные из мини-аппа, когда пользователь нажимает "Оплатить"
   (это приходит как web_app_data).
3. Выставляет счёт в Telegram Stars (send_invoice с валютой "XTR").
4. Подтверждает платёж (pre_checkout) и обрабатывает успешную оплату,
   отмечая пользователя как премиум в простом JSON-файле.
5. Команда /mystatus — проверить, активна ли подписка.

Это МИНИМАЛЬНЫЙ рабочий вариант для обучения и первого запуска.
Для продакшена рекомендуется:
- заменить JSON-файл на нормальную базу данных (SQLite/PostgreSQL);
- добавить логирование и обработку ошибок;
- вынести токен и URL в переменные окружения (что уже сделано ниже).

Установка зависимостей:
    pip install aiogram==3.*

Запуск:
    export BOT_TOKEN="ваш_токен_от_BotFather"
    export WEBAPP_URL="https://ваш-домен.example/index.html"
    python bot.py
"""

import asyncio
import json
import os
from datetime import datetime, timedelta

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    Message,
    LabeledPrice,
    WebAppInfo,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    PreCheckoutQuery,
)

# ---------------------------------------------------------------------------
# Настройки
# ---------------------------------------------------------------------------

BOT_TOKEN = os.environ.get("BOT_TOKEN", "ВСТАВЬТЕ_СЮДА_ТОКЕН_ОТ_BOTFATHER")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://example.com/index.html")
PREMIUM_DB_FILE = "premium_users.json"

PLAN_DAYS = {
    "month": 30,
    "year": 365,
}

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


# ---------------------------------------------------------------------------
# Простое хранилище премиум-пользователей (JSON-файл вместо БД для старта)
# ---------------------------------------------------------------------------

def load_db() -> dict:
    if not os.path.exists(PREMIUM_DB_FILE):
        return {}
    with open(PREMIUM_DB_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_db(data: dict) -> None:
    with open(PREMIUM_DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def grant_premium(user_id: int, days: int) -> str:
    db = load_db()
    now = datetime.utcnow()
    current_until = db.get(str(user_id))
    start_from = now
    if current_until:
        try:
            existing = datetime.fromisoformat(current_until)
            if existing > now:
                start_from = existing  # продлеваем поверх текущей подписки
        except ValueError:
            pass
    new_until = start_from + timedelta(days=days)
    db[str(user_id)] = new_until.isoformat()
    save_db(db)
    return new_until.isoformat()


def is_premium(user_id: int) -> tuple[bool, str | None]:
    db = load_db()
    until = db.get(str(user_id))
    if not until:
        return False, None
    active = datetime.fromisoformat(until) > datetime.utcnow()
    return active, until


# ---------------------------------------------------------------------------
# Команды
# ---------------------------------------------------------------------------

@dp.message(CommandStart())
async def cmd_start(message: Message):
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[[
            InlineKeyboardButton(
                text="🔮 Открыть расклад",
                web_app=WebAppInfo(url=WEBAPP_URL),
            )
        ]]
    )
    await message.answer(
        "Добро пожаловать. Карты уже перемешаны — "
        "нажмите кнопку ниже, чтобы вытянуть первую.",
        reply_markup=keyboard,
    )


@dp.message(Command("mystatus"))
async def cmd_status(message: Message):
    active, until = is_premium(message.from_user.id)
    if active:
        until_str = datetime.fromisoformat(until).strftime("%d.%m.%Y")
        await message.answer(f"Премиум активен до {until_str}.")
    else:
        await message.answer("Премиум пока не подключён. Откройте приложение, чтобы оформить подписку.")


# ---------------------------------------------------------------------------
# Приём данных из Mini App -> выставление счёта в Telegram Stars
# ---------------------------------------------------------------------------

@dp.message(F.web_app_data)
async def handle_webapp_data(message: Message):
    try:
        payload = json.loads(message.web_app_data.data)
    except (ValueError, AttributeError):
        return

    if payload.get("action") != "buy_premium":
        return

    plan = payload.get("plan", "month")
    stars = int(payload.get("stars", 150))
    days = PLAN_DAYS.get(plan, 30)

    title = "Премиум-подписка Таро"
    description = f"Безлимитные расклады на {days} дней"

    # Для оплаты через Telegram Stars:
    # - currency должна быть "XTR"
    # - provider_token не нужен (оставляем пустую строку)
    # - amount в LabeledPrice указывается в звёздах напрямую (без умножения на 100)
    await bot.send_invoice(
        chat_id=message.chat.id,
        title=title,
        description=description,
        payload=f"premium:{plan}:{message.from_user.id}",
        provider_token="",
        currency="XTR",
        prices=[LabeledPrice(label=title, amount=stars)],
    )


@dp.pre_checkout_query()
async def process_pre_checkout(pre_checkout_query: PreCheckoutQuery):
    # Здесь можно добавить дополнительные проверки перед подтверждением оплаты
    await bot.answer_pre_checkout_query(pre_checkout_query.id, ok=True)


@dp.message(F.successful_payment)
async def process_successful_payment(message: Message):
    payload_parts = message.successful_payment.invoice_payload.split(":")
    plan = payload_parts[1] if len(payload_parts) > 1 else "month"
    days = PLAN_DAYS.get(plan, 30)

    new_until = grant_premium(message.from_user.id, days)
    until_str = datetime.fromisoformat(new_until).strftime("%d.%m.%Y")

    await message.answer(
        f"Оплата прошла успешно. Премиум активен до {until_str}.\n"
        f"Откройте приложение заново — расширенные расклады уже доступны."
    )


# ---------------------------------------------------------------------------
# Запуск
# ---------------------------------------------------------------------------

async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
