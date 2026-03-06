import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import InteractivePieChart from '../components/InteractivePieChart';

const CategoryView = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  
  // Sample detailed data for each category
  const categoryData = {
    equity: {
      title: 'Equity Holdings',
      data: [
        { name: 'NIFTYBEES', value: 17224.20, percentage: '21.31' },
        { name: 'ICICI AMC', value: 17482.80, percentage: '21.61' },
        { name: 'NUVAMA', value: 13301.00, percentage: '16.44' },
      ]
    },
    'non-equity': {
      title: 'Non-Equity Holdings',
      data: [
        { name: 'Gold ETF', value: 27203.40, percentage: '35.35' },
        { name: 'Bonds', value: 19847.00, percentage: '25.79' },
        { name: 'Cash', value: 10000.00, percentage: '12.99' },
      ]
    }
  };
  
  const category = categoryData[categoryName] || categoryData.equity;
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Dashboard</span>
      </button>
      
      <h1 className="text-4xl font-bold text-white mb-8">{category.title}</h1>
      
      <div className="card" style={{ minHeight: '600px' }}>
        <InteractivePieChart
          data={category.data}
          title={`${category.title} Distribution`}
        />
      </div>
      
      <div className="mt-8 card">
        <h3 className="text-2xl font-bold text-white mb-4">Detailed Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Name</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Amount</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {category.data.map((item, index) => (
                <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{item.name}</td>
                  <td className="py-3 px-4 text-right text-white">₹{item.value.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-400">{item.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CategoryView;


