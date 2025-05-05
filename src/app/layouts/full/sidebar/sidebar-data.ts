import { NavItem } from './nav-item/nav-item';
import { UserRole } from '../../../services/admin.service';

/**
 * Sidebar navigation items based on backend role structure
 *
 * Backend roles:
 * - User (0): Standard access to personal features
 * - Admin (1): Manage users and content
 * - SuperAdmin (2): Full system access and configuration
 */
export const navItems: NavItem[] = [
  // Dashboard - Available to all validated users
  {
    displayName: 'Dashboard',
    iconName: 'dashboard',
    route: '/dashboard',
  },

  // Process Management Section - Available to all validated users
  {
    navCap: 'Process Management'
  },
  {
    displayName: 'Upload',
    iconName: 'upload',
    route: '/features/upload',
  },
  {
    displayName: 'Processes',
    iconName: 'list',
    route: '/features/processes',
  },
  {
    displayName: 'Deduplication',
    iconName: 'copy',
    route: '/features/deduplication',
  },
  {
    displayName: 'Conflicts',
    iconName: 'alert-triangle',
    route: '/features/conflicts',
  },
  {
    displayName: 'Exceptions',
    iconName: 'alert-circle',
    route: '/features/exceptions',
  },
  {
    displayName: 'Upload History',
    iconName: 'history',
    route: '/features/upload-history',
  },
  {
    displayName: 'Notifications',
    iconName: 'bell',
    route: '/ui-components/badge',
  },

  // Administration Section - Only for Admin and SuperAdmin
  {
    navCap: 'Administration',
    requiredRoles: [UserRole.Admin, UserRole.SuperAdmin]
  },
  {
    displayName: 'User Management',
    iconName: 'users',
    route: '/features/admin',
    requiredRoles: [UserRole.Admin, UserRole.SuperAdmin]
  },

  // System Configuration - Only for SuperAdmin
  {
    navCap: 'System Configuration',
    requiredRoles: [UserRole.SuperAdmin]
  },
  {
    displayName: 'Blacklist',
    iconName: 'ban',
    route: '/features/blacklist',
    requiredRoles: [UserRole.SuperAdmin]
  },

  // User Section - Available to all users
  {
    navCap: 'User',
    iconName: 'user-circle'
  },
  {
    displayName: 'Profile',
    iconName: 'user-circle',
    route: '/features/profile',
  },
];
