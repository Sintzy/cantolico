import React, { useState } from 'react';
import Image from 'next/image';

interface UserAvatarProps {
  user: {
    name: string;
    image?: string | null;
  };
  size?: number;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 32, 
  className = "" 
}) => {
  const [imageError, setImageError] = useState(false);
  
  const hasValidImage = user.image && user.image.trim() !== '' && !imageError;

  const handleImageError = () => {
    setImageError(true);
  };

  if (hasValidImage) {
    return (
      <Image
        src={user.image!}
        alt={user.name}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        onError={handleImageError}
      />
    );
  }
  
  return (
    <div 
      className={`rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center ${className}`}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`
      }}
    >
      <span 
        className="text-white font-medium select-none"
        style={{ 
          fontSize: size <= 32 ? '12px' : size <= 48 ? '16px' : '20px' 
        }}
      >
        {user.name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
};

export default UserAvatar;
