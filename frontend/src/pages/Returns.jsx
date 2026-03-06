import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import TrendChart from '../components/TrendChart';
import StatsCard from '../components/StatsCard';
import { returnsAPI } from '../services/api';

const Returns = () => {
  const [returnsData, setReturnsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('6m'); // 3m, 6m, 1y
  const [chartType, setChartType] = useState('line'); // line or area
  
  useEffect(() => {
    fetchReturnsData();
  }, [timeframe]);
  
  const fetchReturnsData = async () => {
    try {
      // For demo purposes, using sample data
      // In production, uncomment the API call below
      // const months = timeframe === '3m' ? 3 : timeframe === '6m' ? 6 : 12;
      // const response = await returnsAPI.getMonthlyReturns(months);
      // setReturnsData(response.data);
      
      // Sample monthly returns data
      const sampleData = {
        monthlyReturns: [
          { month: 'Aug 2025', stocks: 2500, mutualFunds: 1200, commodities: 3500, bonds: 800, total: 8000 },
          { month: 'Sep 2025', stocks: 3200, mutualFunds: 1500, commodities: 4200, bonds: 1000, total: 9900 },
          { month: 'Oct 2025', stocks: 2800, mutualFunds: 1800, commodities: 3800, bonds: 900, total: 9300 },
          { month: 'Nov 2025', stocks: 3500, mutualFunds: 2000, commodities: 5000, bonds: 1200, total: 11700 },
          { month: 'Dec 2025', stocks: 4000, mutualFunds: 2200, commodities: 5500, bonds: 1300, total: 13000 },
          { month: 'Jan 2026', stocks: 4500, mutualFunds: 2500, commodities: 6200, bonds: 1500, total: 14700 },
        ],
        summary: {
          totalReturns: 53529.26,
          byCategory: {
            stocks: 19288.14,
            mutualFunds: 8.00,
            commodities: 40233.12,
            bonds: 0
          }
        }
      };
      
      setReturnsData(sampleData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching returns data:', error);
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-xl h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!returnsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white text-xl">No returns data available</p>
      </div>
    );
  }
  
  // Calculate growth metrics
  const firstMonth = returnsData.monthlyReturns[0];
  const lastMonth = returnsData.monthlyReturns[returnsData.monthlyReturns.length - 1];
  const growthPercentage = ((lastMonth.total - firstMonth.total) / firstMonth.total * 100).toFixed(2);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Returns Analysis</h1>
        <p className="text-gray-400">Track your portfolio returns and growth over time</p>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Returns"
          value={returnsData.summary.totalReturns}
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title="Stocks Returns"
          value={returnsData.summary.byCategory.stocks}
          icon={TrendingUp}
          color="blue"
        />
        <StatsCard
          title="Commodities Returns"
          value={returnsData.summary.byCategory.commodities}
          icon={TrendingUp}
          color="orange"
        />
        <StatsCard
          title="Growth"
          value={lastMonth.total}
          change={growthPercentage}
          changeType={growthPercentage >= 0 ? 'increase' : 'decrease'}
          icon={Calendar}
          color="purple"
        />
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setTimeframe('3m')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              timeframe === '3m'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            3 Months
          </button>
          <button
            onClick={() => setTimeframe('6m')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              timeframe === '6m'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            6 Months
          </button>
          <button
            onClick={() => setTimeframe('1y')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              timeframe === '1y'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            1 Year
          </button>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setChartType('line')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              chartType === 'line'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Line Chart
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
              chartType === 'area'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Area Chart
          </button>
        </div>
      </div>
      
      {/* Main Trend Chart */}
      <div className="card mb-8" style={{ minHeight: '500px' }}>
        <TrendChart
          data={returnsData.monthlyReturns}
          type={chartType}
          title="Monthly Returns Trend"
        />
      </div>
      
      {/* Category-wise breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4">Returns by Category</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-xl bg-blue-500"></div>
                <span className="text-gray-300 font-medium">Stocks</span>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-lg">
                  ₹{returnsData.summary.byCategory.stocks.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">
                  {((returnsData.summary.byCategory.stocks / returnsData.summary.totalReturns) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-xl bg-purple-500"></div>
                <span className="text-gray-300 font-medium">Mutual Funds</span>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-lg">
                  ₹{returnsData.summary.byCategory.mutualFunds.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">
                  {((returnsData.summary.byCategory.mutualFunds / returnsData.summary.totalReturns) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-xl bg-orange-500"></div>
                <span className="text-gray-300 font-medium">Commodities</span>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-lg">
                  ₹{returnsData.summary.byCategory.commodities.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">
                  {((returnsData.summary.byCategory.commodities / returnsData.summary.totalReturns) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-xl bg-green-500"></div>
                <span className="text-gray-300 font-medium">Bonds</span>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-lg">
                  ₹{returnsData.summary.byCategory.bonds.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">0%</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4">Performance Insights</h3>
          <div className="space-y-4">
            <div className="p-4 bg-green-900/20 border border-green-700 rounded-xl">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-green-400 font-semibold">Best Performing</span>
              </div>
              <p className="text-white text-lg font-bold">Commodities</p>
              <p className="text-gray-400 text-sm">Contributing 75.2% to total returns</p>
            </div>
            
            <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-xl">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <span className="text-blue-400 font-semibold">Steady Growth</span>
              </div>
              <p className="text-white text-lg font-bold">Stocks</p>
              <p className="text-gray-400 text-sm">Contributing 36.0% to total returns</p>
            </div>
            
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span className="text-gray-400 font-semibold">Average Monthly Growth</span>
              </div>
              <p className="text-white text-lg font-bold">{growthPercentage}%</p>
              <p className="text-gray-400 text-sm">Over the selected period</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Returns;


