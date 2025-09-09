import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10', 
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} bg-black rounded-lg flex items-center justify-center p-1.5`}>
        <img 
          src="/lovable-uploads/d11f8b97-034a-47df-9a3c-e74d6d1d6fb3.png" 
          alt="Lumina" 
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <h1 className={`${textSizeClasses[size]} font-bold bg-gradient-primary bg-clip-text text-transparent`}>
          Lumina
        </h1>
      )}
    </div>
  );
};