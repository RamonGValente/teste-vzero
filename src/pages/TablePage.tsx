
import { useParams } from 'react-router-dom'
import DataTable from '../components/DataTable'

export default function TablePage() {
  const { table } = useParams()
  if (!table) return <div>Tabela não informada</div>
  return (
    <div>
      <h1>{table}</h1>
      <DataTable table={table} />
    </div>
  )
}
