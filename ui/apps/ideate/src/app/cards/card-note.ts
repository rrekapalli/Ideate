import { IdeaObject } from '@ideate/api-client';

export const USER_NOTE_KEY = 'userNote';
export const INCLUDE_USER_NOTE_IN_AI_KEY = 'includeUserNoteInAi';

export function cardUserNote(object: IdeaObject | null | undefined): string {
  const raw = object?.details?.[USER_NOTE_KEY];
  if (raw == null) {
    return '';
  }
  const text = String(raw).trim();
  return text && text !== 'null' ? text : '';
}

export function includeCardNoteInAi(object: IdeaObject | null | undefined): boolean {
  const raw = object?.details?.[INCLUDE_USER_NOTE_IN_AI_KEY];
  return raw === true || String(raw).toLowerCase() === 'true';
}
