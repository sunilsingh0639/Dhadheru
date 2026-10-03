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
  //Camera,
  Check,
  Construction,
  ChevronRight,
  Download,
  HeartHandshake,
  Home,
  Images,
  Info,
  //LogIn,
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
import { useTranslation, type TranslationKey } from './i18n'

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
  { key: 'nav.home', path: '/', icon: Home },
  { key: 'nav.about', path: '/about', icon: Info },
  { key: 'nav.places', path: '/places', icon: MapPin },
  { key: 'nav.gallery', path: '/gallery', icon: Images },
  { key: 'nav.community', path: '/community', icon: Users },
  { key: 'nav.reviews', path: '/reviews', icon: Star },
] as const

const communityIcons = [Home, Users, BookOpen, Stethoscope, HeartHandshake, CalendarDays, Wheat, Construction]

const placeTitleKeys: Record<string, TranslationKey> = {
  'village-dhadheru': 'stats.villageValue',
  'gram-panchayat': 'places.categoryPanchayat',
  'primary-health-centre': 'places.categoryHealth',
}
const placeDescriptionKeys: Record<string, TranslationKey> = {
  'village-dhadheru': 'places.home',
  'gram-panchayat': 'places.panchayat',
  'primary-health-centre': 'places.health',
}
const placeCategoryKeys: Record<string, TranslationKey> = {
  'village-dhadheru': 'places.categoryVillage',
  'gram-panchayat': 'places.categoryPanchayat',
  'primary-health-centre': 'places.categoryHealth',
}
const placeLocationKeys: Record<string, TranslationKey> = {
  'village-dhadheru': 'places.locationVillage',
  'gram-panchayat': 'places.locationPanchayat',
  'primary-health-centre': 'places.locationHealth',
}
const placePhotoKeys: Record<string, TranslationKey> = {
  'village-dhadheru': 'gallery.placeholderVillage',
  'gram-panchayat': 'gallery.placeholderCommunity',
  'primary-health-centre': 'gallery.placeholderHealth',
}
const galleryTitleKeys: Record<string, TranslationKey> = {
  'gallery-village': 'gallery.placeholderVillage',
  'gallery-life': 'gallery.placeholderLife',
  'gallery-rajasthan': 'gallery.placeholderLandscape',
  'gallery-community': 'gallery.placeholderCommunity',
  'gallery-school': 'gallery.placeholderSchool',
  'gallery-healthcare': 'gallery.placeholderHealth',
  'gallery-temples': 'gallery.placeholderTemples',
  'gallery-infrastructure': 'gallery.placeholderInfrastructure',
  'gallery-nature': 'gallery.placeholderNature',
  'gallery-events': 'gallery.placeholderEvents',
}
const galleryCategoryKeys: Record<GalleryItem['category'], TranslationKey> = {
  Village: 'gallery.village',
  'Village Life': 'gallery.life',
  'Rajasthan Landscape': 'gallery.landscape',
  Community: 'gallery.community',
  School: 'gallery.school',
  Healthcare: 'gallery.health',
  Temples: 'gallery.temples',
  'Roads & Infrastructure': 'gallery.infrastructure',
  Nature: 'gallery.nature',
  Events: 'gallery.events',
  Other: 'gallery.other',
}
const communityTitleKeys: Record<string, TranslationKey> = {
  'village-life': 'community.villageLife',
  community: 'community.people',
  education: 'community.education',
  healthcare: 'community.health',
  culture: 'community.culture',
  festivals: 'community.festivals',
  agriculture: 'community.agriculture',
  development: 'community.development',
}
const communityDescriptionKeys: Record<string, TranslationKey> = {
  'village-life': 'community.villageLifeText',
  community: 'community.peopleText',
  education: 'community.educationText',
  healthcare: 'community.healthText',
  culture: 'community.cultureText',
  festivals: 'community.festivalsText',
  agriculture: 'community.agricultureText',
  development: 'community.developmentText',
}
const reviewCategoryOptions: { value: string; key: TranslationKey }[] = [
  { value: 'Village', key: 'gallery.village' },
  { value: 'School', key: 'gallery.school' },
  { value: 'Hospital', key: 'gallery.health' },
  { value: 'Temple', key: 'gallery.temples' },
  { value: 'Nature', key: 'gallery.nature' },
  { value: 'Events', key: 'gallery.events' },
  { value: 'Community', key: 'gallery.community' },
  { value: 'Other', key: 'gallery.other' },
]
const adminPhotoCategoryOptions = [
  ...reviewCategoryOptions,
  { value: 'Village Life', key: 'gallery.life' as const },
  { value: 'Rajasthan Landscape', key: 'gallery.landscape' as const },
  { value: 'Roads & Infrastructure', key: 'gallery.infrastructure' as const },
  { value: 'Temples', key: 'gallery.temples' as const },
]
const translateCategory = (category: string, t: (key: TranslationKey) => string) => {
  const match = adminPhotoCategoryOptions.find((option) => option.value === category)
  return match ? t(match.key) : category
}

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
  const { t } = useTranslation()
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
        title: t(placeTitleKeys[place.id]),
        description: t(placeDescriptionKeys[place.id]),
        category: t(placeCategoryKeys[place.id]),
        href: '/places',
      })),
      ...galleryItems.map((item) => ({
        title: t(galleryTitleKeys[item.id]),
        description: t('gallery.replaceImage'),
        category: t(galleryCategoryKeys[item.category]),
        href: '/gallery',
      })),
      ...communityTopics.map((item) => ({
        title: t(communityTitleKeys[item.id]),
        description: t(communityDescriptionKeys[item.id]),
        category: t('nav.community'),
        href: '/community',
      })),
      ...reviews.map((review) => ({
        title: review.name,
        description: review.review,
        category: t('nav.reviews'),
        href: '/reviews',
      })),
    ]

    return items.filter((item) => {
      const haystack = `${item.title} ${item.description} ${item.category}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [reviews, searchValue, t])

  return (
    <>
      <header className={`${hasScrolled ? 'site-header scrolled' : 'site-header'}${location.pathname === '/' ? ' home-header' : ''}`}>
        <nav className="navbar container-fluid">
          <Link to="/" className="brand-logo" aria-label={t('nav.home')}>
            <span className="brand-mark" aria-hidden="true">ढ</span>
            <span className="brand-copy"><strong>{t('brand.name')}</strong><small>{t('brand.tagline')}</small></span>
          </Link>

          <div className="nav-desktop">
            {navItems.map(({ key, path, icon: Icon }) => (
              <NavLink key={path} to={path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Icon size={16} />
                {t(key)}
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
                  placeholder={t('search.placeholder')}
                  aria-label={t('common.search')}
                  autoFocus
                />
                <button type="button" className="search-close" onClick={() => { setSearchOpen(false); setSearchValue('') }} aria-label={t('nav.closeSearch')}>
                  <X size={16} />
                </button>
                {searchValue ? (
                <div className="search-results">
                  <div className="search-results-heading">{t('search.heading')}</div>
                  {searchResults.length ? (
                    searchResults.slice(0, 5).map((result, index) => (
                      <Link key={`${result.title}-${index}`} to={result.href} className="search-result-item">
                        <span className="search-pill">{result.category}</span>
                        <strong>{result.title}</strong>
                        <small>{result.description}</small>
                      </Link>
                    ))
                  ) : (
                    <div className="empty-search">{t('search.noResults')}</div>
                  )}
                </div>
                ) : null}
              </div>
            ) : (
              <button type="button" className="search-toggle" onClick={() => setSearchOpen(true)} aria-label={t('nav.openSearch')}>
                <Search size={19} />
              </button>
            )}

            {/* <NavLink to="/share-experience" className="nav-share-cta">
              {t('nav.share')} <ArrowRight size={15} />
            </NavLink> */}

            <LanguageSwitcher />
            <button type="button" className="menu-toggle" aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')} aria-expanded={menuOpen} onClick={() => setOpenMenuPath(menuOpen ? null : location.pathname)}>
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
              {navItems.map(({ key, path, icon: Icon }) => (
                <NavLink key={path} to={path} className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
                  <Icon size={16} />
                  {t(key)}
                </NavLink>
              ))}
              {/* <NavLink to="/share-experience" className="mobile-nav-link mobile-share-link">
                <Camera size={16} /> {t('nav.share')}
              </NavLink>
              <NavLink to="/admin/login" className="mobile-nav-link admin">
                <LogIn size={16} /> {t('nav.admin')}
              </NavLink> */}
              <LanguageSwitcher />
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
            <h3>{t('brand.name')}</h3>
            <p>{t('footer.tagline')}</p>
          </div>
          <div>
            <h4>{t('footer.explore')}</h4>
            <ul>
              <li>
                <Link to="/about">{t('footer.about')}</Link>
              </li>
              <li>
                <Link to="/places">{t('footer.places')}</Link>
              </li>
              <li>
                <Link to="/gallery">{t('footer.gallery')}</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>{t('footer.community')}</h4>
            <ul>
              <li>
                <Link to="/reviews">{t('footer.reviews')}</Link>
              </li>
              <li>
                <Link to="/share-experience">{t('footer.share')}</Link>
              </li>
              <li>
                <Link to="/admin/login">{t('footer.admin')}</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">{t('footer.copyright')}</div>
      </footer>

      <button type="button" className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <ChevronRight size={16} />
      </button>
    </>
  )
}

function HomePage({ reviews }: { reviews: Review[] }) {
  const { t } = useTranslation()
  const approvedReviews = reviews.filter((review) => review.status === 'approved')

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
      <section className="hero-section container-fluid">
        <div className="hero-content">
          <motion.span className="eyebrow" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {t('hero.eyebrow')}
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            {t('hero.title')}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            {t('hero.subtitle')}
          </motion.p>

          <motion.div className="hero-actions" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Link to="/about" className="primary-button">
              {t('hero.explore')} <ArrowRight size={18} />
            </Link>
            <Link to="/share-experience" className="secondary-button">
              {t('hero.share')}
            </Link>
          </motion.div>

          <div className="hero-location"><MapPin size={16} /> {t('hero.location')}</div>
        </div>

        <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }}>
          <PhotoPlaceholder label={t('gallery.placeholderVillage')} featured />
          <div className="hero-image-caption"><span>{t('hero.photoWelcome')}</span><strong>{t('hero.photoCaption')}</strong></div>
          <span className="hero-image-credit">{t('hero.photoCredit')}</span>
        </motion.div>
      </section>

      <section className="stats-strip container-fluid">
        {stats.map((stat, index) => (
          <div key={stat.label} className={`stat-card ${stat.accent}`}>
            <strong>{t((['stats.villageValue', 'stats.tehsilValue', 'stats.districtValue', 'stats.stateValue'] as const)[index])}</strong>
            <span>{t((['stats.village', 'stats.tehsil', 'stats.district', 'stats.state'] as const)[index])}</span>
          </div>
        ))}
      </section>

      <section className="section-block container-fluid">
        <SectionHeader
          eyebrow={t('about.eyebrow')}
          title={t('about.title')}
          description={t('about.subtitle')}
        />

        <div className="content-grid about-grid">
          <div className="info-panel">
            <h3>{t('about.intro')}</h3>
            <p>{t('about.body')}</p>
            <div className="feature-list">
              <div>
                <strong>{t('about.location')}</strong>
                <span>{t('places.locationVillage')}</span>
              </div>
              <div>
                <strong>{t('about.community')}</strong>
                <span>{t('about.communityText')}</span>
              </div>
              <div>
                <strong>{t('about.culture')}</strong>
                <span>{t('about.cultureText')}</span>
              </div>
            </div>
          </div>

          <div className="mini-card-grid">
            {[
              { icon: Building2, label: t('about.education'), text: t('about.educationText') },
              { icon: Stethoscope, label: t('about.healthcare'), text: t('about.healthcareText') },
              { icon: Sparkles, label: t('about.community'), text: t('about.communityText') },
              { icon: HeartHandshake, label: t('about.culture'), text: t('about.cultureText') },
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
          eyebrow={t('places.eyebrow')}
          title={t('places.title')}
          description={t('places.subtitle')}
        />

        <div className="place-grid">
          {places.map((place) => (
            <motion.article key={place.id} className="place-card" whileHover={{ y: -6 }}>
              {place.image ? <img src={place.image} alt={t(placeTitleKeys[place.id])} loading="lazy" /> : <PhotoPlaceholder label={t(placePhotoKeys[place.id])} />}
              <div className="place-card-body">
                <span className="badge">{t(placeCategoryKeys[place.id])}</span>
                <h3>{t(placeTitleKeys[place.id])}</h3>
                <p>{t(placeDescriptionKeys[place.id])}</p>
                <div className="place-meta">
                  <MapPin size={14} />
                  <span>{t(placeLocationKeys[place.id])}</span>
                </div>
                <Link to="/places" className="text-button">
                  {t('common.viewDetails')} <ArrowRight size={16} />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="section-block container-fluid">
        <SectionHeader
          eyebrow={t('gallery.eyebrow')}
          title={t('gallery.title')}
          description={t('gallery.subtitle')}
        />

        <div className="gallery-mini-grid">
          {galleryItems.slice(0, 4).map((item) => (
            <div key={item.id} className="gallery-tile">
              {item.image ? <img src={item.image} alt={t(galleryTitleKeys[item.id])} loading="lazy" /> : <PhotoPlaceholder label={t(galleryTitleKeys[item.id])} />}
              <div className="gallery-overlay">
                <span>{t(galleryCategoryKeys[item.category])}</span>
                <strong>{t(galleryTitleKeys[item.id])}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block container-fluid review-highlight">
        <SectionHeader
          eyebrow={t('reviews.eyebrow')}
          title={t('reviews.title')}
          description={t('reviews.subtitle')}
        />

        <div className="review-grid">
          {approvedReviews.slice(0, 3).map((review) => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div>
                  <strong>{review.name}</strong>
                  <span>{translateCategory(review.category, t)}</span>
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
          {!approvedReviews.length ? <p className="empty-content-note">{t('reviews.empty')}</p> : null}
        </div>
      </section>
    </motion.div>
  )
}

function AboutPage() {
  const { t } = useTranslation()
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container-fluid page-content">
      <SectionHeader
        eyebrow={t('about.eyebrow')}
        title={t('about.title')}
        description={t('about.subtitle')}
      />

      <div className="about-story">
        <div className="story-visual">
          <PhotoPlaceholder label={t('gallery.placeholderVillage')} featured />
        </div>
        <div className="story-copy">
          <h3>{t('about.intro')}</h3>
          <p>{t('about.body')}</p>
          <div className="split-list">
            <div>
              <h4>{t('about.location')}</h4>
              <p>{t('places.locationVillage')}</p>
            </div>
            <div>
              <h4>{t('about.community')}</h4>
              <p>{t('about.communityText')}</p>
            </div>
            <div>
              <h4>{t('about.education')}</h4>
              <p>{t('about.educationText')}</p>
            </div>
            <div>
              <h4>{t('about.healthcare')}</h4>
              <p>{t('about.healthcareText')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="info-card-grid">
        {[
          { title: t('about.location'), text: t('places.locationVillage'), icon: MapPin },
          { title: t('about.religion'), text: t('about.religionText'), icon: Sparkles },
          { title: t('about.culture'), text: t('about.cultureText'), icon: HeartHandshake },
          { title: t('about.highlights'), text: t('about.highlightsText'), icon: BadgeCheck },
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
  const { t } = useTranslation()
  return (
    <section id="community" className={compact ? 'section-block container-fluid community-section compact' : 'section-block community-section'}>
      <SectionHeader
        eyebrow={t('community.eyebrow')}
        title={t('community.title')}
        description={t('community.subtitle')}
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
              <h3>{t(communityTitleKeys[topic.id])}</h3>
              <p>{t(communityDescriptionKeys[topic.id])}</p>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}

function PhotoPlaceholder({ label, featured = false }: { label: string; featured?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className={featured ? 'photo-placeholder featured' : 'photo-placeholder'} role="img" aria-label={label}>
      <div className="placeholder-sun" />
      <div className="placeholder-ridge ridge-back" />
      <div className="placeholder-ridge ridge-front" />
      <div className="placeholder-label">
        <MapPin size={16} />
        <span>{t('gallery.eyebrow')}</span>
        <strong>{label}</strong>
        <small>{t('gallery.replaceImage')}</small>
      </div>
    </div>
  )
}

function PlacesPage() {
  const { t } = useTranslation()
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container-fluid page-content">
      <SectionHeader
        eyebrow={t('places.eyebrow')}
        title={t('places.title')}
        description={t('places.subtitle')}
      />

      <div className="place-grid large">
        {places.map((place) => (
          <article key={place.id} className="place-card place-card-large">
            {place.image ? <img src={place.image} alt={t(placeTitleKeys[place.id])} loading="lazy" /> : <PhotoPlaceholder label={t(placePhotoKeys[place.id])} />}
            <div className="place-card-body">
              <span className="badge">{t(placeCategoryKeys[place.id])}</span>
              <h3>{t(placeTitleKeys[place.id])}</h3>
              <p>{t(placeDescriptionKeys[place.id])}</p>
              <div className="place-meta">
                <MapPin size={14} />
                <span>{t(placeLocationKeys[place.id])}</span>
              </div>
              <span className="place-verification-note">{t('places.confirming')}</span>
            </div>
          </article>
        ))}
      </div>
    </motion.div>
  )
}

function GalleryPage() {
  const { t } = useTranslation()
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
        eyebrow={t('gallery.eyebrow')}
        title={t('gallery.title')}
        description={t('gallery.subtitle')}
      />

      <div className="category-filter">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={activeCategory === category ? 'filter-chip active' : 'filter-chip'}
            onClick={() => { setActiveCategory(category); setSelectedIndex(null) }}
          >
            {t(category === 'All' ? 'gallery.all' : galleryCategoryKeys[category])}
          </button>
        ))}
      </div>

      <div className="gallery-grid">
        {filteredItems.map((item, index) => (
          <button key={item.id} type="button" className={index % 7 === 0 ? 'gallery-item featured' : 'gallery-item'} onClick={() => openImage(index)}>
            {item.image ? <img src={item.image} alt={t(galleryTitleKeys[item.id])} loading="lazy" /> : <PhotoPlaceholder label={t(galleryTitleKeys[item.id])} />}
            <span className="gallery-item-meta">
              <small>{t(galleryCategoryKeys[item.category])}</small>
              <strong>{t(galleryTitleKeys[item.id])}</strong>
            </span>
          </button>
        ))}
        {!filteredItems.length ? <p className="empty-content-note">{t('gallery.emptyCategory')}</p> : null}
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
              <button type="button" className="lightbox-close" onClick={closeImage} aria-label={t('gallery.close')}>
                <X size={18} />
              </button>
              {currentImage.image ? <img src={currentImage.image} alt={t(galleryTitleKeys[currentImage.id])} /> : <PhotoPlaceholder label={t(galleryTitleKeys[currentImage.id])} featured />}
              <div className="lightbox-content">
                <span>{t(galleryCategoryKeys[currentImage.category])}</span>
                <h3>{t(galleryTitleKeys[currentImage.id])}</h3>
                <p>{t('gallery.replaceImage')}</p>
              </div>
              <div className="lightbox-controls">
                <button type="button" onClick={showPrevious}>{t('gallery.previous')}</button>
                <button type="button" onClick={showNext}>{t('gallery.next')}</button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

function ReviewsPage() {
  const { t, formatDate, formatNumber } = useTranslation()
  const { reviews } = useOutletContext<OutletContext>()
  const approvedReviews = reviews.filter((item) => item.status === 'approved')
  const averageRating = approvedReviews.length
    ? approvedReviews.reduce((sum, item) => sum + item.rating, 0) / approvedReviews.length
    : 0

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container-fluid page-content">
      <SectionHeader
        eyebrow={t('reviews.eyebrow')}
        title={t('reviews.title')}
        description={t('reviews.subtitle')}
      />

      <div className="review-summary">
        <div className="summary-card">
          <span>{t('reviews.total')}</span>
          <strong>{formatNumber(approvedReviews.length)}</strong>
        </div>
        <div className="summary-card">
          <span>{t('reviews.average')}</span>
          <strong>{formatNumber(Number(averageRating.toFixed(1)))}</strong>
        </div>
        <div className="summary-card">
          <span>{t('reviews.approved')}</span>
          <strong>{formatNumber(approvedReviews.length)}</strong>
        </div>
      </div>

      <div className="review-list">
        {approvedReviews.map((review) => (
          <article key={review.id} className="review-card large">
            <div className="review-header">
              <div>
                <span className="review-avatar" aria-hidden="true">{review.name.trim().slice(0, 1).toUpperCase()}</span>
                <div><strong>{review.name}</strong>
                <span>{translateCategory(review.category, t)}</span>
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
              <small>{formatDate(review.submittedAt)}</small>
              <span className="review-approved-label"><BadgeCheck size={14} /> {t('reviews.approvedBadge')}</span>
            </div>
          </article>
        ))}
        {!approvedReviews.length ? <p className="empty-content-note">{t('reviews.empty')}</p> : null}
      </div>
    </motion.div>
  )
}

function ShareExperiencePage() {
  const { t } = useTranslation()
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
      notify(t('form.photoLimitTitle'), t('form.photoLimitMessage'))
    }
    setSelectedFiles(validFiles)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name.trim()) {
      notify(t('form.missingNameTitle'), t('form.missingNameMessage'))
      return
    }

    if (!form.review.trim() || form.review.trim().length < 15) {
      notify(t('form.shortReviewTitle'), t('form.shortReviewMessage'))
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
      notify(t('form.photoFailedTitle'), t('form.photoFailedMessage'))
      return
    }

    setReviews((current) => [result, ...current])
    notify(t('form.reviewSubmittedTitle'), t('form.reviewSubmittedMessage'))
    setForm({ name: '', email: '', phone: '', review: '', category: 'Community', rating: 5 })
    setSelectedFiles([])
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="container-fluid page-content">
      <SectionHeader
        eyebrow={t('share.eyebrow')}
        title={t('share.title')}
        description={t('share.subtitle')}
      />

      <div className="share-layout">
        <form className="experience-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              <span>{t('form.name')}</span>
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
            </label>
            <label>
              <span>{t('form.emailMobile')}</span>
              <input value={form.email} onChange={(event) => updateField('email', event.target.value)} />
            </label>
          </div>

          <label>
            <span>{t('form.review')}</span>
            <textarea
              rows={6}
              value={form.review}
              onChange={(event) => updateField('review', event.target.value)}
              maxLength={500}
              placeholder={t('form.reviewPlaceholder')}
            />
          </label>

          <div className="meta-row">
            <label>
              <span>{t('form.category')}</span>
              <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                {reviewCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.key)}
                  </option>
                ))}
              </select>
            </label>

            <div className="rating-block">
              <span>{t('form.rating')}</span>
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
            <label className="upload-label" htmlFor="review-photo-upload">
              <UploadCloud size={18} />
              {t('form.uploadPhotos')}
            </label>
            <input id="review-photo-upload" className="review-photo-input" type="file" accept="image/*" multiple onChange={handleFileChange} />
          </div>

          {previewUrls.length ? (
            <div className="preview-grid">
              {previewUrls.map((url, index) => (
                <img key={`${url}-${index}`} src={url} alt={t('form.uploadPhotos')} />
              ))}
            </div>
          ) : null}

          <div className="form-actions">
            <button type="submit" className="primary-button">
              {t('form.submitReview')} <ArrowRight size={16} />
            </button>
          </div>
        </form>

      </div>
    </motion.div>
  )
}

function AdminLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const valid = loginAdmin(form.username, form.password)

    if (!valid) {
      setError(t('admin.invalidCredentials'))
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
          <h2>{t('admin.login')}</h2>
        </div>
        <p>{t('admin.mockNotice')}</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>{t('admin.username')}</span>
            <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
          </label>
          <label>
            <span>{t('admin.password')}</span>
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit" className="primary-button">
            {t('admin.signIn')} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </motion.div>
  )
}

function AdminPage() {
  const { t, formatNumber, formatDate } = useTranslation()
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
    { label: t('admin.users'), value: t('admin.notTracked') },
    { label: t('admin.totalReviews'), value: formatNumber(reviews.length) },
    { label: t('admin.totalPhotos'), value: formatNumber(photoItems.length + captureTotals.photos) },
    { label: t('admin.audioClips'), value: formatNumber(captureTotals.audio) },
    { label: t('admin.activeSessions'), value: formatNumber(captureTotals.activeSessions) },
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
          <span className="eyebrow">{t('admin.eyebrow')}</span>
          <h2>{t('admin.title')}</h2>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            logoutAdmin()
            navigate('/admin/login', { replace: true })
          }}
        >
          {t('admin.logout')}
        </button>
      </div>

      <div className="admin-tabs">
        {[
          ['dashboard', t('admin.dashboard')],
          ['reviews', t('admin.reviews')],
          ['photos', t('admin.photos')],
          ['media', t('admin.media')],
          ['live-capture', t('admin.liveCapture')],
          ['content', t('admin.content')],
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
              <h3>{t('admin.recent')}</h3>
              <button type="button" className="secondary-button small-button" onClick={handleExportCsv}>
                <Download size={14} /> {t('admin.exportCsv')}
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
              placeholder={t('admin.searchReviews')}
            />
            <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as 'all' | ReviewStatus)}>
              <option value="all">{t('admin.all')}</option>
              <option value="pending">{t('status.pending')}</option>
              <option value="approved">{t('status.approved')}</option>
              <option value="rejected">{t('status.rejected')}</option>
            </select>
          </div>

          <div className="review-table">
            {filteredReviews.map((review) => (
              <div key={review.id} className="admin-review-row glass-card">
                <div className="review-meta">
                  <strong>{review.name}</strong>
                  <span>{translateCategory(review.category, t)}</span>
                </div>
                <p>{review.review}</p>
                <div className="review-meta-row">
                  <span>Rating: {review.rating}</span>
                  <span>{formatDate(review.submittedAt)}</span>
                </div>
                <div className="review-actions">
                  <button type="button" onClick={() => handleStatus(review.id, 'approved')}>{t('admin.approve')}</button>
                  <button type="button" onClick={() => handleStatus(review.id, 'rejected')}>{t('admin.reject')}</button>
                  <button type="button" className="danger" onClick={() => handleDeleteReview(review.id)}>
                    <Trash2 size={14} /> {t('common.delete')}
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
                <button type="button" className="admin-photo-preview" onClick={() => setSelectedAdminPhoto({ image: item.image, name: item.name })} aria-label={t('admin.previewPhoto')}>
                  <img src={item.image} alt={t('admin.previewPhoto')} loading="lazy" />
                </button>
                <div>
                  <strong>{item.name}</strong>
                  <label className="photo-category-field"><span>{t('admin.category')}</span><select value={item.category} onChange={(event) => {
                    updateReviewPhotoCategory(item.reviewId, item.imageIndex, event.target.value)
                    setReviews((current) => current.map((review) => {
                      if (review.id !== item.reviewId) return review
                      const imageCategories = [...(review.imageCategories ?? review.imagePaths.map(() => review.category))]
                      imageCategories[item.imageIndex] = event.target.value
                      return { ...review, imageCategories }
                    }))
                  }} aria-label={t('admin.category')}>{adminPhotoCategoryOptions.map((option) => <option key={option.value} value={option.value}>{t(option.key)}</option>)}</select></label>
                </div>
                <button type="button" className="danger-button photo-delete-button" onClick={() => handleDeleteReviewPhoto(item.reviewId, item.imageIndex)}><Trash2 size={14} /> {t('common.delete')}</button>
              </div>
            ))}
          </div>
          {!photoItems.length ? <p className="empty-content-note">{t('admin.photoEmpty')}</p> : null}
        </div>
      ) : null}

      <AnimatePresence>
        {selectedAdminPhoto ? (
          <motion.div className="lightbox-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedAdminPhoto(null)}>
            <motion.div className="lightbox admin-photo-lightbox" initial={{ scale: 0.97 }} animate={{ scale: 1 }} onClick={(event) => event.stopPropagation()}>
              <button type="button" className="lightbox-close" onClick={() => setSelectedAdminPhoto(null)} aria-label={t('gallery.close')}><X size={18} /></button>
              <img src={selectedAdminPhoto.image} alt={`${t('admin.previewPhoto')} ${selectedAdminPhoto.name}`} />
              <div className="lightbox-content"><strong>{t('admin.previewPhoto')} · {selectedAdminPhoto.name}</strong></div>
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
                  <Download size={14} /> {t('admin.download')}
                </a>
                <button type="button" className="danger" onClick={() => handleDeleteMedia(media.id)}>
                  <Trash2 size={14} /> {t('common.delete')}
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
            <span>{t('about.intro')}</span>
            <textarea rows={4} value={contentDraft.intro} onChange={(event) => setContentDraft({ ...contentDraft, intro: event.target.value })} />
          </label>
          <label>
            <span>{t('about.location')}</span>
            <input value={contentDraft.location} onChange={(event) => setContentDraft({ ...contentDraft, location: event.target.value })} />
          </label>
          <label>
            <span>{t('about.community')}</span>
            <textarea rows={3} value={contentDraft.community} onChange={(event) => setContentDraft({ ...contentDraft, community: event.target.value })} />
          </label>
          <label>
            <span>{t('about.education')}</span>
            <textarea rows={3} value={contentDraft.education} onChange={(event) => setContentDraft({ ...contentDraft, education: event.target.value })} />
          </label>
          <label>
            <span>{t('about.healthcare')}</span>
            <textarea rows={3} value={contentDraft.healthcare} onChange={(event) => setContentDraft({ ...contentDraft, healthcare: event.target.value })} />
          </label>
          <label>
            <span>{t('about.religion')}</span>
            <textarea rows={3} value={contentDraft.religion} onChange={(event) => setContentDraft({ ...contentDraft, religion: event.target.value })} />
          </label>
          <button type="button" className="primary-button" onClick={saveVillageContent}>
            {t('admin.saved')}
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

function LanguageSwitcher() {
  const { language, setLanguage, t } = useTranslation()
  return (
    <div className="language-switcher" role="group" aria-label={t('nav.language')}>
      <button type="button" className={language === 'hi' ? 'active' : ''} aria-pressed={language === 'hi'} onClick={() => setLanguage('hi')}>
        <span aria-hidden="true">🇮🇳</span> हिन्दी
      </button>
      <button type="button" className={language === 'en' ? 'active' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>
        English
      </button>
    </div>
  )
}

export default App
