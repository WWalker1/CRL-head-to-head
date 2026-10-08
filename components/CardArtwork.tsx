'use client';

import { useState } from 'react';
import { cardDisplay } from '@/lib/card-display';

export default function CardArtwork({ cardKey, name, className = '', imageClassName = '', fallbackClassName = '' }: {
  cardKey: string;
  name?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const card = cardDisplay(cardKey, name);
  return <span className={`flex min-w-0 items-center justify-center overflow-hidden ${className}`} title={card.name} aria-label={card.name}>
    {card.image && !failed
      ? <img src={card.image} alt={card.name} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`h-full w-full object-contain ${imageClassName}`} />
      : <span className={`break-words px-1 text-center text-[10px] leading-tight ${fallbackClassName}`}>{card.name}</span>}
  </span>;
}
