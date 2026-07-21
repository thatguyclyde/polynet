import {
  Camera, Edit3, Info, Shield, Moon, Sun, ChevronRight, ArrowLeft,
  Check, X, Plus, Search, Home, User, Users, Heart, MessageCircle,
  Share2, Bookmark, Bell, Settings, LogOut, Trash2, Send, ImagePlus,
  MapPin, Calendar, ShoppingBag, Newspaper, Zap, Star, Flag,
  Globe, MessageSquare, Phone, Mail, Lock, Eye, EyeOff, ThumbsUp,
  MoreHorizontal, MoreVertical, ChevronLeft, ChevronDown, ChevronUp, TrendingUp,
  Filter, SlidersHorizontal, Store, UserCircle, Download // Added Store and UserCircle here
} from 'lucide-react'

// Custom brand icons — Lucide no longer ships these, so we draw them ourselves
function TikTokIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  )
}

function WhatsAppIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function SnapchatIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 0 1 5 5c0 2 0 4 1 5.5.6.9 1.5 1.3 2 1.5-.5.8-1.5 1-2.5 1.2.1.5.2 1.3-.3 1.8-.6.5-1.7.3-2.5.6-.7.3-1.2 1.4-2.7 1.4s-2-1.1-2.7-1.4c-.8-.3-1.9-.1-2.5-.6-.5-.5-.4-1.3-.3-1.8-1-.2-2-.4-2.5-1.2.5-.2 1.4-.6 2-1.5C7 11 7 9 7 7a5 5 0 0 1 5-5z" />
    </svg>
  )
}

function FacebookIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function InstagramIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function TwitterIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
    </svg>
  )
}

function LinkedinIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

function YoutubeIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  )
}

function GithubIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  )
}

const CUSTOM_ICONS = ['tiktok', 'whatsapp', 'snapchat', 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'github']

const ICONS = {
  camera: Camera,
  edit: Edit3,
  info: Info,
  shield: Shield,
  moon: Moon,
  sun: Sun,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  arrowLeft: ArrowLeft,
  check: Check,
  x: X,
  plus: Plus,
  search: Search,
  home: Home,
  user: User,
  userCircle: UserCircle, // Added UserCircle mapping
  users: Users,
  heart: Heart,
  comment: MessageCircle,
  share: Share2,
  'share-2': Share2,
  bookmark: Bookmark,
  download: Download,
  bell: Bell,
  settings: Settings,
  logout: LogOut,
  trash: Trash2,
  'trash-2': Trash2,
  send: Send,
  imagePlus: ImagePlus,
  mapPin: MapPin,
  calendar: Calendar,
  shoppingBag: ShoppingBag,
  store: Store,           // Added Store mapping
  news: Newspaper,
  zap: Zap,
  star: Star,
  flag: Flag,
  globe: Globe,
  message: MessageSquare,
  phone: Phone,
  mail: Mail,
  lock: Lock,
  eye: Eye,
  eyeOff: EyeOff,
  thumbsUp: ThumbsUp,
  more: MoreHorizontal,
  'ellipsis-vertical': MoreVertical,
  trendingUp: TrendingUp,
  filter: Filter,
  sliders: SlidersHorizontal,
  tiktok: TikTokIcon,
  whatsapp: WhatsAppIcon,
  snapchat: SnapchatIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  twitter: TwitterIcon,
  linkedin: LinkedinIcon,
  youtube: YoutubeIcon,
  github: GithubIcon,
}

function Icon({ name, size = 18, color = 'currentColor', strokeWidth }) {
  const IconComponent = ICONS[name]

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in Icon.jsx map`)
    return <div style={{ width: size, height: size, background: '#E2E0FF', borderRadius: '4px' }} />
  }

  if (CUSTOM_ICONS.includes(name)) {
    return <IconComponent size={size} color={color} />
  }

  return <IconComponent size={size} color={color} strokeWidth={strokeWidth || 2} />
}

export default Icon
