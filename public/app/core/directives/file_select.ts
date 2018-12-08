import coreModule from '../core_module';

export function fileSelect() {
  return {
    link: ($scope, el) => {
      el.bind("change", (e) => {
        const file = (e.srcElement || e.target).files[0];
        $scope.getFile(file);
      });
    }
  };
}

coreModule.directive('fileSelect', fileSelect);
