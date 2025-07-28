
import React from 'react';
import { format } from 'date-fns';

interface User {
  name: string;
  email: string;
  createdAt: string;
  description?: string;
  image: string;
}

interface UserHoverCardProps {
  user: User;
}

const UserHoverCard: React.FC<UserHoverCardProps> = ({ user }) => {

  const createdDate = new Date(user.createdAt);
  const createdInfo = !isNaN(createdDate.getTime())
    ? format(createdDate, 'PPP')
    : 'Data inválida';

  return (
    <div className="group inline-block relative">
      {/* Avatar e nome principais */}
      <div className="flex items-center cursor-pointer">
        <img
          src={user.image}
          alt={user.name}
          className="w-8 h-8 rounded-full"
        />
        <span className="ml-2 text-sm font-medium text-gray-800">
          {user.name}
        </span>
      </div>

      {/* Card visível no hover */}
      <div
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out
                    absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 p-4
                    bg-white rounded-2xl shadow-lg pointer-events-none z-20"
      >
        <div className="flex flex-col items-center">
          <img
            src={user.image}
            alt={user.name}
            className="w-16 h-16 rounded-full mb-2"
          />
          <h3 className="text-lg font-semibold text-gray-900">
            {user.name}
          </h3>
          <p className="text-sm text-gray-500 mb-1">{user.email}</p>
          <p className="text-xs text-gray-400 mb-2">
            Conta criada: {createdInfo}
          </p>
          {user.description && (
            <p className="text-sm text-gray-700 text-center">
              {user.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserHoverCard;
