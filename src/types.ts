export interface ExcelRow {
  name: string;
  amount: number;
  date: Date;
  verified: boolean;
  [key: string]: any;
}

export interface ValidationError {
  sheet: string;
  row: number;
  message: string;
}

export interface SheetData {
  name: string;
  data: ExcelRow[];
  errors: ValidationError[];
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}