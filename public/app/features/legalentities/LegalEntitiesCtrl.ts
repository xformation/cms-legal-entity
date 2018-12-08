export class LegalEntitiesCtrl {
  navModel: any;
  activeTabIndex = 0;
  logoSrc = '';
  $scope;
  /** @ngInject */
  constructor($scope, navModelSrv) {
    this.navModel = navModelSrv.getNav('cfg', 'legalentities', 0);
    this.activeTabIndex = 0;
    this.$scope = $scope;
    $scope.getFile = this.getFile.bind(this);
  }

  activateTab(tabIndex) {
    this.activeTabIndex = tabIndex;
  }

  getFile(file) {
    if (!file) {
      return;
    }
    const fileReader = new FileReader();
    const that = this;
    fileReader.onloadend = (e) => {
      that.logoSrc = e.target["result"];
      this.$scope.$apply();
    };
    fileReader.readAsDataURL(file);
  }
}
