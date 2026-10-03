export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface Review {
  id: string
  name: string
  email?: string
  phone?: string
  rating: number
  review: string
  category: string
  submittedAt: string
  status: ReviewStatus
  imagePaths: string[]
  imageCategories?: string[]
  mediaPath?: string
}

export interface VillagePlace {
  id: string
  name: string
  category: string
  description: string
  location: string
  image?: string
  imageLabel: string
}

export interface GalleryItem {
  id: string
  title: string
  category: 'Village' | 'Village Life' | 'Rajasthan Landscape' | 'Community' | 'School' | 'Healthcare' | 'Temples' | 'Roads & Infrastructure' | 'Nature' | 'Events' | 'Other'
  image?: string
  description: string
}

export interface MediaSubmission {
  id: string
  title: string
  type: 'video' | 'audio'
  url: string
  createdAt: string
  size: number
  source: 'camera' | 'upload'
  status: ReviewStatus
}

export interface VillageContent {
  intro: string
  location: string
  community: string
  education: string
  healthcare: string
  religion: string
  culture: string
  highlights: string[]
}
