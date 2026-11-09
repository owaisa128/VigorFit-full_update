import React from 'react';

const paths = {
  Activity: 'M3 12h4l2-5 4 10 2-5h6',
  AlertCircle: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 8v4M12 16h.01',
  ArrowDownRight: 'M7 7l10 10M8 17h9V8',
  ArrowLeft: 'M19 12H5M12 19l-7-7 7-7',
  ArrowLeftRight: 'M17 8H4M7 5 4 8l3 3M7 16h13m-3-3 3 3-3 3',
  ArrowRight: 'M5 12h14m-7-7 7 7-7 7',
  ArrowUpRight: 'M7 17 17 7M8 7h9v9',
  Award: 'M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M9 13l-1 7 4-2 4 2-1-7',
  BadgeCheck: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM8 12.5l2.5 2.5 5.5-6',
  BadgeDollarSign: 'M4 6h16v13H4zM8 6V4h8v2M12 9v7m2-5c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2 .9 2 2-.9 2-2 2',
  BarChart3: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  Bell: 'M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4',
  BookOpen: 'M3.5 5.5c3-1.5 5.8-1 8.5 1v13c-2.7-2-5.5-2.5-8.5-1zM20.5 5.5c-3-1.5-5.8-1-8.5 1v13c2.7-2 5.5-2.5 8.5-1z',
  Bot: 'M12 3v3M9 3h6M5 8h14v11H5zM8.5 12h.01M15.5 12h.01M9 16h6',
  Brain: 'M12 5a4 4 0 0 0-7 2.5A4 4 0 0 0 5 15a4 4 0 0 0 7 2.5M12 5a4 4 0 0 1 7 2.5A4 4 0 0 1 19 15a4 4 0 0 1-7 2.5M12 5v14M8 9v2M16 9v2',
  Calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  CalendarClock: 'M4 6h12v14H4zM4 10h12M8 3v5M12 15v2l1.5 1',
  CalendarDays: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01',
  CalendarPlus: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M12 13v5M9.5 15.5h5',
  Check: 'M5 12.5l4.5 4.5L19 7.5',
  CheckCheck: 'm3.5 12.5 4 4L15 9M9 14l3 3 8-9',
  CheckCircle2: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM8 12.5l2.5 2.5 5.5-6',
  ChevronRight: 'm9 5 7 7-7 7',
  Circle: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
  ClipboardList: 'M8 4h8v3H8zM6 6H4v15h16V6h-2M8 12h8M8 16h8',
  Clock: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7v5l3 2',
  Clock3: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7v5h4',
  CreditCard: 'M3.5 6h17v12h-17zM3.5 10h17M7 15h4',
  Crown: 'm3 8 4 3 5-6 5 6 4-3-2 11H5zM6 22h12',
  Download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
  Droplets: 'M8 4S4 8.5 4 12a4 4 0 0 0 8 0C12 8.5 8 4 8 4zM17 9s-3 3.5-3 6a3 3 0 0 0 6 0c0-2.5-3-6-3-6z',
  Dumbbell: 'M3 8h3v8H3zM6 6h3v12H6zM9 11h6v2H9zM15 6h3v12h-3zM18 8h3v8h-3z',
  Edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z',
  Edit2: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z',
  ExternalLink: 'M14 4h6v6M20 4l-9 9M18 13v6H4V5h6',
  Eye: 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  EyeOff: 'm3 3 18 18M10.6 6.2A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-3.1 3.6M6.2 6.2C3.9 7.7 2.5 12 2.5 12s3.5 6 9.5 6c1 0 2-.2 2.9-.5M9.9 9.9a3 3 0 0 0 4.2 4.2',
  FileSpreadsheet: 'M5 3.5h9l5 5V21H5zM14 3.5V9h5M8 12h8M8 16h8M11 12v7M15 12v7',
  FileText: 'M5 3.5h9l5 5V21H5zM14 3.5V9h5M8 13h8M8 17h8',
  Filter: 'M4 5h16l-6.5 7.5V19l-3 1v-7.5z',
  Flag: 'M5 21V4m0 1c5-3 9 3 14 0v9c-5 3-9-3-14 0',
  Flame: 'M12 3c1 3.5 5 5 5 9.5a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.5 1 2 2 2 0-3-1-5 1-7.5z',
  HeartHandshake: 'M12 20s-8.5-5.2-8.5-11a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2c0 5.8-8.5 11-8.5 11zM7 12h3l2-2 2 2h3',
  HeartPulse: 'M12 20s-8.5-5.2-8.5-11a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2c0 5.8-8.5 11-8.5 11zM5 12h4l1.5-3 3 6 1.5-3h4',
  HelpCircle: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM9.5 9a2.6 2.6 0 1 1 4.5 1.8c-1.2 1.1-2 1.4-2 3M12 17h.01',
  Home: 'm3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7',
  ImagePlus: 'M4 5h11v14H4zM7 9h.01M5 16l3-3 2 2 2-2 3 3M18 8v6M15 11h6',
  Images: 'M7 4h13v13H7zM4 7v13h13M10 13l2-2 5 5',
  Inbox: 'M4 4h16v16H4zM4 13h5l1.5 2h3L15 13h5',
  Info: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 11v5M12 8h.01',
  Layers: 'm12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5',
  LayoutDashboard: 'M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z',
  LifeBuoy: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM6 6l4 4m4 4 4 4m0-12-4 4m-4 4-4 4M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0z',
  LineChart: 'M3 20V4M3 20h18M6 16l4-5 3 2 6-7M15 6h4v4',
  Loader2: 'M12 3.5a8.5 8.5 0 0 1 8.5 8.5',
  LocateFixed: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 10v4m-2-2h4',
  Lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  LockKeyhole: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 14v3',
  LogIn: 'M10 5H5v14h5M14 8l4 4-4 4M8 12h10',
  LogOut: 'M14 5h5v14h-5M10 8l-4 4 4 4M16 12H6',
  Mail: 'M3.5 5.5h17v13h-17zM4 7l8 6 8-6',
  MapPin: 'M12 21s6-5.5 6-11a6 6 0 0 0-12 0c0 5.5 6 11 6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  MapPinned: 'M12 21s6-5.5 6-11a6 6 0 0 0-12 0c0 5.5 6 11 6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4 5l-1 13 5 2M20 5l1 13-4 2',
  Menu: 'M4 6h16M4 12h16M4 18h16',
  MessageCircle: 'M20 11.5a8 8 0 0 1-8 8 9 9 0 0 1-4-.9L4 20l1.4-3.5A8 8 0 1 1 20 11.5z',
  MessageSquare: 'M4 5h16v11H9l-5 4z',
  MessageSquareText: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h6',
  Minus: 'M5 12h14',
  Maximize: 'M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3',
  MoreHorizontal: 'M5 12h.01M12 12h.01M19 12h.01',
  Moon: 'M19.5 15.5A8.5 8.5 0 0 1 8.5 4.5 8.5 8.5 0 1 0 19.5 15.5z',
  Music2: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM21 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z',
  Pause: 'M8 5v14M16 5v14',
  Pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z',
  PieChart: 'M11 3.5A8.5 8.5 0 1 0 20.5 13H11zM13 3.5V11h7.5A8.5 8.5 0 0 0 13 3.5z',
  Play: 'm8 5 11 7-11 7z',
  Plus: 'M12 5v14M5 12h14',
  RefreshCw: 'M20 7v5h-5M4 17v-5h5M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3',
  Route: 'M5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM19 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 6h5a3 3 0 0 1 0 6h-1a3 3 0 0 0 0 6h6',
  Save: 'M5 3.5h12l3.5 3.5V20H5zM8 3.5v6h8v-6M8 20v-7h8v7',
  Scale: 'M12 4v16M5 7h14M7 7l-4 7h8L7 7zM17 7l-4 7h8l-4-7zM8 20h8',
  Search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5 21 21',
  Send: 'm3 11 18-8-8 18-2-8zM11 13l10-10',
  Server: 'M4 4h16v6H4zM4 14h16v6H4zM7 7h.01M7 17h.01M11 7h6M11 17h6',
  Settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19 13.5a7.5 7.5 0 0 0 0-3l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L13.5 2h-4L9 5a8 8 0 0 0-2.6 1.5L4 5.5 2 9l2 1.5a7.5 7.5 0 0 0 0 3L2 15l2 3.5 2.4-1A8 8 0 0 0 9 19l.5 3h4l.5-3a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5z',
  Settings2: 'M4 7h9M17 7h3M4 17h3M11 17h9M13 4v6M9 14v6',
  ShieldCheck: 'M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6zM8.5 12l2.5 2.5 5-5',
  Smartphone: 'M7 3.5h10v17H7zM10 6h4M11 17h2',
  Sparkles: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z',
  Square: 'M5 5h14v14H5z',
  Sun: 'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0z',
  Tag: 'M4 4h8l8 8-8 8-8-8zM8 8h.01',
  Target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  Timer: 'M10 3h4M12 7v5l3 2M12 5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
  Trash2: 'M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6',
  TrendingUp: 'M3 17l6-6 4 4 8-9M15 6h6v6',
  Upload: 'M12 15V3m-5 5 5-5 5 5M4 17v4h16v-4',
  User: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  UserCheck: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21a8 8 0 0 1 13-6M16 19l2 2 4-5',
  UserPlus: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a8 8 0 0 1 16 0M19 8v6M16 11h6',
  UserRound: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  UserRoundCheck: 'M11 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21a8 8 0 0 1 13-6M16 19l2 2 4-5',
  UserRoundX: 'M11 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21a8 8 0 0 1 13-6M17 17l5 5m0-5-5 5',
  Users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6',
  Utensils: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-2.5 5-2.5 8H17v10',
  Video: 'M4 6h12v12H4zM16 10l4-3v10l-4-3',
  Volume2: 'M4 10v4h4l5 4V6l-5 4zM16 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12',
  VolumeX: 'M4 10v4h4l5 4V6l-5 4zM17 10l4 4m0-4-4 4',
  WalletCards: 'M4 6h16v14H4zM4 9h16M15 14h5M7 4h12M16 14h.01',
  Wind: 'M3 8h12a2.5 2.5 0 1 0-2.5-2.5M3 12h17a2.5 2.5 0 1 1-2.5 2.5M3 16h10a2.5 2.5 0 1 1-2.5 2.5',
  X: 'M6 6l12 12M18 6 6 18',
  XCircle: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM9 9l6 6m0-6-6 6',
  Zap: 'm13 2-9 12h7l-1 8 10-13h-7z',
  Apple: 'M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06ZM10 2c1 .5 2 2 2 5',
  Barcode: 'M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14M5 5v14M14 5v14M19 5v14',
  Biceps: 'M6.5 14.5a3.5 3.5 0 0 1-3.5-3.5c0-3.5 2.5-6.5 6-7 2.5-.3 5 1.2 5.5 3.5l1.5 3a4 4 0 0 1-2 5l-4 2a4 4 0 0 1-3.5-3zM14 7.5l4-1.5a3 3 0 0 1 4 2.8v4.2a3 3 0 0 1-2 2.8L16 17',
  CameraMilestone: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM12 17a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z',
  Compass: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12Z',
  FilePdf: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 17v-4h2a1.5 1.5 0 0 1 0 3H8M14 17v-4h1.5a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5H14',
  FlameKindle: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z',
  Footprints: 'M4 16v-2.38C4 11.5 2.97 9.4 3 7.37A4.2 4.2 0 0 1 7.2 3.1 4.3 4.3 0 0 1 11.5 7.4c0 2-.9 4-1 6.1v2.5M16 21v-2.38c0-2.12-1.03-4.22-.96-6.25a4.2 4.2 0 0 1 4.16-4.27 4.3 4.3 0 0 1 4.3 4.3c0 2-.9 4-1 6.1v2.5',
  Gauge: 'M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5M12 2a10 10 0 0 1 10 10c0 4.42-2.87 8.17-6.84 9.5M12 12l4-4M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  LiveStream: 'M2 8a4 4 0 0 1 4-4M18 4a4 4 0 0 1 4 4M4.93 10.93a2 2 0 0 1 2.83 0M16.24 10.93a2 2 0 0 1 2.83 0M12 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 16v6M8 22h8',
  Medal: 'M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15M11 12 5.12 2.2M13 12l5.88-9.8M12 22a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  Repeat: 'm17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3',
  Salad: 'M7 21h10M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9ZM11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47 2.63 2.4 2.4 0 0 1-.37 4.91',
  SparkleBadge: 'M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76ZM12 8v8M8 12h8',
  TrendingDown: 'm22 17-8.5-8.5-5 5L2 7M16 17h6v-6',
  WaterDrop: 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z',
};

function iconSize(className, size) {
  if (Number.isFinite(size)) return size;
  const dimension = className?.match(/(?:^|\s)h-(\d+(?:\.\d+)?)(?:\s|$)/)?.[1]
    || className?.match(/(?:^|\s)w-(\d+(?:\.\d+)?)(?:\s|$)/)?.[1];
  if (!dimension) return 24;
  const target = Number(dimension) * 4;
  return [16, 20, 24, 32].reduce((closest, candidate) => (
    Math.abs(candidate - target) < Math.abs(closest - target) ? candidate : closest
  ), 16);
}

function createIcon(name) {
  function CustomIcon({ className = '', size, ...props }) {
    const resolvedSize = iconSize(className, size);
    return (
      <svg
        {...props}
        className={`vf-icon ${className}`.trim()}
        width={resolvedSize}
        height={resolvedSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        aria-hidden={props['aria-label'] ? undefined : true}
      >
        <path d={paths[name]} />
      </svg>
    );
  }
  CustomIcon.displayName = name;
  return CustomIcon;
}

export const Activity = createIcon('Activity');
export const AlertCircle = createIcon('AlertCircle');
export const ArrowDownRight = createIcon('ArrowDownRight');
export const ArrowLeft = createIcon('ArrowLeft');
export const ArrowLeftRight = createIcon('ArrowLeftRight');
export const ArrowRight = createIcon('ArrowRight');
export const ArrowUpRight = createIcon('ArrowUpRight');
export const Award = createIcon('Award');
export const BadgeCheck = createIcon('BadgeCheck');
export const BadgeDollarSign = createIcon('BadgeDollarSign');
export const BarChart3 = createIcon('BarChart3');
export const Bell = createIcon('Bell');
export const BookOpen = createIcon('BookOpen');
export const Bot = createIcon('Bot');
export const Brain = createIcon('Brain');
export const Calendar = createIcon('Calendar');
export const CalendarClock = createIcon('CalendarClock');
export const CalendarDays = createIcon('CalendarDays');
export const CalendarPlus = createIcon('CalendarPlus');
export const Check = createIcon('Check');
export const CheckCheck = createIcon('CheckCheck');
export const CheckCircle2 = createIcon('CheckCircle2');
export const ChevronRight = createIcon('ChevronRight');
export const Circle = createIcon('Circle');
export const ClipboardList = createIcon('ClipboardList');
export const Clock = createIcon('Clock');
export const Clock3 = createIcon('Clock3');
export const CreditCard = createIcon('CreditCard');
export const Crown = createIcon('Crown');
export const Download = createIcon('Download');
export const Droplets = createIcon('Droplets');
export const Dumbbell = createIcon('Dumbbell');
export const Edit = createIcon('Edit');
export const Edit2 = createIcon('Edit2');
export const ExternalLink = createIcon('ExternalLink');
export const Eye = createIcon('Eye');
export const EyeOff = createIcon('EyeOff');
export const FileSpreadsheet = createIcon('FileSpreadsheet');
export const FileText = createIcon('FileText');
export const Filter = createIcon('Filter');
export const Flag = createIcon('Flag');
export const Flame = createIcon('Flame');
export const HeartHandshake = createIcon('HeartHandshake');
export const HeartPulse = createIcon('HeartPulse');
export const HelpCircle = createIcon('HelpCircle');
export const Home = createIcon('Home');
export const ImagePlus = createIcon('ImagePlus');
export const Images = createIcon('Images');
export const Inbox = createIcon('Inbox');
export const Info = createIcon('Info');
export const Layers = createIcon('Layers');
export const LayoutDashboard = createIcon('LayoutDashboard');
export const LifeBuoy = createIcon('LifeBuoy');
export const LineChart = createIcon('LineChart');
export const Loader2 = createIcon('Loader2');
export const LocateFixed = createIcon('LocateFixed');
export const Lock = createIcon('Lock');
export const LockKeyhole = createIcon('LockKeyhole');
export const LogIn = createIcon('LogIn');
export const LogOut = createIcon('LogOut');
export const Mail = createIcon('Mail');
export const MapPin = createIcon('MapPin');
export const MapPinned = createIcon('MapPinned');
export const Menu = createIcon('Menu');
export const MessageCircle = createIcon('MessageCircle');
export const MessageSquare = createIcon('MessageSquare');
export const MessageSquareText = createIcon('MessageSquareText');
export const Minus = createIcon('Minus');
export const Maximize = createIcon('Maximize');
export const MoreHorizontal = createIcon('MoreHorizontal');
export const Moon = createIcon('Moon');
export const Music2 = createIcon('Music2');
export const Pause = createIcon('Pause');
export const Pencil = createIcon('Pencil');
export const PieChart = createIcon('PieChart');
export const Play = createIcon('Play');
export const Plus = createIcon('Plus');
export const RefreshCw = createIcon('RefreshCw');
export const Route = createIcon('Route');
export const Save = createIcon('Save');
export const Scale = createIcon('Scale');
export const Search = createIcon('Search');
export const Send = createIcon('Send');
export const Server = createIcon('Server');
export const Settings = createIcon('Settings');
export const Settings2 = createIcon('Settings2');
export const ShieldCheck = createIcon('ShieldCheck');
export const Smartphone = createIcon('Smartphone');
export const Sparkles = createIcon('Sparkles');
export const Square = createIcon('Square');
export const Sun = createIcon('Sun');
export const Tag = createIcon('Tag');
export const Target = createIcon('Target');
export const Timer = createIcon('Timer');
export const Trash2 = createIcon('Trash2');
export const TrendingUp = createIcon('TrendingUp');
export const Upload = createIcon('Upload');
export const User = createIcon('User');
export const UserCheck = createIcon('UserCheck');
export const UserPlus = createIcon('UserPlus');
export const UserRound = createIcon('UserRound');
export const UserRoundCheck = createIcon('UserRoundCheck');
export const UserRoundX = createIcon('UserRoundX');
export const Users = createIcon('Users');
export const Utensils = createIcon('Utensils');
export const Video = createIcon('Video');
export const Volume2 = createIcon('Volume2');
export const VolumeX = createIcon('VolumeX');
export const WalletCards = createIcon('WalletCards');
export const Wind = createIcon('Wind');
export const X = createIcon('X');
export const XCircle = createIcon('XCircle');
export const Zap = createIcon('Zap');
export const Apple = createIcon('Apple');
export const Barcode = createIcon('Barcode');
export const Biceps = createIcon('Biceps');
export const CameraMilestone = createIcon('CameraMilestone');
export const Compass = createIcon('Compass');
export const FilePdf = createIcon('FilePdf');
export const FlameKindle = createIcon('FlameKindle');
export const Footprints = createIcon('Footprints');
export const Gauge = createIcon('Gauge');
export const LiveStream = createIcon('LiveStream');
export const Medal = createIcon('Medal');
export const Repeat = createIcon('Repeat');
export const Salad = createIcon('Salad');
export const SparkleBadge = createIcon('SparkleBadge');
export const TrendingDown = createIcon('TrendingDown');
export const WaterDrop = createIcon('WaterDrop');
