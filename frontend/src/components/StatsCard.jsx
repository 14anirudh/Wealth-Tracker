import { TrendingUp, TrendingDown } from 'lucide-react';

const StatsCard = ({ title, value, change, changeType, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-500',
    purple: 'from-purple-600 to-purple-500',
    green: 'from-green-600 to-green-500',
    orange: 'from-orange-600 to-orange-500',
    pink: 'from-pink-600 to-pink-500',
  };
  
  return (
    <div className="card card-hover animate-fadeIn">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-dark mb-2">
            ₹{value.toLocaleString()}
          </h3>
          {change !== undefined && (
            <div className="flex items-center space-x-1">
              {changeType === 'increase' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm font-semibold ${
                changeType === 'increase' ? 'text-green-500' : 'text-red-500'
              }`}>
                {change}%
              </span>
              <span className="text-gray-500 text-sm">vs last month</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;


