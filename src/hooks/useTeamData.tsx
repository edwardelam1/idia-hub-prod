
import { useState } from 'react';

interface Team {
  id: string;
  name: string;
  description: string;
  lead: string;
  department: string;
  members: string[];
  createdDate: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'super-admin' | 'organization-admin' | 'team-lead' | 'team-member';
  team: string;
  status: 'active' | 'pending' | 'inactive';
  lastActive: string;
  joinDate: string;
}

interface Permission {
  name: string;
  superAdmin: boolean;
  orgAdmin: boolean;
  teamLead: boolean;
  teamMember: boolean;
}

export const useTeamData = () => {
  const [teams] = useState<Team[]>([
    {
      id: '1',
      name: 'Data Science',
      description: 'AI/ML research and data analytics team',
      lead: 'Dr. Sarah Chen',
      department: 'Research',
      members: ['1', '2', '3', '4', '5'],
      createdDate: '2023-01-15'
    },
    {
      id: '2',
      name: 'Engineering',
      description: 'Platform development and infrastructure',
      lead: 'Michael Rodriguez',
      department: 'Technology',
      members: ['6', '7', '8', '9'],
      createdDate: '2023-02-01'
    },
    {
      id: '3',
      name: 'Product',
      description: 'Product management and user experience',
      lead: 'Lisa Johnson',
      department: 'Product',
      members: ['10', '11', '12'],
      createdDate: '2023-02-15'
    },
    {
      id: '4',
      name: 'Security',
      description: 'Information security and compliance',
      lead: 'David Kim',
      department: 'Security',
      members: ['13', '14', '15'],
      createdDate: '2023-03-01'
    },
    {
      id: '5',
      name: 'Business Development',
      description: 'Partnerships and market expansion',
      lead: 'Emily Watson',
      department: 'Business',
      members: ['16', '17', '18'],
      createdDate: '2023-03-15'
    },
    {
      id: '6',
      name: 'Quality Assurance',
      description: 'Testing and quality control',
      lead: 'Alex Thompson',
      department: 'Technology',
      members: ['19', '20', '21'],
      createdDate: '2023-04-01'
    }
  ]);

  const [users] = useState<User[]>([
    // Data Science Team
    {
      id: '1',
      name: 'Dr. Sarah Chen',
      email: 'sarah.chen@idiaHub.com',
      role: 'team-lead',
      team: 'Data Science',
      status: 'active',
      lastActive: '2024-01-15 14:30',
      joinDate: '2023-01-15'
    },
    {
      id: '2',
      name: 'James Wilson',
      email: 'james.wilson@idiaHub.com',
      role: 'team-member',
      team: 'Data Science',
      status: 'active',
      lastActive: '2024-01-15 12:45',
      joinDate: '2023-02-01'
    },
    {
      id: '3',
      name: 'Maria Garcia',
      email: 'maria.garcia@idiaHub.com',
      role: 'team-member',
      team: 'Data Science',
      status: 'active',
      lastActive: '2024-01-15 16:20',
      joinDate: '2023-02-15'
    },
    {
      id: '4',
      name: 'Robert Taylor',
      email: 'robert.taylor@idiaHub.com',
      role: 'team-member',
      team: 'Data Science',
      status: 'pending',
      lastActive: '2024-01-10 09:15',
      joinDate: '2024-01-10'
    },
    {
      id: '5',
      name: 'Jennifer Lee',
      email: 'jennifer.lee@idiaHub.com',
      role: 'team-member',
      team: 'Data Science',
      status: 'active',
      lastActive: '2024-01-15 11:30',
      joinDate: '2023-03-01'
    },
    
    // Engineering Team
    {
      id: '6',
      name: 'Michael Rodriguez',
      email: 'michael.rodriguez@idiaHub.com',
      role: 'team-lead',
      team: 'Engineering',
      status: 'active',
      lastActive: '2024-01-15 15:45',
      joinDate: '2023-02-01'
    },
    {
      id: '7',
      name: 'Kevin Brown',
      email: 'kevin.brown@idiaHub.com',
      role: 'team-member',
      team: 'Engineering',
      status: 'active',
      lastActive: '2024-01-15 13:20',
      joinDate: '2023-02-15'
    },
    {
      id: '8',
      name: 'Amanda Davis',
      email: 'amanda.davis@idiaHub.com',
      role: 'team-member',
      team: 'Engineering',
      status: 'active',
      lastActive: '2024-01-15 14:10',
      joinDate: '2023-03-01'
    },
    {
      id: '9',
      name: 'Thomas Miller',
      email: 'thomas.miller@idiaHub.com',
      role: 'team-member',
      team: 'Engineering',
      status: 'inactive',
      lastActive: '2024-01-05 10:30',
      joinDate: '2023-04-01'
    },

    // Product Team
    {
      id: '10',
      name: 'Lisa Johnson',
      email: 'lisa.johnson@idiaHub.com',
      role: 'organization-admin',
      team: 'Product',
      status: 'active',
      lastActive: '2024-01-15 16:00',
      joinDate: '2023-02-15'
    },
    {
      id: '11',
      name: 'Daniel White',
      email: 'daniel.white@idiaHub.com',
      role: 'team-member',
      team: 'Product',
      status: 'active',
      lastActive: '2024-01-15 12:15',
      joinDate: '2023-03-15'
    },
    {
      id: '12',
      name: 'Rachel Green',
      email: 'rachel.green@idiaHub.com',
      role: 'team-member',
      team: 'Product',
      status: 'pending',
      lastActive: '2024-01-12 14:45',
      joinDate: '2024-01-12'
    },

    // Security Team
    {
      id: '13',
      name: 'David Kim',
      email: 'david.kim@idiaHub.com',
      role: 'team-lead',
      team: 'Security',
      status: 'active',
      lastActive: '2024-01-15 17:20',
      joinDate: '2023-03-01'
    },
    {
      id: '14',
      name: 'Helen Zhang',
      email: 'helen.zhang@idiaHub.com',
      role: 'team-member',
      team: 'Security',
      status: 'active',
      lastActive: '2024-01-15 15:30',
      joinDate: '2023-03-15'
    },
    {
      id: '15',
      name: 'Mark Anderson',
      email: 'mark.anderson@idiaHub.com',
      role: 'team-member',
      team: 'Security',
      status: 'active',
      lastActive: '2024-01-15 13:45',
      joinDate: '2023-04-01'
    },

    // Business Development Team
    {
      id: '16',
      name: 'Emily Watson',
      email: 'emily.watson@idiaHub.com',
      role: 'team-lead',
      team: 'Business Development',
      status: 'active',
      lastActive: '2024-01-15 16:30',
      joinDate: '2023-03-15'
    },
    {
      id: '17',
      name: 'Christopher Moore',
      email: 'christopher.moore@idiaHub.com',
      role: 'team-member',
      team: 'Business Development',
      status: 'active',
      lastActive: '2024-01-15 11:15',
      joinDate: '2023-04-01'
    },
    {
      id: '18',
      name: 'Stephanie Clark',
      email: 'stephanie.clark@idiaHub.com',
      role: 'team-member',
      team: 'Business Development',
      status: 'active',
      lastActive: '2024-01-15 14:50',
      joinDate: '2023-05-01'
    },

    // Quality Assurance Team
    {
      id: '19',
      name: 'Alex Thompson',
      email: 'alex.thompson@idiaHub.com',
      role: 'team-lead',
      team: 'Quality Assurance',
      status: 'active',
      lastActive: '2024-01-15 15:10',
      joinDate: '2023-04-01'
    },
    {
      id: '20',
      name: 'Nicole Martinez',
      email: 'nicole.martinez@idiaHub.com',
      role: 'team-member',
      team: 'Quality Assurance',
      status: 'active',
      lastActive: '2024-01-15 12:30',
      joinDate: '2023-05-01'
    },
    {
      id: '21',
      name: 'Ryan Hall',
      email: 'ryan.hall@idiaHub.com',
      role: 'team-member',
      team: 'Quality Assurance',
      status: 'pending',
      lastActive: '2024-01-13 16:45',
      joinDate: '2024-01-13'
    },

    // Super Admin
    {
      id: '99',
      name: 'System Administrator',
      email: 'admin@idiaHub.com',
      role: 'super-admin',
      team: 'Administration',
      status: 'active',
      lastActive: '2024-01-15 18:00',
      joinDate: '2023-01-01'
    }
  ]);

  const [permissions] = useState<Permission[]>([
    {
      name: 'View Dashboard',
      superAdmin: true,
      orgAdmin: true,
      teamLead: true,
      teamMember: true
    },
    {
      name: 'Access Data Marketplace',
      superAdmin: true,
      orgAdmin: true,
      teamLead: true,
      teamMember: true
    },
    {
      name: 'Generate Reports',
      superAdmin: true,
      orgAdmin: true,
      teamLead: true,
      teamMember: true
    },
    {
      name: 'Manage Teams',
      superAdmin: true,
      orgAdmin: true,
      teamLead: false,
      teamMember: false
    },
    {
      name: 'Invite Users',
      superAdmin: true,
      orgAdmin: true,
      teamLead: true,
      teamMember: false
    },
    {
      name: 'Billing Management',
      superAdmin: true,
      orgAdmin: true,
      teamLead: false,
      teamMember: false
    },
    {
      name: 'System Health Monitoring',
      superAdmin: true,
      orgAdmin: false,
      teamLead: false,
      teamMember: false
    },
    {
      name: 'AI Management',
      superAdmin: true,
      orgAdmin: false,
      teamLead: false,
      teamMember: false
    },
    {
      name: 'Security Settings',
      superAdmin: true,
      orgAdmin: true,
      teamLead: false,
      teamMember: false
    },
    {
      name: 'Compliance Management',
      superAdmin: true,
      orgAdmin: true,
      teamLead: false,
      teamMember: false
    },
    {
      name: 'API Access',
      superAdmin: true,
      orgAdmin: true,
      teamLead: true,
      teamMember: false
    },
    {
      name: 'Data Export',
      superAdmin: true,
      orgAdmin: true,
      teamLead: true,
      teamMember: true
    },
    {
      name: 'Trading Interface',
      superAdmin: true,
      orgAdmin: true,
      teamLead: true,
      teamMember: true
    },
    {
      name: 'Liquidity Pools',
      superAdmin: true,
      orgAdmin: true,
      teamLead: true,
      teamMember: true
    }
  ]);

  const teamStats = teams.map(team => ({
    name: team.name,
    members: team.members.length,
    leads: users.filter(u => u.team === team.name && u.role === 'team-lead').length
  }));

  const inviteUser = (email: string, role: string, teamId: string) => {
    console.log(`Inviting ${email} as ${role} to team ${teamId}`);
    // Simulate user invitation
  };

  const updateUserRole = (userId: string, newRole: string) => {
    console.log(`Updating user ${userId} role to ${newRole}`);
    // Simulate role update
  };

  const deactivateUser = (userId: string) => {
    console.log(`Deactivating user ${userId}`);
    // Simulate user deactivation
  };

  return {
    teams,
    users,
    permissions,
    teamStats,
    inviteUser,
    updateUserRole,
    deactivateUser
  };
};
