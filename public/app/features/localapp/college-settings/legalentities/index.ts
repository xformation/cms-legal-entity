import coreModule from 'app/core/core_module';
import { LegalEntitiesCtrl } from './LegalEntitiesCtrl';

export function legalEntities() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/localapp/college-settings/legalentities/partials/legal_entities.html',
    controller: LegalEntitiesCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    transclude: true,
    scope: { dashboard: '=' },
  };
}

coreModule.directive('legalEntities', legalEntities);
