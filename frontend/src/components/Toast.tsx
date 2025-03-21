import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, XIcon } from 'lucide-react';
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}
const Toast = ({
  message,
  type,
  onClose
}: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className={`rounded-lg shadow-lg p-4 flex items-center space-x-3 ${type === 'success' ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}>
        {type === 'success' ? <CheckCircleIcon size={20} className="text-green-500 dark:text-green-300 flex-shrink-0" /> : <XCircleIcon size={20} className="text-red-500 dark:text-red-300 flex-shrink-0" />}
        <p className={`text-sm font-medium ${type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
          {message}
        </p>
        <button onClick={onClose} className={`p-1 rounded-full hover:bg-${type === 'success' ? 'green' : 'red'}-100 dark:hover:bg-${type === 'success' ? 'green' : 'red'}-800`}>
          <XIcon size={16} className={`${type === 'success' ? 'text-green-500 dark:text-green-300' : 'text-red-500 dark:text-red-300'}`} />
        </button>
      </div>
    </div>;
};
export default Toast;