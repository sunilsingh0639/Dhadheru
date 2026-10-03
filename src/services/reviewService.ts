import { adminCredentials, seedReviews } from '../data/siteData'
import { localStorageService } from './localStorageService'
import type { MediaSubmission, Review, ReviewStatus } from '../types'

const REVIEWS_KEY = 'village-dhadheru:reviews'
const MEDIA_KEY = 'village-dhadheru:media'
const ADMIN_KEY = 'village-dhadheru:admin'

export const getReviews = (): Review[] => {
  const stored = localStorageService.get<Review[]>(REVIEWS_KEY, []).filter((review) =>
    !(
      (review.id === 'review-1' && review.name === 'Aarav' && review.email === 'aarav@example.com') ||
      (review.id === 'review-2' && review.name === 'Meena' && review.email === 'meena@example.com')
    ),
  )
  if (stored.length > 0) {
    localStorageService.set(REVIEWS_KEY, stored)
    return stored
  }

  localStorageService.set(REVIEWS_KEY, seedReviews)
  return seedReviews
}

export const saveReviews = (reviews: Review[]) => {
  localStorageService.set(REVIEWS_KEY, reviews)
}

export const addReview = (review: Omit<Review, 'id' | 'submittedAt' | 'status'> & { status?: ReviewStatus }): Review => {
  const allReviews = getReviews()
  const nextReview: Review = {
    ...review,
    id: `review-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: review.status ?? 'pending',
  }

  const updated = [nextReview, ...allReviews]
  saveReviews(updated)
  return nextReview
}

export const updateReviewStatus = (id: string, status: ReviewStatus) => {
  const allReviews = getReviews().map((review) =>
    review.id === id ? { ...review, status } : review,
  )
  saveReviews(allReviews)
}

export const deleteReview = (id: string) => {
  const allReviews = getReviews().filter((review) => review.id !== id)
  saveReviews(allReviews)
}

export const updateReviewPhotos = (id: string, imagePaths: string[], imageCategories?: string[]) => {
  const updated = getReviews().map((review) => (review.id === id
    ? { ...review, imagePaths, imageCategories: imageCategories ?? review.imageCategories?.slice(0, imagePaths.length) }
    : review))
  saveReviews(updated)
}

export const updateReviewPhotoCategory = (id: string, imageIndex: number, category: string) => {
  const updated = getReviews().map((review) => {
    if (review.id !== id) return review
    const imageCategories = [...(review.imageCategories ?? review.imagePaths.map(() => review.category))]
    imageCategories[imageIndex] = category
    return { ...review, imageCategories }
  })
  saveReviews(updated)
}

export const getMediaSubmissions = (): MediaSubmission[] => {
  return localStorageService.get<MediaSubmission[]>(MEDIA_KEY, [])
}

export const saveMediaSubmissions = (media: MediaSubmission[]) => {
  localStorageService.set(MEDIA_KEY, media)
}

export const addMediaSubmission = (submission: Omit<MediaSubmission, 'id' | 'createdAt'> & { status?: ReviewStatus }) => {
  const allMedia = getMediaSubmissions()
  const nextMedia: MediaSubmission = {
    ...submission,
    id: `media-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: submission.status ?? 'pending',
  }

  const updated = [nextMedia, ...allMedia]
  saveMediaSubmissions(updated)
  return nextMedia
}

export const deleteMediaSubmission = (id: string) => {
  const allMedia = getMediaSubmissions().filter((item) => item.id !== id)
  saveMediaSubmissions(allMedia)
}

export const getAdminSession = () => localStorageService.get<boolean>(ADMIN_KEY, false)

export const setAdminSession = (isLoggedIn: boolean) => {
  localStorageService.set(ADMIN_KEY, isLoggedIn)
}

export const loginAdmin = (username: string, password: string) => {
  const valid =
    username.trim().toLowerCase() === adminCredentials.username &&
    password === adminCredentials.password

  if (valid) {
    setAdminSession(true)
  }

  return valid
}

export const logoutAdmin = () => setAdminSession(false)

