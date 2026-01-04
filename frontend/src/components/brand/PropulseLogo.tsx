import { cn } from '@/lib/utils';
import propulseLogo from '@/assets/propulse-logo.png';

interface PropulseLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  unitLogo?: string;
}

const sizeMap = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-10',
  xl: 'h-12',
};

const unitLogoSizeMap = {
  sm: 'h-5',
  md: 'h-6',
  lg: 'h-8',
  xl: 'h-10',
};

export function PropulseLogo({ size = 'md', showText = true, className, unitLogo }: PropulseLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Logo da Propulse - sempre na frente */}
      <img 
        src={propulseLogo} 
        alt="Propulse" 
        className={cn(sizeMap[size], "w-auto object-contain")}
      />
      
      {/* Logo da unidade (se houver) */}
      {unitLogo && (
        <>
          <div className="w-px h-6 bg-border" />
          <img 
            src={unitLogo} 
            alt="Unidade" 
            className={cn(unitLogoSizeMap[size], "w-auto object-contain max-w-[80px]")}
          />
        </>
      )}
      
      {showText && !unitLogo && (
        <span className={cn(
          "font-bold tracking-tight text-foreground",
          size === 'sm' && 'text-base',
          size === 'md' && 'text-lg',
          size === 'lg' && 'text-xl',
          size === 'xl' && 'text-2xl',
        )}>
          PROPULSE
        </span>
      )}
    </div>
  );
}
