import { useParams } from 'react-router-dom'
import ItemMasterForm from '../../components/forms/ItemMasterForm'

export default function ManufacturingFormPage() {
  const { id } = useParams()
  return (
    <ItemMasterForm
      title={id ? 'Edit Purchase Item' : 'New Purchase Item'}
      subtitle="Inventory -> Purchase - All Sections"
      showSections="all"
      initialData={id ? { id, groupType: 'Purchase Item' } : { groupType: 'Purchase Item' }}
    />
  )
}
