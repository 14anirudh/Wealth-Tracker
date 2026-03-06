import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts';
import { useState } from 'react';

const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6'];

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        fill={fill}
        opacity={0.8}
      />
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill="#fff"
        className="text-lg font-bold"
      >
        {payload.name}
      </text>
      <text
        x={cx}
        y={cy + 15}
        textAnchor="middle"
        fill="#fff"
        className="text-2xl font-bold"
      >
        ₹{value.toLocaleString()}
      </text>
      <text
        x={cx}
        y={cy + 35}
        textAnchor="middle"
        fill="#94a3b8"
        className="text-sm"
      >
        {payload.percentage}%
      </text>
    </g>
  );
};

const InteractivePieChart = ({ data, title, showPercentage = true }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };
  
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-xl">
          <p className="text-white font-semibold text-lg">{data.name}</p>
          <p className="text-blue-400 text-xl font-bold">₹{data.value.toLocaleString()}</p>
          {showPercentage && (
            <p className="text-gray-400 text-sm">{data.payload.percentage}%</p>
          )}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      {title && (
        <h3 className="text-xl font-bold text-white mb-4 text-center">{title}</h3>
      )}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            onMouseEnter={onPieEnter}
          >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  className="transition-all duration-300 hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry) => (
                <span className="text-gray-300">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default InteractivePieChart;


