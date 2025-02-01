import React from 'react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from './components/Modal';
import { DataTable } from './components/DataTable';
import type { SheetData, ValidationError, ExcelRow } from './types';

function App() {
  const [sheetData, setSheetData] = useState<SheetData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  const validateRow = (row: any, rowIndex: number, sheetName: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!row.name) {
      errors.push({ sheet: sheetName, row: rowIndex + 2, message: 'Name is required' });
    }
    
    if (!row.amount) {
      errors.push({ sheet: sheetName, row: rowIndex + 2, message: 'Amount is required' });
    } else if (isNaN(row.amount) || row.amount <= 0) {
      errors.push({ sheet: sheetName, row: rowIndex + 2, message: 'Amount must be a positive number' });
    }
    
    if (!row.date) {
      errors.push({ sheet: sheetName, row: rowIndex + 2, message: 'Date is required' });
    } else {
      const date = new Date(row.date);
      const now = new Date();
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) {
        errors.push({ 
          sheet: sheetName, 
          row: rowIndex + 2, 
          message: 'Date must be within the current month' 
        });
      }
    }

    return errors;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      
      const sheets: SheetData[] = [];
      const allErrors: ValidationError[] = [];

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const sheetErrors: ValidationError[] = [];
        const validRows: ExcelRow[] = [];

        jsonData.forEach((row: any, index) => {
          const rowErrors = validateRow(row, index, sheetName);
          if (rowErrors.length > 0) {
            sheetErrors.push(...rowErrors);
          } else {
            validRows.push({
              name: row.name,
              amount: parseFloat(row.amount),
              date: new Date(row.date),
              verified: row.verified?.toLowerCase() === 'yes'
            });
          }
        });

        sheets.push({
          name: sheetName,
          data: validRows,
          errors: sheetErrors
        });
        
        allErrors.push(...sheetErrors);
      });

      setSheetData(sheets);
      setSelectedSheet(sheets[0]?.name || '');
      setErrors(allErrors);
      
      if (allErrors.length > 0) {
        setShowErrorModal(true);
      }
    };
    
    reader.readAsBinaryString(file);
  }, []);

  const handleImport = async () => {
    const currentSheet = sheetData.find(sheet => sheet.name === selectedSheet);
    if (!currentSheet) return;

    setImporting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: currentSheet.data,
          sheetName: currentSheet.name,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Successfully imported ${result.imported} records. ${result.skipped} records were skipped.`);
        // Clear the imported sheet data
        setSheetData(prev => prev.filter(sheet => sheet.name !== selectedSheet));
        if (sheetData.length > 1) {
          setSelectedSheet(sheetData[0].name);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import data. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: 2 * 1024 * 1024
  });

  const handleDeleteRow = (index: number) => {
    setRowToDelete(index);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (rowToDelete === null) return;
    
    setSheetData(prevData => 
      prevData.map(sheet => 
        sheet.name === selectedSheet
          ? { ...sheet, data: sheet.data.filter((_, i) => i !== rowToDelete) }
          : sheet
      )
    );
    
    setShowDeleteModal(false);
    setRowToDelete(null);
  };

  const currentSheet = sheetData.find(sheet => sheet.name === selectedSheet);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Excel Data Import</h1>
          
          <div
            {...getRootProps()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-gray-400"
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            {isDragActive ? (
              <p className="text-gray-600">Drop the Excel file here...</p>
            ) : (
              <div>
                <p className="text-gray-600">Drag and drop an Excel file here, or click to select</p>
                <p className="mt-2 text-sm text-gray-500">Only .xlsx files up to 2MB are accepted</p>
              </div>
            )}
          </div>
        </div>

        {sheetData.length > 0 && (
          <div className="rounded-lg bg-white p-8 shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="rounded-md border border-gray-300 px-4 py-2"
              >
                {sheetData.map(sheet => (
                  <option key={sheet.name} value={sheet.name}>
                    {sheet.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleImport}
                disabled={importing}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import Data'}
              </button>
            </div>

            {currentSheet && (
              <DataTable
                data={currentSheet.data}
                onDeleteRow={handleDeleteRow}
              />
            )}
          </div>
        )}

        <Modal isOpen={showErrorModal} onClose={() => setShowErrorModal(false)}>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-semibold">Validation Errors</h2>
            </div>
            
            {sheetData.map(sheet => (
              sheet.errors.length > 0 && (
                <div key={sheet.name} className="space-y-2">
                  <h3 className="font-medium">Sheet: {sheet.name}</h3>
                  <ul className="list-inside list-disc space-y-1">
                    {sheet.errors.map((error, index) => (
                      <li key={index} className="text-red-600">
                        Row {error.row}: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        </Modal>

        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Confirm Deletion</h2>
            <p>Are you sure you want to delete this row?</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default App;