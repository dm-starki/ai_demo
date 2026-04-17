import { api, type ConversationListItem } from './api';
import { store } from './store';

/** Сразу вставляет/обновляет беседу в кэше RTK (сайдбар), без ожидания refetch. */
export const upsertConversationInListCache = (item: ConversationListItem) => {
  store.dispatch(
    api.util.updateQueryData('conversations', undefined, (draft) => {
      const i = draft.findIndex((c) => c.id === item.id);
      if (i >= 0) draft.splice(i, 1);
      draft.unshift(item);
    }),
  );
};
