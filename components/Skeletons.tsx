import React from 'react';

// Skeleton for a generic list item (used in MyEnrollments, AdminEvents)
export const SkeletonListItem: React.FC = () => (
    <li className="px-6 py-4 animate-pulse">
        <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/5"></div>
                <div className="h-3 bg-gray-200 rounded w-2/5"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
        </div>
    </li>
);

// Skeleton for the Dashboard event cards
export const SkeletonDashboardCard: React.FC = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full animate-pulse">
        <div className="p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-3">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded-full w-1/3"></div>
            </div>
            <div className="h-5 bg-gray-200 rounded w-4/5 mb-2"></div>
            <div className="space-y-2 flex-1">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
            <div className="mt-4 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="mt-4">
                <div className="h-2 bg-gray-200 rounded-full"></div>
            </div>
        </div>
        <div className="w-full h-12 bg-gray-100 border-t border-gray-200"></div>
    </div>
);

// Skeleton for the Admin Users table row (desktop)
export const SkeletonUserTableRow: React.FC = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="ml-4 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
            </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap space-y-2">
            <div className="h-3 bg-gray-200 rounded w-20"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-3 bg-gray-200 rounded w-12"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-5 bg-gray-200 rounded-full w-16"></div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
            <div className="h-5 bg-gray-200 rounded w-36 inline-block"></div>
        </td>
    </tr>
);

// Skeleton for the Admin Users card (mobile)
export const SkeletonUserMobileCard: React.FC = () => (
    <div className="bg-white shadow rounded-lg p-4 flex flex-col space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
            </div>
            <div className="h-5 bg-gray-200 rounded-full w-16"></div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-b border-gray-100 py-2">
            <div className="space-y-1">
                <div className="h-2 bg-gray-200 rounded w-10"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="space-y-1">
                <div className="h-2 bg-gray-200 rounded w-10"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
        </div>
        <div className="flex justify-end pt-1">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
        </div>
    </div>
);
