
import React from 'react';
import { format } from 'date-fns';
import UserAvatar from './ui/user-avatar';
import { Card, CardContent } from '@/components/ui/card';

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
        <UserAvatar user={user} size={32} />
        <span className="ml-2 text-sm font-medium">
          {user.name}
        </span>
      </div>

      {/* Card visível no hover */}
      <div
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out
                    absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64
                    pointer-events-none z-20"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <UserAvatar user={user} size={64} className="mb-2" />
              <h3 className="text-lg font-semibold">
                {user.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
              <p className="text-xs text-muted-foreground mb-2">
                Conta criada: {createdInfo}
              </p>
              {user.description && (
                <p className="text-sm text-center">
                  {user.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserHoverCard;
