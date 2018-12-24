import { CollegeSettingsCtrl } from './CollegeSettingsCtrl';
import coreModule from 'app/core/core_module';

export function collegeSettings() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/localapp/college-settings/partials/college_settings.html',
    controller: CollegeSettingsCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    transclude: true,
    scope: { dashboard: '=' },
  };
}

coreModule.directive('collegeSettings', collegeSettings);
