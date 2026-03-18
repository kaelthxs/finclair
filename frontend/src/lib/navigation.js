import { ROLES } from './roles';

const leaderNav = [
  { to: '/leader', label: 'Лидер' },
  { to: '/leader/add-auditor', label: 'Добавить аудитора' },
  { to: '/leader/assign', label: 'Назначить аудитора' },
  { to: '/leader/final', label: 'Финальное решение' },
  { to: '/tools/roles', label: 'Роли' },
  { to: '/workflow', label: 'Workflow' }
];

const auditorNav = [
  { to: '/auditor', label: 'Аудитор' },
  { to: '/auditor/analysis', label: 'Анализ файла' },
  { to: '/tools/roles', label: 'Роли' },
  { to: '/workflow', label: 'Workflow' }
];

const clientNav = [
  { to: '/client', label: 'Клиент' },
  { to: '/tools/roles', label: 'Роли' },
  { to: '/workflow', label: 'Workflow' }
];

const defaultNav = [
  { to: '/tools/roles', label: 'Роли' },
  { to: '/workflow', label: 'Workflow' }
];

export function getNavForRole(role) {
  switch ((role || '').toUpperCase()) {
    case ROLES.LEADER:
      return leaderNav;
    case ROLES.AUDITOR:
      return auditorNav;
    case ROLES.CLIENT:
      return clientNav;
    default:
      return defaultNav;
  }
}
