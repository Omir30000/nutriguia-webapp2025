import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, icon: Icon, children, className = "", action }) => {
  return (
    <div className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center space-x-3">
          {Icon && <div className="p-2 bg-emerald-100 rounded-lg"><Icon className="w-5 h-5 text-emerald-600" /></div>}
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default DashboardCard;