menuConfig.$inject = ['menuService'];

export default function menuConfig(menuService) {
  menuService.addMenuItem('topbar', {
    title: 'Tools',
    state: 'tools.list',
    position: 1,
    roles: ['*']
  });
}
