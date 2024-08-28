menuConfig.$inject = ['menuService'];

export default function menuConfig(menuService) {
  menuService.addMenuItem('topbar', {
    title: 'Contact-Info',
    state: 'contactInfo.list',
    position: 1,
    roles: ['*']
  });
}
