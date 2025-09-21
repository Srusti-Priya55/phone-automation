// test/utils/tags.ts
export const TAGS = {
  SANITY: '[SANITY]',
  E2E:    '[E2E]',
  INSTALL:'[INSTALL]',
  ADB:    '[ADB]',
  PLAY:   '[PLAY]',
  NVM:    '[NVM]',
  NEG:    '[NEG]'
} as const;

export const tagLine = (...parts: string[]) => parts.join(' ');
