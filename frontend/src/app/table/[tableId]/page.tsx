import TableOrderPageClient from './TableClient';

export function generateStaticParams() {
  return [{ tableId: 'placeholder' }];
}

export default function TableOrderPage() {
  return <TableOrderPageClient />;
}
