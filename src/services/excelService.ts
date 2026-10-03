import type { Review } from '../types'

const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`

export const exportReviewsCsv = (rows: Review[]) => {
  const headers = ['ID', 'Name', 'Email', 'Rating', 'Review', 'Category', 'SubmittedAt', 'Status', 'ImagePaths', 'MediaPath']
  const csvRows = [headers.map(escapeCsv)]

  rows.forEach((row) => {
    csvRows.push([
      row.id,
      row.name,
      row.email ?? '',
      String(row.rating),
      row.review ?? '',
      row.category,
      row.submittedAt,
      row.status,
      row.imagePaths.join('; '),
      row.mediaPath ?? '',
    ].map(escapeCsv))
  })

  return csvRows.map((row) => row.join(',')).join('\r\n')
}