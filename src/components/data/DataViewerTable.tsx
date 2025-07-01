
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface DataRecord {
  id: string;
  [key: string]: any;
}

interface DataViewerTableProps {
  paginatedRecords: DataRecord[];
  tableHeaders: string[];
  headerToKeyMapping: { [key: string]: string };
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isMobile?: boolean;
}

const DataViewerTable = ({ 
  paginatedRecords, 
  tableHeaders, 
  headerToKeyMapping, 
  currentPage, 
  totalPages, 
  onPageChange, 
  isMobile = false 
}: DataViewerTableProps) => {
  const MobileTable = () => (
    <div className="space-y-3">
      {paginatedRecords.map((record) => (
        <Card key={record.id} className="p-4">
          <div className="space-y-2">
            {Object.entries(record).map(([key, value]) => {
              if (key === 'id') return null;
              const headerName = Object.keys(headerToKeyMapping).find(
                header => headerToKeyMapping[header] === key
              ) || key;
              return (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600">
                    {headerName}:
                  </span>
                  <span className="text-xs text-gray-900">{String(value)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );

  const DesktopTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          {tableHeaders.map((header) => (
            <TableHead key={header}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedRecords.map((record) => (
          <TableRow key={record.id}>
            {tableHeaders.map((header) => {
              const dataKey = headerToKeyMapping[header];
              const value = record[dataKey];
              return (
                <TableCell key={header}>
                  {String(value || '')}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardContent className={isMobile ? 'p-3' : 'pt-6'}>
        {isMobile ? <MobileTable /> : <DesktopTable />}

        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(isMobile ? 3 : 5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => onPageChange(page)}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataViewerTable;
