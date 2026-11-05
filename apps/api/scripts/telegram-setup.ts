/**
 * Helps connect the Telegram bot that sends new-order alerts.
 *
 *   npm run telegram:setup -w @reactive-store/api            list chats that messaged the bot
 *   npm run telegram:setup -w @reactive-store/api -- <id>    send a test alert to that chat
 *
 * Reads TELEGRAM_BOT_TOKEN from apps/api/.env.
 */
import 'dotenv/config';

const token = process.env['TELEGRAM_BOT_TOKEN'];
if (!token) {
  console.error('Set TELEGRAM_BOT_TOKEN in apps/api/.env first (create a bot with @BotFather).');
  process.exit(1);
}

type Chat = { id: number; type: string; title?: string; first_name?: string; last_name?: string; username?: string };
type Update = { message?: { chat: Chat }; my_chat_member?: { chat: Chat }; channel_post?: { chat: Chat } };

async function call<T>(method: string, body?: object): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`${method} failed: ${json.description ?? res.status}`);
  return json.result;
}

const me = await call<{ username: string }>('getMe');
const chatId = process.argv[2];

if (chatId) {
  await call('sendMessage', {
    chat_id: chatId,
    text: '✅ Reactive Store alerts are connected. New orders and enquiries will appear here.',
  });
  console.log(`Sent a test message to ${chatId}. Add it to TELEGRAM_CHAT_IDS in apps/api/.env.`);
} else {
  const updates = await call<Update[]>('getUpdates');
  const chats = new Map<number, Chat>();
  for (const u of updates) {
    const chat = u.message?.chat ?? u.my_chat_member?.chat ?? u.channel_post?.chat;
    if (chat) chats.set(chat.id, chat);
  }
  if (!chats.size) {
    console.log(`No chats yet. In Telegram, open @${me.username} and send it any message`);
    console.log('(or add it to a staff group and send a message there), then run this again.');
  } else {
    console.log(`Chats that have messaged @${me.username}:\n`);
    for (const c of chats.values()) {
      const name = c.title ?? [c.first_name, c.last_name].filter(Boolean).join(' ');
      console.log(`  ${String(c.id).padEnd(16)} ${c.type.padEnd(11)} ${name}${c.username ? ` (@${c.username})` : ''}`);
    }
    console.log('\nPut the ids you want in TELEGRAM_CHAT_IDS (comma-separated), then test one with:');
    console.log('  npm run telegram:setup -w @reactive-store/api -- <id>');
  }
}
