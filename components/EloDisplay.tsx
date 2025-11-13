interface EloDisplayProps {
  elo: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function EloDisplay({ elo, size = 'md' }: EloDisplayProps) {
  // Determine tier and styling based on ELO
  const getEloTier = (elo: number) => {
    if (elo < 1000) {
      return {
        className: 'text-gray-500 font-semibold elo-pulse',
        sizeClass: size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base',
      };
    } else if (elo < 1500) {
      return {
        className: 'text-cyan-500 font-bold elo-pulse',
        sizeClass: size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base',
      };
    } else if (elo < 1750) {
      return {
        className: 'text-purple-500 font-bold elo-pulse',
        sizeClass: size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base',
      };
    } else {
      // 1750+ - vibrant gradient with pulsating effect
      return {
        className: 'font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent elo-pulse',
        sizeClass: size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base',
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

