// Обёртка для ленивой загрузки emoji-picker-react
// Выносит тяжёлый пикер в отдельный чанк бандла (~900 КБ данных).
// Загрузка чанка начинается при наведении на кнопку (preload),
// а не при клике — пользователь не ждёт после нажатия.

import { lazy, Suspense } from 'react'
import { Spin } from 'antd'
import type { EmojiClickData, Theme } from 'emoji-picker-react'

// React.lazy разбивает пикер в отдельный JS-чанк
const EmojiPickerComponent = lazy(() => import('emoji-picker-react'))

interface LazyEmojiPickerProps {
  onEmojiClick: (data: EmojiClickData) => void
  width?: number
  height?: number
  theme?: Theme
}

export const LazyEmojiPicker = (props: LazyEmojiPickerProps) => (
  <Suspense
    fallback={
      <div
        style={{
          width: props.width ?? 320,
          height: props.height ?? 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin tip="Загрузка эмодзи..." />
      </div>
    }
  >
    <EmojiPickerComponent
      onEmojiClick={props.onEmojiClick}
      width={props.width ?? 320}
      height={props.height ?? 400}
      // Загружает изображения эмодзи по мере прокрутки, а не все сразу
      lazyLoadEmojis
      // Убираем тоны кожи — меньше данных для рендера
      skinTonesDisabled
      // Поиск оставляем, он уже предварительно проиндексирован
      searchPlaceHolder="Поиск эмодзи..."
    />
  </Suspense>
)

// Функция для программного preload чанка (вызывается при hover на кнопке)
export const preloadEmojiPicker = () => {
  import('emoji-picker-react').catch(() => {/* ignore */})
}
