import { Star, MoreVertical, Globe, Mail } from 'lucide-react';
import { useState } from 'react';

export default function AccountCard({ account, onView, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  const getCategoryColor = (category) => {
    const colors = {
      email: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      social: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      work: 'bg-green-500/10 text-green-400 border-green-500/20',
      shopping: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      entertainment: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      cloud: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      general: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    };
    return colors[category] || colors.general;
  };

  return (
    <div 
      className="card-dark p-4 cursor-pointer group relative"
      onClick={() => onView(account)}
    >
      {/* Favorite Star */}
      {account.is_favorite === 1 && (
        <div className="absolute top-3 right-3">
          <Star className="w-4 h-4 text-accent-yellow fill-accent-yellow" />
        </div>
      )}

      {/* Site Icon & Name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
          <Globe className="w-5 h-5 text-primary-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-dark-text truncate">
            {account.site_name}
          </h3>
          {account.site_url && (
            <p className="text-xs text-dark-textMuted truncate">
              {account.site_url}
            </p>
          )}
        </div>
      </div>

      {/* Account Info */}
      <div className="space-y-1.5 mb-3">
        {account.email && (
          <div className="flex items-center gap-2 text-sm text-dark-textSecondary">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{account.email}</span>
          </div>
        )}
        {account.username && !account.email && (
          <div className="flex items-center gap-2 text-sm text-dark-textSecondary">
            <span className="truncate">@{account.username}</span>
          </div>
        )}
      </div>

      {/* Category Badge */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(account.category)}`}>
          {account.category}
        </span>

        {/* Action Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 rounded-lg hover:bg-dark-surfaceHover text-dark-textMuted hover:text-dark-text transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-dark-surface border border-dark-border rounded-lg shadow-dark-lg z-20 py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(account);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-dark-text hover:bg-dark-surfaceHover transition-colors"
                >
                  Lihat Detail
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(account);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-dark-text hover:bg-dark-surfaceHover transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(account);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-accent-red hover:bg-dark-surfaceHover transition-colors"
                >
                  Hapus
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}