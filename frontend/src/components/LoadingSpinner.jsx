const LoadingSpinner = ({ size = 'large', text = 'Loading...' }) => {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-16 w-16',
    large: 'h-32 w-32'
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className={`animate-spin rounded-xl border-b-2 border-blue-500 ${sizeClasses[size]}`}></div>
      {text && (
        <p className="mt-4 text-gray-400 text-lg">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;


