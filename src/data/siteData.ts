import type { GalleryItem, Review, VillageContent, VillagePlace } from '../types'

export const villageContent: VillageContent = {
  intro: 'ढढेरू भामूवान, also known as Dhadheru Bhamuwan, is a village in Bidasar tehsil of Churu district, Rajasthan, India.',
  location: 'Dhadheru Bhamuwan, Bidasar, Churu, Rajasthan, India',
  community: 'Community stories and local details are being gathered from residents. Share a firsthand account to help build this village archive.',
  education: 'School name and details have not yet been verified. This section is editable when confirmed with the community.',
  healthcare: 'A Primary Health Centre is listed for Dhadheru Bhamuwan, Sujangarh, Churu. Contact details and directions are awaiting confirmation.',
  religion: 'Temple names and details are not published until the local community confirms them.',
  culture: 'Local customs and cultural details are being collected with residents. Add verified stories here.',
  highlights: ['Bidasar tehsil', 'Churu district', 'Rajasthan, India'],
}

export const stats = [
  { label: 'Village', value: 'Dhadheru Bhamuwan', accent: 'emerald' },
  { label: 'Tehsil', value: 'Bidasar', accent: 'amber' },
  { label: 'District', value: 'Churu', accent: 'sky' },
  { label: 'State', value: 'Rajasthan, India', accent: 'rose' },
]

export const places: VillagePlace[] = [
  {
    id: 'village-dhadheru',
    name: 'Dhadheru Bhamuwan',
    category: 'Village',
    description: 'A village in Bidasar tehsil, Churu district, Rajasthan. Local stories and visitor information are being gathered.',
    location: 'Bidasar, Churu, Rajasthan',
    imageLabel: 'Verified Dhadheru Bhamuwan village photograph',
  },
  {
    id: 'gram-panchayat',
    name: 'Gram Panchayat',
    category: 'Civic information',
    description: 'Government references list Dhadheru Bhagwan as the Gram Panchayat. The Dhadheru Bhamuwan naming is retained for the village identity.',
    location: 'Dhadheru Bhamuwan / Dhadheru Bhagwan',
    imageLabel: 'Verified Gram Panchayat photograph',
  },
  {
    id: 'primary-health-centre',
    name: 'Primary Health Centre, Dhadheru Bhamuwan',
    category: 'Healthcare',
    description: 'A Primary Health Centre is listed for Dhadheru Bhamuwan, Sujangarh, Churu. Confirm current services before visiting.',
    location: 'Dhadheru Bhamuwan, Sujangarh, Churu',
    imageLabel: 'Verified Primary Health Centre photograph',
  },
]

export const galleryItems: GalleryItem[] = [
  {
    id: 'gallery-village',
    title: 'Dhadheru Bhamuwan',
    category: 'Village',
    description: 'Photo placeholder. Replace with a verified photograph of Dhadheru Bhamuwan.',
  },
  {
    id: 'gallery-life',
    title: 'Village Life',
    category: 'Village Life',
    description: 'Photo placeholder. Add an image shared by a resident with permission.',
  },
  {
    id: 'gallery-rajasthan',
    title: 'Rajasthan Landscape',
    category: 'Rajasthan Landscape',
    description: 'Photo placeholder. Add a licensed regional landscape image, clearly captioned by location.',
  },
  {
    id: 'gallery-community',
    title: 'Local Community',
    category: 'Community',
    description: 'Photo placeholder. Add a community image with consent from the people shown.',
  },
  {
    id: 'gallery-school',
    title: 'School',
    category: 'School',
    description: 'Photo placeholder. School name and image await local verification and permission.',
  },
  {
    id: 'gallery-healthcare',
    title: 'Healthcare',
    category: 'Healthcare',
    description: 'Photo placeholder. Add a verified Primary Health Centre photograph with permission.',
  },
  {
    id: 'gallery-temples',
    title: 'Temples',
    category: 'Temples',
    description: 'Photo placeholder. Publish local temple names and photos after community confirmation.',
  },
  {
    id: 'gallery-infrastructure',
    title: 'Roads & Infrastructure',
    category: 'Roads & Infrastructure',
    description: 'Photo placeholder. Add current local infrastructure photographs and captions.',
  },
  {
    id: 'gallery-nature',
    title: 'Nature',
    category: 'Nature',
    description: 'Photo placeholder. Add a photo captured in the Dhadheru area.',
  },
  {
    id: 'gallery-events',
    title: 'Events',
    category: 'Events',
    description: 'Photo placeholder. Add event photos only with permission from the people shown.',
  },
]

export const communityTopics = [
  { id: 'village-life', title: 'Village Life', text: 'Everyday village stories will be added with residents.', icon: 'home' },
  { id: 'community', title: 'Community', text: 'Share a firsthand account of people and community spaces.', icon: 'people' },
  { id: 'education', title: 'Education', text: villageContent.education, icon: 'education' },
  { id: 'healthcare', title: 'Healthcare', text: villageContent.healthcare, icon: 'healthcare' },
  { id: 'culture', title: 'Culture', text: villageContent.culture, icon: 'culture' },
  { id: 'festivals', title: 'Festivals', text: 'Festival details are awaiting confirmation from local residents.', icon: 'events' },
  { id: 'agriculture', title: 'Agriculture', text: 'Add verified information about local crops and agricultural life.', icon: 'nature' },
  { id: 'development', title: 'Local Development', text: 'Community-confirmed updates and public information will be added here.', icon: 'development' },
]

export const seedReviews: Review[] = []

export const adminCredentials = {
  username: 'admin',
  password: 'village123',
}
