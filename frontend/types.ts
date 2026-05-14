export type UserRole = 'citizen' | 'officer' | 'admin';

export interface User {
  id: number;
  fullName: string;
  username?: string;
  phone?: string;
  role: UserRole;
  points?: number;
  badge?: string;
  municipalArea?: string;
  accessCode?: string;
}

export interface Issue {
  id: number;
  type: string;
  severity: string;
  description: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  after_image_url: string | null;
  status: 'pending' | 'in_progress' | 'resolved';
  reported_by: number | null;
  assigned_to: number | null;
  reporter_name?: string;
  officer_name?: string;
  upvotes: number;
  reported_at: string;
  resolved_at: string | null;
}

export interface Officer {
  id: number;
  fullName: string;
  phone: string;
  municipalArea: string;
  accessCode: string;
  isRegistered: boolean;
  issuesResolved: number;
  createdAt: string;
}
