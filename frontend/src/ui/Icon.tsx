/**
 * FrameFlow Design System — unified Lucide icon.
 * Single stroke-based icon set (consistent weight, rounded caps) used across the
 * new DS surfaces. Curated map keeps bundle lean and names stable.
 */
import React from "react";
import {
  LayoutDashboard, FolderOpen, Folder, Plus, Settings, User, UploadCloud, Image as ImageIcon,
  FileText, Sparkles, ArrowLeft, ArrowRight, ChevronRight, ChevronDown, ChevronLeft, Check,
  X, Search, Trash2, Star, CircleAlert, Info, CreditCard, Palette, Lightbulb, Film, Clapperboard,
  Play, Clock, Users, Wallet, Camera, ListChecks, LayoutGrid, MoreVertical, Pencil, Copy, Archive,
  RefreshCw, Download, Eye, History, Wand2, Bell, LogOut, Globe, Moon, Sun, Monitor, TrendingUp,
} from "lucide-react-native";

const MAP: Record<string, any> = {
  dashboard: LayoutDashboard, "folder-open": FolderOpen, folder: Folder, plus: Plus, settings: Settings,
  user: User, users: Users, upload: UploadCloud, image: ImageIcon, "file-text": FileText, sparkles: Sparkles,
  "arrow-left": ArrowLeft, "arrow-right": ArrowRight, "chevron-right": ChevronRight, "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft, check: Check, x: X, search: Search, trash: Trash2, star: Star, alert: CircleAlert,
  info: Info, "credit-card": CreditCard, palette: Palette, bulb: Lightbulb, film: Film, clapperboard: Clapperboard,
  play: Play, clock: Clock, wallet: Wallet, camera: Camera, "list-checks": ListChecks, grid: LayoutGrid,
  more: MoreVertical, pencil: Pencil, copy: Copy, archive: Archive, refresh: RefreshCw, download: Download,
  eye: Eye, history: History, wand: Wand2, bell: Bell, logout: LogOut, globe: Globe, moon: Moon, sun: Sun,
  monitor: Monitor, trending: TrendingUp,
};

export type IconName = keyof typeof MAP | string;

export function Icon({ name, size = 20, color = "#111", strokeWidth = 1.75 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const Cmp = MAP[name] || CircleAlert;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
