export type UserRole = 'admin' | 'employee';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

export interface Employee {
  id: string;
  name: string;
  slug: string;
  designation: string;
  phone: string;
  email: string;
  photo: string;
  about: string;
  status?: 'active' | 'inactive';
}

export interface Link {
  id: string;
  employee_id: string;
  type: string;
  url: string;
}

export interface Resource {
  id: string;
  employee_id: string;
  type: 'pdf' | 'video';
  file_url: string;
  title: string;
}

export interface Product {
  id: string;
  employee_id: string;
  name: string;
  description: string;
  image: string;
}

export interface Lead {
  id: string;
  employee_id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  timestamp: string;
}

export interface AnalyticsEvent {
  id: string;
  employee_id: string;
  event_type: 'view' | 'click' | 'share';
  timestamp: string;
  metadata?: Record<string, any>;
}
