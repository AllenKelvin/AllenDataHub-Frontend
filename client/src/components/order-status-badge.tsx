import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface OrderStatusBadgeProps {
  status?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function OrderStatusBadge({ status = 'pending', size = 'md' }: OrderStatusBadgeProps) {
  const iconSizeMap = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizeMap = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const paddingMap = {
    sm: 'px-2 py-0.5',
    md: 'px-3 py-1',
    lg: 'px-4 py-1.5',
  };

  const iconSize = iconSizeMap[size];
  const textSize = textSizeMap[size];
  const padding = paddingMap[size];

  if (status === 'pending') {
    return (
      <div className={`${padding} rounded-full font-medium flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200`}>
        <Clock className={`${iconSize} animate-bounce`} />
        <span className={textSize}>Pending</span>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className={`${padding} rounded-full font-medium flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200`}>
        <Loader2 className={`${iconSize} animate-spin`} />
        <span className={textSize}>Processing</span>
      </div>
    );
  }

  if (status === 'completed' || status === 'delivered') {
    return (
      <div className={`${padding} rounded-full font-medium flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200`}>
        <CheckCircle2 className={`${iconSize}`} />
        <span className={textSize}>Completed</span>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={`${padding} rounded-full font-medium flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200`}>
        <XCircle className={`${iconSize}`} />
        <span className={textSize}>Failed</span>
      </div>
    );
  }

  return (
    <div className={`${padding} rounded-full font-medium flex items-center gap-1.5 bg-gray-50 text-gray-700 border border-gray-200`}>
      <span className={textSize}>{status || 'Unknown'}</span>
    </div>
  );
}
