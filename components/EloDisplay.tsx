interface EloDisplayProps {
  elo: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function EloDisplay({ elo, size = 'md' }: EloDisplayProps) {
  // Determine tier and styling based on ELO
  const getEloTier = (elo: number) => {
    if (elo < 1000) {
      return {
        className: 'text-gray-600 font-bold',
        sizeClass: size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl',
      };
    } else if (elo < 1500) {
      return {
        className: 'text-blue-600 font-bold drop-shadow-sm',
        sizeClass: size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl',
      };
    } else if (elo < 1750) {
      return {
        className: 'text-purple-600 font-extrabold drop-shadow-md',
        sizeClass: size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-xl' : 'text-3xl',
      };
    } else {
      // 1750+ - gradient and very bold with shadow for extra impact
      return {
        className: 'font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent drop-shadow-lg',
        sizeClass: size === 'lg' ? 'text-5xl' : size === 'sm' ? 'text-2xl' : 'text-4xl',
      };
    }
  };

  const tier = getEloTier(elo);

  return (
    <span className={`${tier.className} ${tier.sizeClass} inline-block`}>
      {elo}
    </span>
  );
}

