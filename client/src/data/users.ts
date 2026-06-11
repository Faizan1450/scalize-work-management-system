import { User } from '../types';

export const mockUsers: User[] = [
  // Owner + Lead + Employee
  {
    id: 'user-udit',
    name: 'Udit Sharma',
    userId: 'udit.sharma',
    roles: ['owner', 'lead', 'employee'],
    leadIds: [],
    // Standard: Mon–Sat 8h, Sun off
    workSchedule: { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 8 },
    avatarColor: '#1e3a5f',
  },
  // Lead + Employee
  {
    id: 'user-afroz',
    name: 'Afroz Khan',
    userId: 'afroz.khan',
    roles: ['lead', 'employee'],
    leadIds: ['user-udit'],
    workSchedule: { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 8 },
    avatarColor: '#7c3aed',
  },
  {
    id: 'user-mishti',
    name: 'Mishti Agarwal',
    userId: 'mishti.agarwal',
    roles: ['lead', 'employee'],
    leadIds: ['user-udit'],
    workSchedule: { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 8 },
    avatarColor: '#be185d',
  },
  {
    id: 'user-faizan',
    name: 'Faizan Alam',
    userId: 'faizan.alam',
    roles: ['lead', 'employee'],
    leadIds: ['user-udit'],
    workSchedule: { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 8 },
    avatarColor: '#0891b2',
  },
  // Employees only
  {
    id: 'user-saif',
    name: 'Saif Ali',
    userId: 'saif.ali',
    roles: ['employee'],
    leadIds: ['user-afroz', 'user-mishti'], // reports to BOTH
    // ASYMMETRIC — Mon–Fri 4h, Sat–Sun 6h (no off day — works every day, shorter hours)
    // Exercises: no "Off" chips in WeekStrip, faster occupancy amber/red on task-heavy days
    workSchedule: { '0': 6, '1': 4, '2': 4, '3': 4, '4': 4, '5': 4, '6': 6 },
    avatarColor: '#16a34a',
  },
  {
    id: 'user-kaif',
    name: 'Kaif Siddiqui',
    userId: 'kaif.siddiqui',
    roles: ['employee'],
    leadIds: ['user-afroz'],
    workSchedule: { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 8 },
    avatarColor: '#ea580c',
  },
  {
    id: 'user-priya',
    name: 'Priya Mehta',
    userId: 'priya.mehta',
    roles: ['employee'],
    leadIds: ['user-mishti'],
    // Original had 10:00–18:00 start; duration-only matters now, same 8h capacity
    workSchedule: { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 8 },
    avatarColor: '#db2777',
  },
  {
    id: 'user-rajan',
    name: 'Rajan Gupta',
    userId: 'rajan.gupta',
    roles: ['employee'],
    leadIds: ['user-faizan'],
    workSchedule: { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 8 },
    avatarColor: '#ca8a04',
  },
  {
    id: 'user-neha',
    name: 'Neha Patel',
    userId: 'neha.patel',
    roles: ['employee'],
    leadIds: ['user-faizan'],
    workSchedule: { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 8 },
    avatarColor: '#dc2626',
  },
  {
    id: 'user-arjun',
    name: 'Arjun Verma',
    userId: 'arjun.verma',
    roles: ['employee'],
    leadIds: ['user-afroz', 'user-faizan'],
    // Slight variation: half-day Saturday (4h) to exercise the Sat != off case
    workSchedule: { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 4 },
    avatarColor: '#0d9488',
  },
];
