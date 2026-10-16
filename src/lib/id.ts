// crypto.randomUUID needs a secure context, which a phone on the LAN dev server lacks.
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
