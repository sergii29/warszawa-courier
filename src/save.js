import { db } from "./firebase.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
const USER_ID = tgUser?.id ? "telegram_" + tgUser.id : "test_user";

export function saveState(state) {
  return set(ref(db, "users/" + USER_ID), state);
}

export async function loadState(state) {
  const snapshot = await get(ref(db, "users/" + USER_ID));
  if (snapshot.exists()) {
    Object.assign(state, snapshot.val());
  }
}
