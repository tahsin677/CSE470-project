import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Award01Icon,
  BookOpen01Icon,
  Calendar03Icon,
  Cancel01Icon,
  ChampionIcon,
  ChartHistogramIcon,
  CheckmarkCircle02Icon,
  AssignmentsIcon,
  ChipIcon,
  DashboardSquare01Icon,
  Facebook01Icon,
  FavouriteIcon,
  File02Icon,
  FolderOpenIcon,
  GithubIcon,
  GraduateMaleIcon,
  InstagramIcon,
  Logout01Icon,
  Mail01Icon,
  Menu01Icon,
  Message01Icon,
  NewTwitterIcon,
  Notification03Icon,
  NotificationSquareIcon,
  PenTool01Icon,
  ProgressIcon,
  PlayIcon,
  Search01Icon,
  SendIcon,
  Settings01Icon,
  SparklesIcon,
  StarIcon,
  ToolsIcon,
  UserCheck01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons'

function make(icon) {
  function Icon({ size = 20, color = 'currentColor', fill, className, strokeWidth = 1.5 }) {
    const tone = fill && fill !== 'none' && fill !== 'currentColor' ? fill : color
    return (
      <HugeiconsIcon
        icon={icon}
        size={size}
        color={tone}
        strokeWidth={strokeWidth}
        className={className}
      />
    )
  }
  return Icon
}

export const Add = make(Add01Icon)
export const ArrowDown = make(ArrowDown01Icon)
export const ArrowLeft = make(ArrowLeft01Icon)
export const ArrowRight = make(ArrowRight01Icon)
export const ArrowUp = make(ArrowUp01Icon)
export const Award = make(Award01Icon)
export const BarChart3 = make(ChartHistogramIcon)
export const Bell = make(Notification03Icon)
export const BookOpen = make(BookOpen01Icon)
export const CalendarDays = make(Calendar03Icon)
export const CheckCircle2 = make(CheckmarkCircle02Icon)
export const Chip = make(ChipIcon)
export const ChevronDown = make(ArrowDown01Icon)
export const ChevronLeft = make(ArrowLeft01Icon)
export const ChevronRight = make(ArrowRight01Icon)
export const ChevronUp = make(ArrowUp01Icon)
export const ClipboardList = make(AssignmentsIcon)
export const Facebook = make(Facebook01Icon)
export const FileText = make(File02Icon)
export const FolderOpen = make(FolderOpenIcon)
export const Github = make(GithubIcon)
export const GraduationCap = make(GraduateMaleIcon)
export const Heart = make(FavouriteIcon)
export const Instagram = make(InstagramIcon)
export const LayoutDashboard = make(DashboardSquare01Icon)
export const LogOut = make(Logout01Icon)
export const Mail = make(Mail01Icon)
export const Menu = make(Menu01Icon)
export const MessageSquare = make(Message01Icon)
export const PenTool = make(PenTool01Icon)
export const NotificationInbox = make(NotificationSquareIcon)
export const Play = make(PlayIcon)
export const Plus = make(Add01Icon)
export const Progress = make(ProgressIcon)
export const Search = make(Search01Icon)
export const Send = make(SendIcon)
export const Settings = make(Settings01Icon)
export const Sparkles = make(SparklesIcon)
export const Star = make(StarIcon)
export const Tools = make(ToolsIcon)
export const Trophy = make(ChampionIcon)
export const Twitter = make(NewTwitterIcon)
export const UserCheck = make(UserCheck01Icon)
export const Users = make(UserGroupIcon)
export const X = make(Cancel01Icon)
