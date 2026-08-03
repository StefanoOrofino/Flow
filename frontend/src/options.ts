export const VIDEO_TYPES = ["Commercial", "Corporate video", "Social media advertisement", "Product video",
  "Music video", "Short film", "Documentary", "Interview", "Event video", "Tutorial", "Custom"];
export const PLATFORMS = ["Television", "YouTube", "Instagram", "TikTok", "LinkedIn", "Website", "Cinema",
  "Internal corporate use", "Other"];
export const DURATIONS = ["15 seconds", "30 seconds", "60 seconds", "90 seconds", "2 minutes", "3 minutes",
  "5 minutes", "Custom"];
export const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:5", "2.39:1"];
export const CREW_SIZES = ["Solo / run-and-gun", "Simple social production", "Small professional crew",
  "Commercial production", "High-end cinematic production"];
export const VISUAL_STYLES = ["Cinematic", "Commercial", "Documentary", "Luxury", "Minimal", "Energetic",
  "Natural", "Futuristic", "Vintage", "Fashion", "Corporate", "User-defined"];
export const MOODS = ["Emotional", "Inspirational", "Informative", "Humorous", "Dramatic", "Premium",
  "Authentic", "Dynamic", "Intimate"];
export const CAMERA_STYLES = ["Steady & composed", "Handheld & raw", "Sweeping & dynamic", "Locked-off & formal",
  "Gimbal flow", "Drone & aerial", "Mixed"];
export const LIGHTING_STYLES = ["Natural", "High-key", "Low-key / moody", "Soft & flattering", "Hard & dramatic",
  "Neon / practicals", "Golden hour"];
export const EDITING_STYLES = ["Rhythmic", "Fast-cut", "Slow & meditative", "Seamless / invisible", "Montage",
  "Match-cut driven"];
export const MUSIC_STYLES = ["Ambient score", "Orchestral", "Electronic", "Hip-hop / trap", "Acoustic",
  "Corporate uplifting", "Licensed track", "No music"];
export const SHOT_SIZES = ["Extreme wide shot", "Wide shot", "Full shot", "Medium shot", "Medium close-up",
  "Close-up", "Extreme close-up", "Insert shot", "Detail shot", "Over-the-shoulder shot"];
export const CAMERA_MOVES = ["Static", "Pan", "Tilt", "Dolly in", "Dolly out", "Tracking", "Handheld",
  "Gimbal", "Crane", "Drone", "FPV drone", "Orbit", "Zoom"];
export const CAMERA_ANGLES = ["Eye level", "Low angle", "High angle", "Dutch angle", "Overhead", "Worm's eye"];
export const FRAME_RATES = ["24fps", "25fps", "30fps", "50fps", "60fps", "120fps"];
export const RESOLUTIONS = ["HD 1080p", "4K", "6K", "8K"];
export const TEMPLATE_CATEGORIES = ["All", "Commercial", "Corporate", "Product", "Music Video", "Interview",
  "Documentary", "TikTok", "Instagram Reel", "YouTube", "Event", "Wedding", "Fashion"];

// Aliases expected by app/(tabs)/new.tsx wizard (added by testing agent to unblock wizard).
export const PRODUCTION_LEVELS = CREW_SIZES;
export const TONES = MOODS;
export const PACINGS = ["Slow", "Medium", "Fast", "Dynamic (varied)"];
