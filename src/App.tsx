import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
} from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  Check,
  Construction,
  ChevronRight,
  Download,
  HeartHandshake,
  Home,
  Images,
  Info,
  LogIn,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Trash2,
  UploadCloud,
  Users,
  Wheat,
  X,
} from 'lucide-react'
import './App.css'
import { LiveCaptureExperience } from './components/LiveCaptureExperience'
import { LiveCaptureSubmissions } from './components/LiveCaptureSubmissions'
import { OpinionSurveyModal } from './components/OpinionSurveyModal'
import { communityTopics, galleryItems, places, stats, villageContent } from './data/siteData'
import {
  addReview,
  deleteMediaSubmission,
  deleteReview,
  getAdminSession,
  getMediaSubmissions,
  getReviews,
  loginAdmin,
  logoutAdmin,
  updateReviewPhotoCategory,
  updateReviewPhotos,
  updateReviewStatus,
} from './services/reviewService'
import { exportReviewsCsv } from './services/excelService'
import { localStorageService } from './services/localStorageService'
import { hasSurveyBeenHandledThisSession, markSurveyHandled } from './services/surveyService'
import { createMediaCaptureService } from './services/mediaCaptureService'
import { localMediaStorageService } from './services/localMediaStorageService'
import type { GalleryItem, MediaSubmission, Review, ReviewStatus } from './types'

const mediaCapture = createMediaCaptureService(localMediaStorageService)

type ToastState = { title: string; message: string } | null

type OutletContext = {
  reviews: Review[]
  setReviews: Dispatch<SetStateAction<Review[]>>
  mediaSubmissions: MediaSubmission[]
  setMediaSubmissions: Dispatch<SetStateAction<MediaSubmission[]>>
  notify: (title: string, message: string) => void
}

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'About Dhadheru', path: '/about', icon: Info },
  { label: 'Places', path: '/places', icon: MapPin },
  { label: 'Gallery', path: '/gallery', icon: Images },
  { label: 'Community', path: '/community', icon: Users },
  { label: 'Reviews', path: '/reviews', icon: Star },
]

const communityIcons = [Home, Users, BookOpen, Stethoscope, HeartHandshake, CalendarDays, Wheat, Construction]

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onerror = () => reject(new Error('Photo could not be read.'))
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Photo could not be read.'))
  reader.readAsDataURL(file)
})

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const

function App() {
  const [reviews, setReviews] = useState<Review[]>(() => getReviews())
  const [mediaSubmissions, setMediaSubmissions] = useState<MediaSubmission[]>(() => getMediaSubmissions())
  const [toast, setToast] = useState<ToastState>(null)
  const [showOpinionSurvey, setShowOpinionSurvey] = useState(false)

  const notify = (title: string, message: string) => {
    setToast({ title, message })
  }

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (typeof window === 'undefined' || hasSurveyBeenHandledThisSession()) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setShowOpinionSurvey(true)
    }, 20000)

    return () => window.clearTimeout(timer)
  }, [])

  const handleSurveyClose = () => {
    setShowOpinionSurvey(false)
    markSurveyHandled()
  }

  return (
    <BrowserRouter>
      <OpinionSurveyModal isOpen={showOpinionSurvey} onClose={handleSurveyClose} />

      <Routes>
        <Route
          element={
            <AppShell
              reviews={reviews}
              setReviews={setReviews}
              mediaSubmissions={mediaSubmissions}
              setMediaSubmissions={setMediaSubmissions}
              notify={notify}
            />
          }
        >
          <Route path="/" element={<HomePage reviews={reviews} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/places" element={<PlacesPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/share-experience" element={<ShareExperiencePage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      <AnimatePresence>
        {toast ? (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            <div className="toast-icon">
              <Check size={16} />
            </div>
            <div>
              <strong>{toast.title}</strong>
              <span>{toast.message}</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </BrowserRouter>
  )
}

function AppShell({
  reviews,
  setReviews,
  mediaSubmissions,
  setMediaSubmissions,
  notify,
}: {
  reviews: Review[]
  setReviews: Dispatch<SetStateAction<Review[]>>
  mediaSubmissions: MediaSubmission[]
  setMediaSubmissions: Dispatch<SetStateAction<MediaSubmission[]>>
  notify: (title: string, message: string) => void
}) {
  const location = useLocation()
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null)
  const menuOpen = openMenuPath === location.pathname
  const [searchValue, setSearchValue] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(() => window.scrollY > 18)

  useEffect(() => {
    const updateScrollState = () => setHasScrolled(window.scrollY > 18)
    window.addEventListener('scroll', updateScrollState, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])

  const searchResults = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) {
      return []
    }

    const items = [
      ...places.map((place) => ({
        title: place.name,
        description: place.description,
        category: place.category,
        href: '/places',
      })),
      ...galleryItems.map((item) => ({
        title: item.title,
        description: item.description,
        category: item.category,
        href: '/gallery',
      })),
      ...communityTopics.map((item) => ({
        title: item.title,
        description: item.text,
        category: 'Community',
        href: '/community',
      })),
      ...reviews.map((review) => ({
        title: review.name,
        description: review.review,
        category: review.category,
        href: '/reviews',
      })),
    ]

    return items.filter((item) => {
      const haystack = `${item.title} ${item.description} ${item.category}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [reviews, searchValue])

  return (
    <>
      <header className={`${hasScrolled ? 'site-header scrolled' : 'site-header'}${location.pathname === '/' ? ' home-header' : ''}`}>
        <nav className="navbar container-fluid">
          <Link to="/" className="brand-logo" aria-label="Dhadheru home">
            <span className="brand-mark" aria-hidden="true">ढ</span>
            <span className="brand-copy"><strong>Dhadheru Bhamuwan</strong><small>ढढेरू भामूवान · Churu, Rajasthan</small></span>
          </Link>

          <div className="nav-desktop">
            {navItems.map(({ label, path, icon: Icon }) => (
              <NavLink key={path} to={path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>

          <div className="nav-actions">
            {searchOpen ? (
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search Dhadheru"
                  aria-label="Search the village website"
                  autoFocus
                />
                <button type="button" className="search-close" onClick={() => { setSearchOpen(false); setSearchValue('') }} aria-label="Close search">
                  <X size={16} />
                </button>
                {searchValue ? (
                <div className="search-results">
                  {searchResults.length ? (
                    searchResults.slice(0, 5).map((result, index) => (
                      <Link key={`${result.title}-${index}`} to={result.href} className="search-result-item">
                        <span className="search-pill">{result.category}</span>
                        <strong>{result.title}</strong>
                        <small>{result.description}</small>
                      </Link>
                    ))
                  ) : (
                    <div className="empty-search">No matching village content found.</div>
                  )}
                </div>
                ) : null}
              </div>
            ) : (
              <button type="button" className="search-toggle" onClick={() => setSearchOpen(true)} aria-label="Open search">
                <Search size={19} />
              </button>
            )}

            <NavLink to="/share-experience" className="nav-share-cta">
              Share Experience <ArrowRight size={15} />
            </NavLink>

            <button type="button" className="menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setOpenMenuPath(menuOpen ? null : location.pathname)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              className="mobile-menu"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
            >
              {navItems.map(({ label, path, icon: Icon }) => (
                <NavLink key={path} to={path} className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
              <NavLink to="/share-experience" className="mobile-nav-link mobile-share-link">
                <Camera size={16} /> Share Experience
              </NavLink>
              <NavLink to="/admin/login" className="mobile-nav-link admin">
                <LogIn size={16} /> Admin Login
              </NavLink>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main className="page-shell">
        <Outlet context={{ reviews, setReviews, mediaSubmissions, setMediaSubmissions, notify }} />
      </main>

      <LiveCaptureExperience captureService={mediaCapture} />

      <footer className="site-footer">
        <div className="container-fluid footer-grid">
          <div>
            <h3>Dhadheru Bhamuwan</h3>
            <p>
              A digital identity for Dhadheru Bhamuwan, Bidasar, Churu, Rajasthan.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li>
                <Link to="/about">About Dhadheru</Link>
              </li>
              <li>
                <Link to="/community">Community</Link>
              </li>
              <li>
                <Link to="/places">Places</Link>
              </li>
              <li>
                <Link to="/gallery">Gallery</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Community</h4>
            <ul>
              <li>
                <Link to="/reviews">Reviews</Link>
              </li>
              <li>
                <Link to="/share-experience">Share Experience</Link>
              </li>
              <li>
                <Link to="/admin/login">Admin</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">© 2026 Village Dhadheru. Information updated locally for development.</div>
      </footer>

      <button type="button" className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <ChevronRight size={16} />
      </button>
    </>
  )
}

function HomePage({ reviews }: { reviews: Review[] }) {
  const approvedReviews = reviews.filter((review) => review.status === 'approved')

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
      <section className="hero-section container-fluid">
        <div className="hero-content">
          <motion.span className="eyebrow" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            Dhadheru Bhamuwan · ढढेरू भामूवान
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            Welcome to Dhadheru Bhamuwan
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            A glimpse into our village, community, culture and everyday life in Churu, Rajasthan.
          </motion.p>

          <motion.div className="hero-actions" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Link to="/about" className="primary-button">
              Explore Dhadheru <ArrowRight size={18} />
            </Link>
            <Link to="/share-experience" className="secondary-button">
              Share Your Experience
            </Link>
          </motion.div>

          <div className="hero-location"><MapPin size={16} /> Bidasar · Churu · Rajasthan, India</div>
        </div>

        <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }}>
          <PhotoPlaceholder label="Dhadheru Bhamuwan village photograph" featured />
          <div className="hero-image-caption"><span>Local photography welcome</span><strong>A place, in its own voice.</strong></div>
          <span className="hero-image-credit">Village image placeholder</span>
        </motion.div>
      </section>

      <section className="stats-strip container-fluid">
        {stats.map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.accent}`}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="section-block container-fluid">
        <SectionHeader
          eyebrow="About Dhadheru"
          title="About Dhadheru Bhamuwan"
          description="Dhadheru Bhamuwan is in Bidasar tehsil, Churu district, Rajasthan, India. This page is being built with verified local knowledge."
        />

        <div className="content-grid about-grid">
          <div className="info-panel">
            <h3>Village introduction</h3>
            <p>{villageContent.intro}</p>
            <div className="feature-list">
              <div>
                <strong>Location</strong>
                <span>{villageContent.location}</span>
              </div>
              <div>
                <strong>Community</strong>
                <span>{villageContent.community}</span>
              </div>
              <div>
                <strong>Culture</strong>
                <span>{villageContent.culture}</span>
              </div>
            </div>
          </div>

          <div className="mini-card-grid">
            {[
              { icon: Building2, label: 'Education', text: villageContent.education },
              { icon: Stethoscope, label: 'Healthcare', text: villageContent.healthcare },
              { icon: Sparkles, label: 'Community', text: villageContent.highlights[0] },
              { icon: HeartHandshake, label: 'Culture', text: villageContent.culture },
            ].map(({ icon: Icon, label, text }) => (
              <div key={label} className="mini-card">
                <Icon size={18} />
                <h4>{label}</h4>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CommunitySection compact />

      <section className="section-block container-fluid">
        <SectionHeader
          eyebrow="Important places"
          title="Important places around Dhadheru"
          description="Verified location references only. Confirm service details locally before visiting; unverified places remain unpublished."
        />

        <div className="place-grid">
          {places.map((place) => (
            <motion.article key={place.id} className="place-card" whileHover={{ y: -6 }}>
              {place.image ? <img src={place.image} alt={place.name} loading="lazy" /> : <PhotoPlaceholder label={place.imageLabel} />}
              <div className="place-card-body">
                <span className="badge">{place.category}</span>
                <h3>{place.name}</h3>
                <p>{place.description}</p>
                <div className="place-meta">
                  <MapPin size={14} />
                  <span>{place.location}</span>
                </div>
                <Link to="/places" className="text-button">
                  View Details <ArrowRight size={16} />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="section-block container-fluid">
        <SectionHeader
          eyebrow="Photo story"
          title="Dhadheru, through local eyes"
          description="Labeled placeholders will be replaced with verified, community-provided or licensed photographs."
        />

        <div className="gallery-mini-grid">
          {galleryItems.slice(0, 4).map((item) => (
            <div key={item.id} className="gallery-tile">
              {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <PhotoPlaceholder label={item.title} />}
              <div className="gallery-overlay">
                <span>{item.category}</span>
                <strong>{item.title}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block container-fluid review-highlight">
        <SectionHeader
          eyebrow="Community review"
          title="What Our Community Says"
          description="Community-submitted reviews appear here after admin approval."
        />

        <div className="review-grid">
          {approvedReviews.slice(0, 3).map((review) => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div>
                  <strong>{review.name}</strong>
                  <span>{review.category}</span>
                </div>
                <div className="stars">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={`${review.id}-${index}`} size={14} fill={index < review.rating ? '#f0b24a' : 'none'} />
                  ))}
                </div>
              </div>
              <p>{review.review}</p>
            </div>
          ))}
          {!approvedReviews.length ? <p className="empty-content-note">No approved reviews yet. Be the first to share an experience.</p> : null}
        </div>
      </section>
    </motion.div>
  )
}

function AboutPage() {
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container-fluid page-content">
      <SectionHeader
        eyebrow="About"
        title="About Dhadheru Bhamuwan"
        description="ढढेरू भामूवान · Bidasar tehsil · Churu district · Rajasthan, India"
      />

      <div className="about-story">
        <div className="story-visual">
          <PhotoPlaceholder label="Dhadheru Bhamuwan village photograph" featured />
        </div>
        <div className="story-copy">
          <h3>Village introduction</h3>
          <p>{villageContent.intro}</p>
          <div className="split-list">
            <div>
              <h4>Location</h4>
              <p>{villageContent.location}</p>
            </div>
            <div>
              <h4>Community</h4>
              <p>{villageContent.community}</p>
            </div>
            <div>
              <h4>Education</h4>
              <p>{villageContent.education}</p>
            </div>
            <div>
              <h4>Healthcare</h4>
              <p>{villageContent.healthcare}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="info-card-grid">
        {[
          { title: 'Location', text: villageContent.location, icon: MapPin },
          { title: 'Religious places', text: villageContent.religion, icon: Sparkles },
          { title: 'Local culture', text: villageContent.culture, icon: HeartHandshake },
          { title: 'Village highlights', text: villageContent.highlights.join(', '), icon: BadgeCheck },
        ].map(({ title, text, icon: Icon }) => (
          <div key={title} className="glass-card info-card">
            <Icon size={18} />
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function CommunityPage() {
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container-fluid page-content">
      <CommunitySection />
    </motion.div>
  )
}

function CommunitySection({ compact = false }: { compact?: boolean }) {
  return (
    <section id="community" className={compact ? 'section-block container-fluid community-section compact' : 'section-block community-section'}>
      <SectionHeader
        eyebrow="Community"
        title="Life in Dhadheru"
        description="An editable collection of village life, people, services and local knowledge. Entries needing confirmation are clearly marked."
      />
      <div className="community-grid">
        {communityTopics.map((topic, index) => {
          const Icon = communityIcons[index]
          return (
            <motion.article
              key={topic.id}
              className="community-card"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.035 }}
            >
              <span className="community-card-icon"><Icon size={19} /></span>
              <h3>{topic.title}</h3>
              <p>{topic.text}</p>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}

function PhotoPlaceholder({ label, featured = false }: { label: string; featured?: boolean }) {
  return (
    <div className={featured ? 'photo-placeholder featured' : 'photo-placeholder'} role="img" aria-label={`${label} photo placeholder`}>
      <div className="placeholder-sun" />
      <div className="placeholder-ridge ridge-back" />
      <div className="placeholder-ridge ridge-front" />
      <div className="placeholder-label">
        <MapPin size={16} />
        <span>PHOTO PLACEHOLDER</span>
        <strong>{label}</strong>
        <small>Replace with a verified, community-provided or licensed image.</small>
      </div>
    </div>
  )
}

function PlacesPage() {
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container-fluid page-content">
      <SectionHeader
        eyebrow="Places"
        title="Important places in Dhadheru Bhamuwan"
        description="Location references supplied from government listings. Confirm current service details locally; unverified schools and religious sites are intentionally not listed."
      />

      <div className="place-grid large">
        {places.map((place) => (
          <article key={place.id} className="place-card place-card-large">
            {place.image ? <img src={place.image} alt={place.name} loading="lazy" /> : <PhotoPlaceholder label={place.imageLabel} />}
            <div className="place-card-body">
              <span className="badge">{place.category}</span>
              <h3>{place.name}</h3>
              <p>{place.description}</p>
              <div className="place-meta">
                <MapPin size={14} />
                <span>{place.location}</span>
              </div>
              <span className="place-verification-note">Local details are being confirmed.</span>
            </div>
          </article>
        ))}
      </div>
    </motion.div>
  )
}

function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState<'All' | GalleryItem['category']>('All')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const touchStartX = useRef(0)
  const categories: readonly ('All' | GalleryItem['category'])[] = [
    'All',
    'Village',
    'Village Life',
    'Rajasthan Landscape',
    'Community',
    'School',
    'Healthcare',
    'Temples',
    'Roads & Infrastructure',
    'Nature',
    'Events',
    'Other',
  ]

  const filteredItems = activeCategory === 'All' ? galleryItems : galleryItems.filter((item) => item.category === activeCategory)

  useEffect(() => {
    if (selectedIndex === null) return undefined
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedIndex(null)
      if (event.key === 'ArrowRight') setSelectedIndex((current) => current === null ? null : (current + 1) % filteredItems.length)
      if (event.key === 'ArrowLeft') setSelectedIndex((current) => current === null ? null : (current - 1 + filteredItems.length) % filteredItems.length)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredItems.length, selectedIndex])

  const openImage = (index: number) => setSelectedIndex(index)
  const closeImage = () => setSelectedIndex(null)

  const currentImage = selectedIndex !== null ? filteredItems[selectedIndex] : null

  const showNext = () => {
    if (selectedIndex === null) {
      return
    }

    const nextIndex = (selectedIndex + 1) % filteredItems.length
    setSelectedIndex(nextIndex)
  }

  const showPrevious = () => {
    if (selectedIndex === null) {
      return
    }

    const prevIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length
    setSelectedIndex(prevIndex)
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container-fluid page-content">
      <SectionHeader
        eyebrow="Gallery"
        title="A visual story of Dhadheru"
        description="Village scenes, cultural highlights, educational spaces, and community moments captured in a modern gallery format."
      />

      <div className="category-filter">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={activeCategory === category ? 'filter-chip active' : 'filter-chip'}
            onClick={() => { setActiveCategory(category); setSelectedIndex(null) }}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="gallery-grid">
        {filteredItems.map((item, index) => (
          <button key={item.id} type="button" className={index % 7 === 0 ? 'gallery-item featured' : 'gallery-item'} onClick={() => openImage(index)}>
            {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : <PhotoPlaceholder label={item.title} />}
            <span className="gallery-item-meta">
              <small>{item.category}</small>
              <strong>{item.title}</strong>
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {currentImage ? (
          <motion.div
            className="lightbox-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeImage}
            onTouchStart={(event) => { touchStartX.current = event.changedTouches[0].screenX }}
            onTouchEnd={(event) => {
              const delta = event.changedTouches[0].screenX - touchStartX.current
              if (Math.abs(delta) > 50) delta < 0 ? showNext() : showPrevious()
            }}
            tabIndex={-1}
          >
            <motion.div
              className="lightbox"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="lightbox-close" onClick={closeImage} aria-label="Close lightbox">
                <X size={18} />
              </button>
              {currentImage.image ? <img src={currentImage.image} alt={currentImage.title} /> : <PhotoPlaceholder label={currentImage.title} featured />}
              <div className="lightbox-content">
                <span>{currentImage.category}</span>
                <h3>{currentImage.title}</h3>
                <p>{currentImage.description}</p>
              </div>
              <div className="lightbox-controls">
                <button type="button" onClick={showPrevious}>Previous</button>
                <button type="button" onClick={showNext}>Next</button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

function ReviewsPage() {
  const { reviews } = useOutletContext<OutletContext>()
  const approvedReviews = reviews.filter((item) => item.status === 'approved')
  const averageRating = approvedReviews.length
    ? approvedReviews.reduce((sum, item) => sum + item.rating, 0) / approvedReviews.length
    : 0

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container-fluid page-content">
      <SectionHeader
        eyebrow="Reviews"
        title="What Our Community Says"
        description="Reviews are shared by users and shown publicly only after admin approval."
      />

      <div className="review-summary">
        <div className="summary-card">
          <span>Total reviews</span>
          <strong>{approvedReviews.length}</strong>
        </div>
        <div className="summary-card">
          <span>Average rating</span>
          <strong>{averageRating.toFixed(1)}</strong>
        </div>
        <div className="summary-card">
          <span>Approved reviews</span>
          <strong>{approvedReviews.length}</strong>
        </div>
      </div>

      <div className="review-list">
        {approvedReviews.map((review) => (
          <article key={review.id} className="review-card large">
            <div className="review-header">
              <div>
                <span className="review-avatar" aria-hidden="true">{review.name.trim().slice(0, 1).toUpperCase()}</span>
                <div><strong>{review.name}</strong>
                <span>{review.category}</span>
                </div>
              </div>
              <div className="stars">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star key={`${review.id}-star-${index}`} size={14} fill={index < review.rating ? '#f0b24a' : 'none'} />
                ))}
              </div>
            </div>
            <p>{review.review}</p>
            {review.imagePaths.length ? (
              <div className="review-thumb-grid">
                {review.imagePaths.map((image, index) => (
                  <img key={`${review.id}-${index}`} src={image} alt={`${review.name} review`} loading="lazy" />
                ))}
              </div>
            ) : null}
            <div className="review-footer">
              <small>{new Date(review.submittedAt).toLocaleDateString()}</small>
              <span className="review-approved-label"><BadgeCheck size={14} /> Approved</span>
            </div>
          </article>
        ))}
        {!approvedReviews.length ? <p className="empty-content-note">No approved reviews yet. Share a firsthand experience to start the community collection.</p> : null}
      </div>
    </motion.div>
  )
}

function ShareExperiencePage() {
  const { setReviews, notify } = useOutletContext<OutletContext>()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    review: '',
    category: 'Community',
    rating: 5,
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const previewUrls = selectedFiles.map((file) => URL.createObjectURL(file))

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  const updateField = (key: keyof typeof form, value: string | number) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 4)
    const validFiles = files.filter((file) => file.size <= 512 * 1024)
    if (validFiles.length !== files.length) {
      notify('Photo size limit', 'Choose photos under 512 KB each. Up to four photos can be attached.')
    }
    setSelectedFiles(validFiles)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name.trim()) {
      notify('Missing details', 'Please enter your name before submitting.')
      return
    }

    if (!form.review.trim() || form.review.trim().length < 15) {
      notify('Review too short', 'Please share a more detailed review before submitting.')
      return
    }

    let result: Review
    try {
      const imagePaths = await Promise.all(selectedFiles.map(fileToDataUrl))
      result = addReview({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        review: form.review.trim(),
        category: form.category,
        rating: Number(form.rating),
        imagePaths,
      })
    } catch {
      notify('Photo upload failed', 'The selected photos could not be saved. Please try smaller images or continue without photos.')
      return
    }

    setReviews((current) => [result, ...current])
    notify('Review submitted', 'Your experience has been saved locally and is awaiting review.')
    setForm({ name: '', email: '', phone: '', review: '', category: 'Community', rating: 5 })
    setSelectedFiles([])
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container-fluid page-content">
      <SectionHeader
        eyebrow="Share your story"
        title="Share your experience about Dhadheru"
        description="Tell the community what stands out, what feels special, and what you would love others to know."
      />

      <div className="share-layout">
        <form className="experience-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              <span>Name</span>
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
            </label>
            <label>
              <span>Email / Mobile</span>
              <input value={form.email} onChange={(event) => updateField('email', event.target.value)} />
            </label>
          </div>

          <label>
            <span>Review</span>
            <textarea
              rows={6}
              value={form.review}
              onChange={(event) => updateField('review', event.target.value)}
              maxLength={500}
              placeholder="Tell us about your experience with Dhadheru..."
            />
          </label>

          <div className="meta-row">
            <label>
              <span>Category</span>
              <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                {['Village', 'School', 'Hospital', 'Temple', 'Nature', 'Events', 'Community', 'Other'].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="rating-block">
              <span>Rating</span>
              <div className="stars-selector">
                {Array.from({ length: 5 }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={index < form.rating ? 'star active' : 'star'}
                    onClick={() => updateField('rating', index + 1)}
                  >
                    <Star size={18} fill={index < form.rating ? '#f0b24a' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="upload-box">
            <label className="upload-label">
              <UploadCloud size={18} />
              Upload photos
            </label>
            <input type="file" accept="image/*" multiple onChange={handleFileChange} />
          </div>

          {previewUrls.length ? (
            <div className="preview-grid">
              {previewUrls.map((url, index) => (
                <img key={`${url}-${index}`} src={url} alt="Review upload preview" />
              ))}
            </div>
          ) : null}

          <div className="form-actions">
            <button type="submit" className="primary-button">
              Submit Review <ArrowRight size={16} />
            </button>
          </div>
        </form>

      </div>
    </motion.div>
  )
}

function AdminLoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const valid = loginAdmin(form.username, form.password)

    if (!valid) {
      setError('Invalid local admin credentials.')
      return
    }

    navigate('/admin', { replace: true })
  }

  if (getAdminSession()) {
    return <Navigate to="/admin" replace />
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container-fluid page-content admin-login-wrap">
      <div className="login-card glass-card">
        <div className="login-header">
          <ShieldCheck size={26} />
          <h2>Admin access</h2>
        </div>
        <p>This is a local mock admin login for development only.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>Username</span>
            <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit" className="primary-button">
            Sign in <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </motion.div>
  )
}

function AdminPage() {
  const navigate = useNavigate()
  const { reviews, setReviews, mediaSubmissions, setMediaSubmissions } = useOutletContext<OutletContext>()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reviews' | 'photos' | 'media' | 'live-capture' | 'content'>('dashboard')
  const [reviewFilter, setReviewFilter] = useState<'all' | ReviewStatus>('all')
  const [reviewSearch, setReviewSearch] = useState('')
  const [contentDraft, setContentDraft] = useState(() => localStorageService.get('village-dhadheru:content', villageContent))
  const [captureTotals, setCaptureTotals] = useState({ photos: 0, audio: 0, activeSessions: 0 })
  const [selectedAdminPhoto, setSelectedAdminPhoto] = useState<{ image: string; name: string } | null>(null)

  useEffect(() => {
    let isCurrent = true
    void localMediaStorageService.getLibrary().then(({ sessions, media }) => {
      if (!isCurrent) return
      setCaptureTotals({
        photos: media.filter((item) => item.type === 'photo').length,
        audio: media.filter((item) => item.type === 'audio').length,
        activeSessions: sessions.filter((session) => !session.endedAt && session.consentStatus === 'granted').length,
      })
    }).catch(() => {
      if (isCurrent) setCaptureTotals({ photos: 0, audio: 0, activeSessions: 0 })
    })
    return () => { isCurrent = false }
  }, [])

  if (!getAdminSession()) {
    return <Navigate to="/admin/login" replace />
  }

  const photoItems = reviews.flatMap((review) =>
    review.imagePaths.map((image, index) => ({
      id: `${review.id}-${index}`,
      image,
      name: review.name,
      category: review.imageCategories?.[index] ?? review.category,
      reviewId: review.id,
      imageIndex: index,
    })),
  )

  const filteredReviews = reviews.filter((review) => {
    const matchesStatus = reviewFilter === 'all' || review.status === reviewFilter
    const matchesSearch =
      review.name.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      review.review.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      review.category.toLowerCase().includes(reviewSearch.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const dashboardCards = [
    { label: 'Total Users', value: 'Not tracked' },
    { label: 'Total Reviews', value: reviews.length },
    { label: 'Total Photos', value: photoItems.length + captureTotals.photos },
    { label: 'Total Audio Clips', value: captureTotals.audio },
    { label: 'Active Sessions', value: captureTotals.activeSessions },
  ]

  const handleStatus = (id: string, status: ReviewStatus) => {
    updateReviewStatus(id, status)
    setReviews((current) => current.map((review) => (review.id === id ? { ...review, status } : review)))
  }

  const handleDeleteReview = (id: string) => {
    deleteReview(id)
    setReviews((current) => current.filter((review) => review.id !== id))
  }

  const handleDeleteReviewPhoto = (reviewId: string, imageIndex: number) => {
    const review = reviews.find((item) => item.id === reviewId)
    if (!review) return
    const imagePaths = review.imagePaths.filter((_, index) => index !== imageIndex)
    const imageCategories = review.imageCategories?.filter((_, index) => index !== imageIndex)
    updateReviewPhotos(reviewId, imagePaths, imageCategories)
    setReviews((current) => current.map((item) => item.id === reviewId ? { ...item, imagePaths, imageCategories } : item))
    setSelectedAdminPhoto(null)
  }

  const handleDeleteMedia = (id: string) => {
    deleteMediaSubmission(id)
    setMediaSubmissions((current) => current.filter((item) => item.id !== id))
  }

  const handleExportCsv = () => {
    const csvContent = exportReviewsCsv(reviews)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'village-dhadheru-reviews.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const saveVillageContent = () => {
    localStorageService.set('village-dhadheru:content', contentDraft)
    navigate('/admin')
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container-fluid page-content admin-page">
      <div className="admin-header-row">
        <div>
          <span className="eyebrow">Admin dashboard</span>
          <h2>Village Dhadheru control center</h2>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            logoutAdmin()
            navigate('/admin/login', { replace: true })
          }}
        >
          Logout
        </button>
      </div>

      <div className="admin-tabs">
        {[
          ['dashboard', 'Dashboard'],
          ['reviews', 'Reviews'],
          ['photos', 'Photos'],
          ['media', 'Media'],
          ['live-capture', 'Live Capture Submissions'],
          ['content', 'Content'],
        ].map(([tab, label]) => (
          <button key={tab} type="button" className={activeTab === tab ? 'tab-button active' : 'tab-button'} onClick={() => setActiveTab(tab as typeof activeTab)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' ? (
        <div className="admin-section">
          <div className="metric-grid">
            {dashboardCards.map((card) => (
              <div key={card.label} className="metric-card glass-card">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>

          <div className="recent-panel glass-card">
            <div className="panel-head">
              <h3>Recent submissions</h3>
              <button type="button" className="secondary-button small-button" onClick={handleExportCsv}>
                <Download size={14} /> Export Reviews CSV
              </button>
            </div>
            <div className="recent-list">
              {reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="recent-item">
                  <div>
                    <strong>{review.name}</strong>
                    <span>{review.category}</span>
                  </div>
                  <small>{review.status}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'reviews' ? (
        <div className="admin-section">
          <div className="toolbar-row">
            <input
              type="text"
              value={reviewSearch}
              onChange={(event) => setReviewSearch(event.target.value)}
              placeholder="Search reviews"
            />
            <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as 'all' | ReviewStatus)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="review-table">
            {filteredReviews.map((review) => (
              <div key={review.id} className="admin-review-row glass-card">
                <div className="review-meta">
                  <strong>{review.name}</strong>
                  <span>{review.category}</span>
                </div>
                <p>{review.review}</p>
                <div className="review-meta-row">
                  <span>Rating: {review.rating}</span>
                  <span>{new Date(review.submittedAt).toLocaleDateString()}</span>
                </div>
                <div className="review-actions">
                  <button type="button" onClick={() => handleStatus(review.id, 'approved')}>Approve</button>
                  <button type="button" onClick={() => handleStatus(review.id, 'rejected')}>Reject</button>
                  <button type="button" className="danger" onClick={() => handleDeleteReview(review.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'photos' ? (
        <div className="admin-section">
          <div className="photo-grid">
            {photoItems.map((item) => (
              <div key={item.id} className="photo-card glass-card">
                <button type="button" className="admin-photo-preview" onClick={() => setSelectedAdminPhoto({ image: item.image, name: item.name })} aria-label={`Preview photo from ${item.name}`}>
                  <img src={item.image} alt={`Shared by ${item.name}`} loading="lazy" />
                </button>
                <div>
                  <strong>{item.name}</strong>
                  <label className="photo-category-field"><span>Category</span><select value={item.category} onChange={(event) => {
                    updateReviewPhotoCategory(item.reviewId, item.imageIndex, event.target.value)
                    setReviews((current) => current.map((review) => {
                      if (review.id !== item.reviewId) return review
                      const imageCategories = [...(review.imageCategories ?? review.imagePaths.map(() => review.category))]
                      imageCategories[item.imageIndex] = event.target.value
                      return { ...review, imageCategories }
                    }))
                  }} aria-label={`Category for ${item.name}'s photo`}>{['Village', 'Village Life', 'Rajasthan Landscape', 'Community', 'School', 'Healthcare', 'Temples', 'Roads & Infrastructure', 'Nature', 'Events', 'Other'].map((category) => <option key={category}>{category}</option>)}</select></label>
                </div>
                <button type="button" className="danger-button photo-delete-button" onClick={() => handleDeleteReviewPhoto(item.reviewId, item.imageIndex)}><Trash2 size={14} /> Delete</button>
              </div>
            ))}
          </div>
          {!photoItems.length ? <p className="empty-content-note">No community photos have been shared yet.</p> : null}
        </div>
      ) : null}

      <AnimatePresence>
        {selectedAdminPhoto ? (
          <motion.div className="lightbox-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedAdminPhoto(null)}>
            <motion.div className="lightbox admin-photo-lightbox" initial={{ scale: 0.97 }} animate={{ scale: 1 }} onClick={(event) => event.stopPropagation()}>
              <button type="button" className="lightbox-close" onClick={() => setSelectedAdminPhoto(null)} aria-label="Close photo preview"><X size={18} /></button>
              <img src={selectedAdminPhoto.image} alt={`Photo shared by ${selectedAdminPhoto.name}`} />
              <div className="lightbox-content"><strong>Shared by {selectedAdminPhoto.name}</strong></div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {activeTab === 'media' ? (
        <div className="admin-section media-list">
          {mediaSubmissions.map((media) => (
            <div key={media.id} className="media-card glass-card">
              <div className="media-head">
                <strong>{media.title}</strong>
                <span>{media.type}</span>
              </div>
              {media.type === 'video' ? (
                <video controls src={media.url} />
              ) : (
                <audio controls src={media.url} />
              )}
              <div className="media-actions">
                <a href={media.url} download target="_blank" rel="noreferrer">
                  <Download size={14} /> Download
                </a>
                <button type="button" className="danger" onClick={() => handleDeleteMedia(media.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'live-capture' ? <LiveCaptureSubmissions storage={localMediaStorageService} /> : null}

      {activeTab === 'content' ? (
        <div className="admin-section admin-content-editor">
          <label>
            <span>Intro</span>
            <textarea rows={4} value={contentDraft.intro} onChange={(event) => setContentDraft({ ...contentDraft, intro: event.target.value })} />
          </label>
          <label>
            <span>Location</span>
            <input value={contentDraft.location} onChange={(event) => setContentDraft({ ...contentDraft, location: event.target.value })} />
          </label>
          <label>
            <span>Community</span>
            <textarea rows={3} value={contentDraft.community} onChange={(event) => setContentDraft({ ...contentDraft, community: event.target.value })} />
          </label>
          <label>
            <span>Education</span>
            <textarea rows={3} value={contentDraft.education} onChange={(event) => setContentDraft({ ...contentDraft, education: event.target.value })} />
          </label>
          <label>
            <span>Healthcare</span>
            <textarea rows={3} value={contentDraft.healthcare} onChange={(event) => setContentDraft({ ...contentDraft, healthcare: event.target.value })} />
          </label>
          <label>
            <span>Religion</span>
            <textarea rows={3} value={contentDraft.religion} onChange={(event) => setContentDraft({ ...contentDraft, religion: event.target.value })} />
          </label>
          <button type="button" className="primary-button" onClick={saveVillageContent}>
            Save changes
          </button>
        </div>
      ) : null}
    </motion.div>
  )
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="section-header">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

export default App
