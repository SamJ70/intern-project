import React from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import type { ExcelRow } from '../types';

interface DataTableProps {
  data: ExcelRow[];
  onDeleteRow: (index: number) => void;
}

function formatIndianNumber(num: number): string {
  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  const lastThree = integerPart.slice(-3);
  const remaining = integerPart.slice(0, -3);
  const formattedRemaining = remaining.length > 0 
    ? remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') 
    : '';
  
  return `${formattedRemaining}${remaining ? ',' : ''}${lastThree}.${decimalPart}`;
}

export function DataTable({ data, onDeleteRow }: DataTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 10;
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const paginatedData = data.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Verified
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {paginatedData.map((row, index) => (
              <tr key={index}>
                <td className="whitespace-nowrap px-6 py-4">{row.name}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  ₹{formatIndianNumber(row.amount)}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {format(row.date, 'dd-MM-yyyy')}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {row.verified ? 'Yes' : 'No'}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <button
                    onClick={() => onDeleteRow(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}